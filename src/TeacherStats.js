import React, { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import pLimit from "p-limit";

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

  // NEW: Tab state + Date Range state
  const [activeTab, setActiveTab] = useState("month"); // 'month' | 'daterange'
  const [customStartDate, setCustomStartDate] = useState(""); // Fixed: Added missing state
  const [customEndDate, setCustomEndDate] = useState(""); // Fixed: Added missing state

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

  const handleSaveToken = () => {
    if (!inputToken || inputToken.trim() === "") {
      setError("Please enter a valid token");
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

      const limit = pLimit(30);
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

      const dateRange = {
        from: new Date(customStartDate).toISOString(),
        to: new Date(customEndDate + "T23:59:59.999Z").toISOString(), // Fixed: Ensure end date includes full day
      };

      const shiftsData = await ApiService.getShifts(dateRange, productIds);
      const finishedClasses = shiftsData.data.filter(
        (classItem) => classItem.classStatus === "FINISHED"
      );

      setProcessedCount(finishedClasses.length);

      const limit = pLimit(30);
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
    } catch (err) {
      setError(err.message);
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
      } py-6 flex flex-col justify-center sm:py-12 transition-colors duration-500`}
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
                  </div>
                </div>

                {bearerToken && (
                  <button
                    onClick={fetchDataByDateRange}
                    disabled={loading}
                    className="w-full px-5 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold shadow hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {loading ? "Processing..." : "Calculate Statistics"}
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

            {/* Absent Students */}
            {stats &&
              stats.absentStudents &&
              stats.absentStudents.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-bold text-lg mb-4">
                    - Absent Students -
                  </h3>
                  <div className="max-h-80 overflow-y-auto space-y-4">
                    {stats.absentStudents
                      .sort(
                        (a, b) => new Date(b.fromDate) - new Date(a.fromDate)
                      )
                      .map((student, index) => (
                        <div
                          key={`${student.fromDate}-${index}`}
                          className={`p-4 border rounded-lg shadow ${
                            isDarkMode
                              ? "bg-gray-700 border-gray-600"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <p className="font-semibold mb-1">
                            Class: {student.className}
                          </p>
                          <p className="text-sm mb-2">
                            {new Date(student.fromDate).toLocaleDateString(
                              "vi-VN",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </p>
                          <p>Student: {student.studentName}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-sm">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-gray-500">
          <span>©</span>
          <span>2025 Châu Đỗ. All rights reserved.</span>
          <span>• Ver 3.0</span>
        </div>
      </footer>
    </div>
  );
};
export default TeacherStats;
