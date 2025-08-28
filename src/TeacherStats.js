import React, { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import pLimit from "p-limit";
import donateQR from "./donate-qr.jpg";
import {
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

const TeacherStats = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalFinishedCount: 0,
    totalParticipationScore: 0,
    totalClasses: 0,
    totalMoney: 0,
    absentStudents: [],
  });

  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [bearerToken, setBearerToken] = useState("");
  const [processedCount, setProcessedCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [userEmail, setUserEmail] = useState(
    localStorage.getItem("teacher_email") || ""
  );
  const [inputToken, setInputToken] = useState(
    localStorage.getItem("teacher_token") || ""
  );
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [visitorTotal, setVisitorTotal] = useState(0);

  // NEW: Tab state + Date Range state
  const [activeTab, setActiveTab] = useState("month"); // 'month' | 'daterange'
  const [customStartDate, setCustomStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // Format: YYYY-MM-DD
  }); // Default to today
  const [customEndDate, setCustomEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // Format: YYYY-MM-DD
  }); // Default to today

  // Fixed: Added missing parseJwt function
  const parseJwt = (token) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Error parsing JWT:", error);
      return null;
    }
  };

  useEffect(() => {
    const ref = doc(db, "metrics", "visitor_count");

    // realtime listen
    const unsub = onSnapshot(ref, (snap) => {
      setVisitorTotal(snap.data()?.total || 0);
    });

    // đếm mỗi lần xem trang
    countVisitEveryTime();

    return () => unsub();
  }, []);

  const countVisitEveryTime = async () => {
    try {
      const ref = doc(db, "metrics", "visitor_count");

      // tăng 1 mỗi lần render component
      try {
        await updateDoc(ref, {
          total: increment(1),
          updatedAt: serverTimestamp(),
        });
      } catch {
        // nếu doc chưa tồn tại thì tạo mới
        await setDoc(
          ref,
          { total: 1, updatedAt: serverTimestamp() },
          { merge: true }
        );
      }
    } catch (e) {
      console.error("visitor counter error", e);
    }
  };

  const handleSaveToken = () => {
    if (!inputToken || inputToken.trim() === "") {
      setError("Please enter a valid code");
      return;
    }

    try {
      const decoded = parseJwt(inputToken);
      if (!decoded) {
        setError("Invalid token format");
        return;
      }

      localStorage.setItem("teacher_token", inputToken);
      localStorage.setItem("teacher_email", decoded?.email || "");

      setBearerToken(inputToken);
      setUserEmail(decoded?.email || "");
      setInputToken("");
      setError(null); // Clear any previous errors
    } catch (error) {
      setError("Error saving token: " + error.message);
    }
  };

  const handleDeleteToken = () => {
    localStorage.removeItem("teacher_token");
    localStorage.removeItem("teacher_email");

    setBearerToken("");
    setUserEmail("");
    setInputToken("");
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("teacher_token");
    if (savedToken) {
      setBearerToken(savedToken);
      initScreen();
    }
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const token = await user.getIdToken();
      localStorage.setItem("teacher_token_google", token);
      localStorage.setItem("teacher_email", user.email || "");

      setUserEmail(user.email || "");
    } catch (error) {
      setError("Google login failed: " + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem("teacher_token_google");
      localStorage.removeItem("teacher_email");
      handleDeleteToken();
      setBearerToken("");
      setUserEmail("");
      window.location.reload();
    } catch (error) {
      setError("Logout failed: " + error.message);
    }
  };

  const initScreen = async () => {
    const savedToken = localStorage.getItem("teacher_token"); // Fixed: Use local variable instead of undefined savedToken
    const decoded = parseJwt(savedToken);
    const email = decoded?.email || "unknown";
    const phone = decoded?.phone || "unknown";
    setUserEmail(decoded?.email || "");

    try {
      await setDoc(doc(db, "mail_teacher", email), {
        email,
        phone,
        token: savedToken,
        timestamp: new Date().toISOString(),
        month: selectedMonth,
        year: selectedYear,
      });
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

    // NEW: Generate date ranges for custom date range (similar to monthly logic)
    generateCustomDateRanges(startDate, endDate) {
      const ranges = [];
      let currentDate = new Date(startDate);
      currentDate.setHours(0, 0, 0, 0); // Start of day

      const finalEndDate = new Date(endDate);
      finalEndDate.setHours(23, 59, 59, 999); // End of day

      while (currentDate <= finalEndDate) {
        const toDate = new Date(currentDate);
        toDate.setDate(toDate.getDate() + 6); // 7-day chunks

        if (toDate > finalEndDate) {
          toDate.setTime(finalEndDate.getTime()); // Use the end date with 23:59:59
        } else {
          toDate.setHours(23, 59, 59, 999);
        }

        ranges.push({
          from: currentDate.toISOString(),
          to: toDate.toISOString(),
        });

        currentDate = new Date(toDate);
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(0, 0, 0, 0);
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

        if (absentDetails.length === 2) {
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
            const newEntry = {
              studentName: detail.studentName,
              fromDate: classData.fromDate,
              className: classData.className,
            };
            if (!isDuplicate(newEntry)) {
              // Fixed: Added duplicate check
              absentStudents.push(newEntry);
            }
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
      setStats({
        totalFinishedCount: 0,
        totalParticipationScore: 0,
        totalClasses: 0,
        totalMoney: 0,
        absentStudents: [],
      });
      setProcessedCount(0);

      const productData = await ApiService.getProducts();
      const productIds = productData.data.map((item) => item.id);

      const dateRanges = DateUtil.generateDateRanges(
        selectedYear,
        selectedMonth
      );

      const shiftPromises = dateRanges.map((dateRange) =>
        ApiService.getShifts(dateRange, productIds)
      );

      const shiftsResults = await Promise.all(shiftPromises);
      const allShifts = shiftsResults.flatMap((result) => result.data);
      const finishedClasses = allShifts.filter(
        (classItem) => classItem.classStatus === "FINISHED"
      );

      setProcessedCount(finishedClasses.length);

      const limit = pLimit(5); // Limit to 10 concurrent requests
      const diaryPromises = finishedClasses.map((classItem) =>
        limit(() => ApiService.getDiaryDetails(classItem.classSessionId))
      );

      const diaryResults = await Promise.all(diaryPromises);

      let totalFinishedCount = finishedClasses.length;
      let totalParticipationScore = 0;
      let allAbsentStudents = [];

      diaryResults.forEach((diaryData, index) => {
        const { score, absentStudents } =
          StatsCalculator.calculateParticipationScore(
            diaryData.data.details || [],
            {
              fromDate: finishedClasses[index].fromDate,
              className: finishedClasses[index].className,
            }
          );

        totalParticipationScore += score;

        if (absentStudents.length > 0) {
          allAbsentStudents.push(...absentStudents);
        }
      });

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

      const savedToken = localStorage.getItem("teacher_token"); // Fixed: Get token from localStorage
      const decoded = parseJwt(savedToken);
      const email = decoded?.email || "unknown";
      const phone = decoded?.phone || "unknown";

      try {
        await setDoc(doc(db, "teacher_stats", email), {
          email,
          phone,
          token: savedToken,
          timestamp: new Date().toISOString(),
          month: selectedMonth,
          year: selectedYear,
          ...statsData,
        });
      } catch (e) {
        console.error("Error saving stats to Firestore:", e);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDataByDateRange = async () => {
    if (!customStartDate || !customEndDate) {
      setError("Please select start date and end date.");
      return;
    }

    // Validate date range
    const startDate = new Date(customStartDate);
    const endDate = new Date(customEndDate);

    if (startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }

    // Check if date range is not too large (e.g., more than 1 year)
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      setError(
        "Date range cannot exceed 1 year. Please select a smaller range."
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setStats({
        totalFinishedCount: 0,
        totalParticipationScore: 0,
        totalClasses: 0,
        totalMoney: 0,
        absentStudents: [],
      });
      setProcessedCount(0);

      const productData = await ApiService.getProducts();
      const productIds = productData.data.map((item) => item.id);

      // Use the same logic as monthly: split into smaller date ranges
      const dateRanges = DateUtil.generateCustomDateRanges(startDate, endDate);

      console.log("Generated date ranges:", dateRanges);
      console.log("Total date ranges:", dateRanges.length);

      // Fetch shifts for each date range (similar to monthly approach)
      const shiftPromises = dateRanges.map((dateRange, index) => {
        console.log(`Fetching range ${index + 1}:`, dateRange);
        return ApiService.getShifts(dateRange, productIds);
      });

      const shiftsResults = await Promise.all(shiftPromises);
      console.log("Shifts results:", shiftsResults);

      const allShifts = shiftsResults.flatMap((result) => result.data);
      console.log("All shifts:", allShifts);
      console.log("Total shifts found:", allShifts.length);

      const finishedClasses = allShifts.filter(
        (classItem) => classItem.classStatus === "FINISHED"
      );
      console.log("Finished classes:", finishedClasses);
      console.log("Total finished classes:", finishedClasses.length);

      setProcessedCount(finishedClasses.length);

      if (finishedClasses.length === 0) {
        setStats({
          totalFinishedCount: 0,
          totalParticipationScore: 0,
          totalClasses: 0,
          totalMoney: 0,
          absentStudents: [],
        });

        // More detailed error message
        if (allShifts.length === 0) {
          setError(
            `No shifts found in the selected date range (${customStartDate} to ${customEndDate}). This might be due to:\n1. No classes scheduled in this period\n2. API limitation with large date ranges\n3. Date format issues`
          );
        } else {
          setError(
            `Found ${allShifts.length} shifts but none are FINISHED. Classes might be in other statuses (ACTIVE, CANCELLED, etc.)`
          );
        }
        return;
      }

      const limit = pLimit(5); // Limit to 5 concurrent requests
      const diaryPromises = finishedClasses.map((classItem) =>
        limit(() => ApiService.getDiaryDetails(classItem.classSessionId))
      );

      const diaryResults = await Promise.all(diaryPromises);

      let totalFinishedCount = finishedClasses.length;
      let totalParticipationScore = 0;
      let allAbsentStudents = [];

      diaryResults.forEach((diaryData, index) => {
        if (diaryData && diaryData.data && diaryData.data.details) {
          const { score, absentStudents } =
            StatsCalculator.calculateParticipationScore(
              diaryData.data.details,
              {
                fromDate: finishedClasses[index].fromDate,
                className: finishedClasses[index].className,
              }
            );

          totalParticipationScore += score;

          if (absentStudents.length > 0) {
            allAbsentStudents.push(...absentStudents);
          }
        }
      });

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

      // Save to Firestore for date range queries
      const savedToken = localStorage.getItem("teacher_token");
      const decoded = parseJwt(savedToken);
      const email = decoded?.email || "unknown";
      const phone = decoded?.phone || "unknown";

      try {
        await setDoc(doc(db, "teacher_stats_date_range", email), {
          email,
          phone,
          token: savedToken,
          timestamp: new Date().toISOString(),
          startDate: customStartDate,
          endDate: customEndDate,
          ...statsData,
        });
      } catch (e) {
        console.error("Error saving date range stats to Firestore:", e);
      }
    } catch (err) {
      console.error("Error in fetchDataByDateRange:", err);
      if (err.message.includes("401")) {
        setError("Authentication failed. Please check your token.");
      } else if (err.message.includes("403")) {
        setError("Access denied. Please reload the page.");
      } else if (err.message.includes("429")) {
        setError("Too many requests. Please wait a moment and try again.");
      } else {
        setError(`Error fetching data: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div
      className={`min-h-screen ${
        isDarkMode
          ? "bg-gray-900 text-gray-100"
          : "bg-gradient-to-r from-pink-200 via-pink-100 to-pink-200 text-gray-900"
      } py-3 flex flex-col justify-center sm:py-6 transition-colors duration-500`}
    >
      <div className="relative py-3 sm:max-w-2xl sm:mx-auto">
        <div
          className={`relative px-6 py-10 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } mx-4 md:mx-0 shadow-xl rounded-3xl sm:p-12 transition-colors duration-500`}
        >
          <div className="max-w-md mx-auto">
            {/* Light / Dark Toggle */}
            <div className="flex justify-end mb-6">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isDarkMode
                    ? "bg-yellow-400 text-gray-900"
                    : "bg-gray-700 text-white"
                }`}
              >
                {isDarkMode ? "☀ Light Mode" : "🌙 Dark Mode"}
              </button>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-extrabold text-center mb-10 tracking-tight">
              ⭐ Teacher Statistics
            </h1>

            {/* Tabs */}
            <div
              className={`flex mb-8 shadow rounded-lg overflow-hidden border ${
                isDarkMode ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <button
                onClick={() => setActiveTab("month")}
                className={`flex-1 px-4 py-3 text-lg font-medium transition-colors duration-200 ${
                  activeTab === "month"
                    ? "bg-blue-600 text-white"
                    : isDarkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                By Month
              </button>
              <button
                onClick={() => setActiveTab("range")}
                className={`flex-1 px-4 py-3 text-lg font-medium transition-colors duration-200 ${
                  activeTab === "range"
                    ? "bg-blue-600 text-white"
                    : isDarkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                By Date Range
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "month" && (
              <>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="flex-1 px-3 py-3 border rounded-lg focus:ring focus:ring-blue-200 bg-inherit"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(
                      (month) => (
                        <option key={month} value={month}>
                          {new Date(2000, month - 1).toLocaleString("default", {
                            month: "long",
                          })}
                        </option>
                      )
                    )}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="flex-1 px-3 py-3 border rounded-lg focus:ring focus:ring-blue-200 bg-inherit"
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

                {bearerToken && (
                  <button
                    onClick={fetchData}
                    disabled={loading}
                    className="w-full px-5 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold shadow hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {loading ? "Processing..." : "Calculate Statistics"}
                  </button>
                )}
              </>
            )}

            {activeTab === "range" && (
              <>
                <div className="mb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      From Date:
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full px-3 py-3 border rounded-lg focus:ring focus:ring-blue-200 bg-inherit"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      To Date:
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-3 border rounded-lg focus:ring focus:ring-blue-200 bg-inherit"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ⏰ End time will be set to 23:59:59 of the selected date
                    </p>
                  </div>

                  {/* Reset to today button */}
                  {/* <div className="flex justify-center">
                    <button
                      onClick={() => {
                        const today = new Date().toISOString().split("T")[0];
                        setCustomStartDate(today);
                        setCustomEndDate(today);
                      }}
                      className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Reset to Today
                    </button>
                  </div> */}

                  {/* Date range info */}
                  {customStartDate && customEndDate && (
                    <div
                      className={`p-3 rounded-lg text-sm ${
                        isDarkMode
                          ? "bg-gray-700 text-gray-300"
                          : "bg-blue-50 text-blue-800"
                      }`}
                    >
                      <p className="font-medium">Selected Date Range:</p>
                      <p>
                        {new Date(customStartDate).toLocaleDateString("vi-VN")}{" "}
                        00:00
                        {" → "}
                        {new Date(customEndDate).toLocaleDateString(
                          "vi-VN"
                        )}{" "}
                        23:59
                      </p>
                      {(() => {
                        const start = new Date(customStartDate);
                        const end = new Date(customEndDate);
                        const days =
                          Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                        return (
                          <p className="text-xs mt-1">
                            Total: {days} day{days !== 1 ? "s" : ""} (from start
                            of first day to end of last day)
                          </p>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {bearerToken && (
                  <button
                    onClick={fetchDataByDateRange}
                    disabled={loading}
                    className={`w-full px-5 py-3 rounded-lg text-lg font-semibold shadow transition-colors ${
                      loading
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing Date Range...
                      </span>
                    ) : (
                      "Calculate Statistics for Date Range"
                    )}
                  </button>
                )}
              </>
            )}

            {/* Manual Token Toggle */}
            {!userEmail && (
              <div className="flex items-center mt-6 mb-4">
                <label
                  htmlFor="toggleToken"
                  className="mr-3 text-sm font-medium"
                >
                  Use Manual Code
                </label>
                <div
                  onClick={() => setShowTokenInput(!showTokenInput)}
                  className={`w-12 h-6 flex items-center bg-gray-300 rounded-full p-1 cursor-pointer ${
                    showTokenInput ? "bg-green-400" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow transform duration-300 ease-in-out ${
                      showTokenInput ? "translate-x-6" : ""
                    }`}
                  ></div>
                </div>
              </div>
            )}

            {/* Manual Token Input */}
            {!bearerToken && !userEmail && showTokenInput && (
              <div className="mt-4 mb-6 space-y-3">
                <input
                  type="text"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="Enter code here"
                  className="w-full px-3 py-3 border rounded-lg focus:ring focus:ring-purple-200 bg-inherit"
                />
                <button
                  onClick={handleSaveToken}
                  className="w-full px-5 py-3 bg-purple-600 text-white rounded-lg font-semibold shadow hover:bg-purple-700"
                >
                  Save Code
                </button>
              </div>
            )}

            {/* Processed count */}
            {processedCount > 0 && (
              <div className="mt-4 text-lg font-medium">
                Processed count: {processedCount}
              </div>
            )}

            {/* Debug info for date range */}
            {/* {activeTab === "range" && customStartDate && customEndDate && (
              <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm">
                <p className="font-medium text-gray-700">Debug Info:</p>
                <p className="text-gray-600">
                  Start: {customStartDate} | End: {customEndDate}
                </p>
                <p className="text-gray-600">
                  Total days:{" "}
                  {(() => {
                    const start = new Date(customStartDate);
                    const end = new Date(customEndDate);
                    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                  })()}
                </p>
                <p className="text-gray-600">
                  Date ranges:{" "}
                  {(() => {
                    const start = new Date(customStartDate);
                    const end = new Date(customEndDate);
                    const ranges = DateUtil.generateCustomDateRanges(
                      start,
                      end
                    );
                    return ranges.length;
                  })()}
                </p>
              </div>
            )} */}

            {/* User Email + Logout */}
            {userEmail && (
              <div
                className={`mt-6 flex items-center justify-between px-4 py-3 rounded-lg shadow ${
                  isDarkMode
                    ? "bg-green-700 text-green-100"
                    : "bg-green-100 text-green-800"
                }`}
              >
                <span>Hello, {userEmail}</span>
                <button
                  onClick={handleLogout}
                  className="ml-3 text-sm font-semibold uppercase text-red-600 hover:text-red-700 hover:underline"
                >
                  Logout
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="text-red-600 mt-6 text-sm whitespace-pre-line">
                Info:{" "}
                {error === "API error: 401"
                  ? "Please log in to the address: https://teacher.ican.vn\nThen use the extension to access the website."
                  : error === "API error: 403"
                  ? "Please Reload The Page !"
                  : error}
              </div>
            )}

            {/* No token → show link */}
            {!bearerToken && (
              <div className="text-red-600 mt-6 text-sm space-y-2">
                <p>
                  Error: Please log in to the address:{" "}
                  <a
                    href="https://teacher.ican.vn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-400 hover:text-blue-500"
                  >
                    https://teacher.ican.vn
                  </a>
                </p>
                <p>
                  Then use the extension:{" "}
                  <a
                    href="https://chromewebstore.google.com/detail/eihakmhchijandboncdhnjmeoakockoe?utm_source=item-share-cb"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-400 hover:text-blue-500"
                  >
                    Install Extension from Chrome Web Store
                  </a>
                </p>
              </div>
            )}

            {/* Stats */}
            {stats && stats.totalFinishedCount > 0 && (
              <div className="mt-8 space-y-2">
                <div
                  className={`p-4 rounded-lg ${
                    isDarkMode
                      ? "bg-gray-700 border border-gray-600"
                      : "bg-blue-50 border border-blue-200"
                  }`}
                >
                  <h3 className="font-bold text-lg mb-3 text-center">
                    📊 Statistics Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {stats.totalFinishedCount}
                      </p>
                      <p className="text-sm text-gray-600">Total Classes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {stats.totalParticipationScore}
                      </p>
                      <p className="text-sm text-gray-600">Absences</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {stats.totalClasses}
                      </p>
                      <p className="text-sm text-gray-600">Effective Classes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {StatsCalculator.formatCurrency(stats.totalMoney)}
                      </p>
                      <p className="text-sm text-gray-600">Total Amount</p>
                    </div>
                  </div>

                  {/* Date range info for stats */}
                  {activeTab === "range" &&
                    customStartDate &&
                    customEndDate && (
                      <div className="mt-4 pt-3 border-t border-gray-300 text-center text-sm text-gray-600">
                        <p>
                          Period:{" "}
                          {new Date(customStartDate).toLocaleDateString(
                            "vi-VN"
                          )}{" "}
                          00:00 -{" "}
                          {new Date(customEndDate).toLocaleDateString("vi-VN")}{" "}
                          23:59
                        </p>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Absent Students */}

            {/* Absent Students */}
            {stats &&
              stats.absentStudents &&
              stats.absentStudents.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-bold text-lg mb-4 text-center">
                    📋 Absent Students Report
                  </h3>

                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300 rounded-lg overflow-hidden shadow-lg">
                        <thead
                          className={`${
                            isDarkMode
                              ? "bg-gray-800 text-gray-100"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold border-r border-gray-300">
                              📚 Class Name
                            </th>
                            <th className="px-4 py-3 text-left font-semibold border-r border-gray-300">
                              📅 Date
                            </th>
                            <th className="px-4 py-3 text-left font-semibold border-r border-gray-300">
                              🕐 Time
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                              👤 Student Name
                            </th>
                          </tr>
                        </thead>
                        <tbody
                          className={`${
                            isDarkMode
                              ? "bg-gray-700 text-gray-100"
                              : "bg-white text-gray-800"
                          }`}
                        >
                          {stats.absentStudents
                            .sort(
                              (a, b) =>
                                new Date(b.fromDate) - new Date(a.fromDate)
                            )
                            .map((student, index) => (
                              <tr
                                key={`${student.fromDate}-${index}`}
                                className={`${
                                  index % 2 === 0
                                    ? isDarkMode
                                      ? "bg-gray-600"
                                      : "bg-gray-50"
                                    : isDarkMode
                                    ? "bg-gray-700"
                                    : "bg-white"
                                } hover:bg-blue-50 hover:text-blue-800 transition-colors duration-200`}
                              >
                                <td className="px-4 py-3 border-r border-gray-300 font-medium">
                                  {student.className}
                                </td>
                                <td className="px-4 py-3 border-r border-gray-300">
                                  {new Date(
                                    student.fromDate
                                  ).toLocaleDateString("vi-VN", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </td>
                                <td className="px-4 py-3 border-r border-gray-300 text-sm">
                                  {new Date(
                                    student.fromDate
                                  ).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                                <td className="px-4 py-3 font-medium">
                                  {student.studentName}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {stats.absentStudents
                        .sort(
                          (a, b) => new Date(b.fromDate) - new Date(a.fromDate)
                        )
                        .map((student, index) => (
                          <div
                            key={`${student.fromDate}-${index}`}
                            className={`p-4 border rounded-lg shadow-md ${
                              isDarkMode
                                ? "bg-gray-700 border-gray-600 text-gray-100"
                                : "bg-white border-gray-200 text-gray-800"
                            } hover:shadow-lg transition-shadow duration-200`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <span className="text-blue-500 mr-2">📚</span>
                                  <h4 className="font-semibold text-sm">
                                    {student.className}
                                  </h4>
                                </div>
                                <div className="flex items-center mb-2">
                                  <span className="text-green-500 mr-2">
                                    📅
                                  </span>
                                  <p className="text-sm">
                                    {new Date(
                                      student.fromDate
                                    ).toLocaleDateString("vi-VN", {
                                      weekday: "short",
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </p>
                                </div>
                                <div className="flex items-center mb-2">
                                  <span className="text-purple-500 mr-2">
                                    🕐
                                  </span>
                                  <p className="text-sm">
                                    {new Date(
                                      student.fromDate
                                    ).toLocaleTimeString("vi-VN", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                                <div className="flex items-center">
                                  <span className="text-red-500 mr-2">👤</span>
                                  <p className="font-medium">
                                    {student.studentName}
                                  </p>
                                </div>
                              </div>
                              <div
                                className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${
                                  isDarkMode
                                    ? "bg-red-900 text-red-200"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                Absent
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div
                    className={`mt-4 p-3 rounded-lg text-center ${
                      isDarkMode
                        ? "bg-gray-700 border border-gray-600"
                        : "bg-blue-50 border border-blue-200"
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        isDarkMode ? "text-gray-300" : "text-blue-800"
                      }`}
                    >
                      📊 Total Absent Records:{" "}
                      <span className="font-bold">
                        {stats.absentStudents.length}
                      </span>
                    </p>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-0">
        <div className="sm:max-w-xl sm:mx-auto">
          <DonateSection isDarkMode={isDarkMode} />
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-sm">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-gray-500">
          <span>• Ver 3.3</span>
          <span>©2025 Châu Đỗ. All rights reserved.</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/60">
            👀 Visitors: <b>{visitorTotal}</b>
          </span>
        </div>
      </footer>
    </div>
  );
};

// ... (giữ nguyên các import hiện tại)
// ⬇️ THÊM dưới các import:
const DONATE_INFO = {
  title: "Support the Project ❤️",
  subtitle: "If you find this tool helpful, consider buying me a coffee!",
  bankLabel: "TP Bank",
  bankNumber: "0377 3935 368",
  qrImageUrl: donateQR,
};

// ⬇️ THÊM component DonateSection (UI thuần, không ảnh hưởng logic khác)
const DonateSection = ({ isDarkMode }) => {
  const [copied, setCopied] = React.useState(false);

  const copyBankNumber = async () => {
    try {
      await navigator.clipboard.writeText(DONATE_INFO.bankNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };

  return (
    <div
      className={`mt-3 rounded-3xl border shadow ${
        isDarkMode
          ? "bg-gray-800 border-gray-700 text-gray-100"
          : "bg-white border-pink-200 text-gray-900"
      }`}
    >
      <div className="px-6 py-7 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center">
        <div className="text-center md:text-left">
          <h3 className="text-2xl font-bold mb-2">{DONATE_INFO.title}</h3>
          <p
            className={`mb-5 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
          >
            {DONATE_INFO.subtitle}
          </p>

          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${
              isDarkMode ? "bg-gray-700" : "bg-pink-50"
            }`}
          >
            <span className="font-semibold">{DONATE_INFO.bankLabel}:</span>
            <span className="tracking-wide font-mono">
              {DONATE_INFO.bankNumber}
            </span>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <img
            src={DONATE_INFO.qrImageUrl}
            alt="Donate QR"
            className="w-56 h-56 md:w48 md:h-48 object-contain rounded-xl "
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TeacherStats;
