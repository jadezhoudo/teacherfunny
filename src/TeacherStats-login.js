import React, { useState, useEffect } from "react";

const LOGIN_URL = "https://id.ican.vn/login";
const WINDOW_FEATURES = "width=500,height=600,left=300,top=100";
// Define allowed origins for different environments
const ALLOWED_ORIGINS = [
  "https://id.ican.vn",
  "https://api-teacher-ican.vercel.app",
  "http://localhost:3000",
  "https://ican-xi.vercel.app",
];

const TeacherStats = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [bearerToken, setBearerToken] = useState("");
  const [processedCount, setProcessedCount] = useState(0);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [username, setUsername] = useState("");

  // Fetch token from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("teacher_token");
    const savedUsername = localStorage.getItem("teacher_username");
    if (savedToken) {
      setBearerToken(savedToken);
      setUsername(savedUsername || "");
    } else {
      console.log("Token not found in localStorage.");
    }
  }, []);

  // Enhanced message handling with updated origins
  useEffect(() => {
    const handleMessage = (event) => {
      try {
        // Log the received message origin for debugging
        console.log("Received message from:", event.origin);

        // Check if the origin is in our allowed list
        if (!ALLOWED_ORIGINS.includes(event.origin)) {
          console.warn(
            `Rejected message from unauthorized origin: ${event.origin}`
          );
          return;
        }

        // Log the message data for debugging
        console.log("Received message data:", event.data);

        if (event.data.token) {
          setBearerToken(event.data.token);
          setUsername(event.data.username || "Teacher");
          localStorage.setItem("teacher_token", event.data.token);
          localStorage.setItem(
            "teacher_username",
            event.data.username || "Teacher"
          );
          setShowLoginDialog(false);
          setError(null);

          // Log successful authentication
          console.log("Authentication successful");
        }
      } catch (err) {
        console.error("Authentication error:", err);
        setError(`Authentication error: ${err.message}`);
        setShowLoginDialog(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Enhanced error handling for login window
  const handleLogin = () => {
    try {
      console.log("Opening login window...");
      const popup = window.open(LOGIN_URL, "Login", WINDOW_FEATURES);

      if (popup === null || typeof popup === "undefined") {
        setError("Please allow popups for this site to login");
        return;
      }

      setShowLoginDialog(true);

      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          setShowLoginDialog(false);
          if (!bearerToken) {
            setError("Login window was closed. Please try again.");
          }
        }
      }, 500);
    } catch (err) {
      console.error("Login error:", err);
      setError(`Login failed: ${err.message}`);
      setShowLoginDialog(false);
    }
  };

  const handleLogout = () => {
    setBearerToken("");
    setUsername("");
    localStorage.removeItem("teacher_token");
    localStorage.removeItem("teacher_username");
    setStats(null);
  };
  // API Service
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

  // Date Utilities
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

  // Stats Calculator
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

        // Store absent student names with date from classData
        // absentStudents = absentDetails.map((detail) => ({
        //   studentName: detail.studentName,
        //   fromDate: classData.fromDate,
        //   className: classData.className,
        // }));

        if (absentCount === 2) {
          score += 0.5;
          // Combine student names when there are 2 absences in the same class
          const combinedStudentNames = absentDetails
            .map((detail) => detail.studentName)
            .join(" + ");

          const newEntry = {
            studentName: combinedStudentNames,
            fromDate: classData.fromDate,
            className: classData.className,
          };

          // Only push if this combination doesn't already exist
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

      setStats({
        totalFinishedCount,
        totalParticipationScore,
        totalClasses,
        totalMoney,
        absentStudents: allAbsentStudents,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white mx-8 md:mx-0 shadow rounded-3xl sm:p-10">
          <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-bold text-center mb-8">
              Teacher Statistics
            </h1>
            <div className="flex items-center gap-3">
              {bearerToken ? (
                <>
                  <span className="text-gray-600">Hi, {username}</span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-50"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={handleLogin}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Login
                </button>
              )}
            </div>
          </div>
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
                new Date().getFullYear(), // Current year (2025)
                new Date().getFullYear() - 1, // Previous year (2024)
                new Date().getFullYear() - 2, // Year before (2023)
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
          <div className="mt-4">
            <p>Processed count: {processedCount}</p>
          </div>
          {error && (
            <div className="text-red-500 mt-4">
              Error:{" "}
              {error === "API error: 401"
                ? "Please log in to the address: https://teacher.ican.vn \nThen use the extension to access the website."
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
                <strong>Total absences:</strong> {stats.totalParticipationScore}
              </p>
              <p>
                <strong>Total effective classes:</strong> {stats.totalClasses}
              </p>
              <p>
                <strong>Total amount:</strong>{" "}
                {StatsCalculator.formatCurrency(stats.totalMoney)}
              </p>

              {/* Absent Students Section with fromDate */}
              {stats.absentStudents.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-bold text-lg mb-2">
                    - Absent Students -
                  </h3>
                  <div className="max-h-80 overflow-y-auto bg-gray-50 rounded p-3">
                    {stats.absentStudents
                      .sort(
                        (a, b) => new Date(b.fromDate) - new Date(a.fromDate)
                      )
                      .map((student, index) => (
                        <div
                          key={`${student.fromDate}-${index}`}
                          className="mb-4 pb-3 border-b border-gray-200 last:border-0"
                        >
                          <div className="bg-white p-3 rounded shadow-sm">
                            <p className="font-medium text-gray-800">
                              Class: {student.className}
                            </p>
                            <p className="text-gray-600 text-sm mb-2">
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
                            <p className="text-gray-700">
                              Student: {student.studentName}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Login Dialog */}
      {showLoginDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold mb-4 text-center">
              Login Required
            </h2>
            <p className="text-gray-600 mb-4 text-center">
              Please complete the login process in the popup window. If you
              don't see the popup, please check your browser's popup blocker.
            </p>
            <div className="text-center">
              <button
                onClick={() => setShowLoginDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Footer Section */}
      <footer className="mt-8 text-center text-gray-600">
        <div className="flex items-center justify-center gap-2">
          <span>©</span>
          <span>2025 Châu Đỗ. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default TeacherStats;
