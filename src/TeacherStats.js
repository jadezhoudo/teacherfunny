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
  getDoc,
} from "firebase/firestore";

// CSS để ẩn thanh scroll
const scrollbarHideStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;  /* Internet Explorer 10+ */
    scrollbar-width: none;  /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;  /* Safari and Chrome */
  }
`;

const TeacherStats = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalFinishedCount: 0,
    totalParticipationScore: 0,
    totalClasses: 0,
    totalMoney: 0,
    absentStudents: [],
    studentDetails: [], // NEW: Danh sách chi tiết học viên
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
  const [visitorToday, setVisitorToday] = useState(0);
  const [visitorDate, setVisitorDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // NEW: User sections configuration state
  const [userSections, setUserSections] = useState({
    teacherStatistics: true,
    absentStudents: true,
    statisticsSummary: true,
    studentDetails: true,
    donateSection: true,
    visitorsAnalytics: true,
    darkMode: true,
  });

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
    const today = new Date().toISOString().split("T")[0];
    const totalRef = doc(db, "metrics", "visitor_count");
    const dailyRef = doc(db, "metrics", `visitor_daily_${today}`);

    // Realtime listen cho visitors tổng
    const unsubTotal = onSnapshot(totalRef, (snap) => {
      setVisitorTotal(snap.data()?.total || 0);
    });

    // Realtime listen cho visitors theo ngày
    const unsubDaily = onSnapshot(dailyRef, (snap) => {
      setVisitorToday(snap.data()?.count || 0);
    });

    // đếm mỗi lần xem trang
    countVisitEveryTime();

    return () => {
      unsubTotal();
      unsubDaily();
    };
  }, []);

  // NEW: Fetch user sections configuration
  useEffect(() => {
    const fetchUserSections = async () => {
      try {
        // Lấy email từ localStorage hoặc từ state
        const email = userEmail || localStorage.getItem("teacher_email");
        console.log("🔍 Fetching sections for email:", email);

        if (email) {
          const sectionsDoc = doc(db, "user_sections", email);
          const sectionsSnapshot = await getDoc(sectionsDoc);

          if (sectionsSnapshot.exists()) {
            const sectionsData = sectionsSnapshot.data();
            console.log("📋 User sections loaded:", sectionsData);
            setUserSections(sectionsData);
          } else {
            console.log("📋 No custom sections found, using defaults");
            // Không set default nếu không có custom sections
          }
        }
      } catch (error) {
        console.error("Error fetching user sections:", error);
      }
    };

    // Chỉ fetch khi có userEmail hoặc localStorage có email
    if (userEmail || localStorage.getItem("teacher_email")) {
      fetchUserSections();
    }
  }, [userEmail]);

  // NEW: Real-time listener for user sections changes
  useEffect(() => {
    const email = userEmail || localStorage.getItem("teacher_email");
    if (!email) return;

    console.log("👂 Setting up real-time listener for sections:", email);

    const sectionsDoc = doc(db, "user_sections", email);
    const unsubscribe = onSnapshot(
      sectionsDoc,
      (snapshot) => {
        if (snapshot.exists()) {
          const sectionsData = snapshot.data();
          console.log("🔄 Sections updated in real-time:", sectionsData);
          setUserSections(sectionsData);
        } else {
          console.log("🔄 Sections document deleted, using defaults");
          // Reset to defaults if document is deleted
          setUserSections({
            teacherStatistics: true,
            absentStudents: true,
            statisticsSummary: true,
            studentDetails: true,
            donateSection: true,
            visitorsAnalytics: true,
            darkMode: true,
          });
        }
      },
      (error) => {
        console.error("Error in sections listener:", error);
      }
    );

    return () => {
      console.log("🔇 Unsubscribing from sections listener");
      unsubscribe();
    };
  }, [userEmail]);

  const countVisitEveryTime = async () => {
    try {
      const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
      const totalRef = doc(db, "metrics", "visitor_count");
      const dailyRef = doc(db, "metrics", `visitor_daily_${today}`);

      // Tăng tổng visitors
      try {
        await updateDoc(totalRef, {
          total: increment(1),
          updatedAt: serverTimestamp(),
        });
      } catch {
        await setDoc(
          totalRef,
          { total: 1, updatedAt: serverTimestamp() },
          { merge: true }
        );
      }

      // Tăng visitors theo ngày
      try {
        await updateDoc(dailyRef, {
          count: increment(1),
          date: today,
          updatedAt: serverTimestamp(),
        });
      } catch {
        await setDoc(
          dailyRef,
          { count: 1, date: today, updatedAt: serverTimestamp() },
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

  const getVisitorsByDate = async (date) => {
    try {
      const dailyRef = doc(db, "metrics", `visitor_daily_${date}`);
      const snap = await getDoc(dailyRef);
      return snap.data()?.count || 0;
    } catch (e) {
      console.error("Error getting visitors by date:", e);
      return 0;
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

      // NEW: Collect student details for the month
      let allStudentDetails = [];
      diaryResults.forEach((diaryData, index) => {
        if (diaryData && diaryData.data && diaryData.data.details) {
          const classInfo = finishedClasses[index];
          diaryData.data.details.forEach((student) => {
            allStudentDetails.push({
              studentId: student.studentId,
              studentName: student.studentName,
              studentCode: student.studentCode,
              className: classInfo.className,
              fromDate: classInfo.fromDate,
              lessonName: diaryData.data.generalInfo?.lesson || "",
              curriculumName: diaryData.data.generalInfo?.curriculumName || "",
              isParticipated: student.isParticipated,
              rating: student.rating,
              readingPoint: student.detail?.readingPoint || 0,
              listeningPoint: student.detail?.listeningPoint || 0,
              speakingPoint: student.detail?.speakingPoint || 0,
              writingPoint: student.detail?.writingPoint || 0,
            });
          });
        }
      });

      const statsData = {
        totalFinishedCount,
        totalParticipationScore,
        totalClasses,
        totalMoney,
        absentStudents: allAbsentStudents,
        studentDetails: allStudentDetails,
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

      // NEW: Collect student details for date range
      let allStudentDetails = [];
      diaryResults.forEach((diaryData, index) => {
        if (diaryData && diaryData.data && diaryData.data.details) {
          const classInfo = finishedClasses[index];
          diaryData.data.details.forEach((student) => {
            allStudentDetails.push({
              studentId: student.studentId,
              studentName: student.studentName,
              studentCode: student.studentCode,
              className: classInfo.className,
              fromDate: classInfo.fromDate,
              lessonName: diaryData.data.generalInfo?.lesson || "",
              curriculumName: diaryData.data.generalInfo?.curriculumName || "",
              isParticipated: student.isParticipated,
              rating: student.rating,
              readingPoint: student.detail?.readingPoint || 0,
              listeningPoint: student.detail?.listeningPoint || 0,
              speakingPoint: student.detail?.speakingPoint || 0,
              writingPoint: student.detail?.writingPoint || 0,
            });
          });
        }
      });

      const statsData = {
        totalFinishedCount,
        totalParticipationScore,
        totalClasses,
        totalMoney,
        absentStudents: allAbsentStudents,
        studentDetails: allStudentDetails,
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

  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Lấy trạng thái dark mode từ localStorage, mặc định là false (light mode)
    const savedDarkMode = localStorage.getItem("teacher_dark_mode");
    return savedDarkMode ? JSON.parse(savedDarkMode) : false;
  });
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [showSupportNotice, setShowSupportNotice] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);

  // Function để toggle dark mode và lưu vào localStorage
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem("teacher_dark_mode", JSON.stringify(newDarkMode));
  };

  return (
    <>
      <style>{scrollbarHideStyles}</style>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
      <div
        className={`min-h-screen ${
          isDarkMode
            ? "bg-gray-900 text-gray-100"
            : "bg-gradient-to-r from-pink-200 via-pink-100 to-pink-200 text-gray-900"
        } py-3 flex flex-col justify-center sm:py-6 transition-colors duration-500`}
      >
        {/* Fixed Dark Mode Button - Floating Bubble */}
        {userSections.darkMode && (
          <div className="fixed top-4 left-4 z-50">
            <button
              onClick={toggleDarkMode}
              className={`px-4 py-2 rounded-full text-sm font-medium shadow-lg hover:scale-110 transition-all duration-200 ${
                isDarkMode
                  ? "bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                  : "bg-blue-700 text-white hover:bg-blue-600"
              }`}
            >
              {isDarkMode ? "☀ Light" : "🌙 Dark"}
            </button>
          </div>
        )}

        {/* Fixed Help Guide Button - Floating Bubble */}
        <div className="fixed top-4 left-32 z-50">
          <button
            onClick={() => setShowHelpGuide(!showHelpGuide)}
            className="px-4 py-2 rounded-full text-sm font-medium shadow-lg hover:scale-110 transition-all duration-200 bg-green-600 text-white hover:bg-green-700"
          >
            📖 Hướng dẫn
          </button>
        </div>

        {/* Fixed Messenger Chat Button - Top Right Corner */}
        <a
          href="https://m.me/jadezhoudo"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed top-4 right-4 z-50 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-110"
          title="Chat với Châu Đỗ qua Messenger"
        >
          <img
            src={require("./facebook-messenger.png")}
            alt="Facebook Messenger"
            className="w-8 h-8 object-contain"
          />
        </a>

        {/* Fixed Support Author Notice - Bottom Right Corner */}
        {showSupportNotice && (
          <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-fade-in">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl shadow-2xl p-4 transform hover:scale-105 transition-all duration-300 cursor-pointer relative group">
              {/* Toggle Button - Dấu - để hạ xuống */}
              <button
                onClick={() => setShowSupportNotice(false)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-colors duration-200"
                title="Hạ xuống"
              >
                -
              </button>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">❤️</span>
                  </div>
                </div>
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setShowQRCode(!showQRCode)}
                >
                  <h4 className="font-bold text-base mb-2 leading-tight">
                    Ủng hộ tác giả
                  </h4>
                  <p className="text-sm text-pink-100 leading-relaxed mb-2">
                    Việc duy trì và bảo trì phần mềm tốn rất nhiều thời gian,
                    chi phí và nhiều đêm muộn, đặc biệt là khi tôi làm việc sau
                    công việc thường ngày.
                  </p>
                  <p className="text-sm text-pink-100 leading-relaxed">
                    Nếu bạn thích công việc của tôi và muốn thể hiện sự đánh giá
                    cao, có nhiều cách để hỗ trợ tôi.
                  </p>
                </div>
              </div>

              {/* Support Actions */}
              <div className="mt-3 pt-3 border-t border-white/20">
                <div
                  className="flex items-center justify-between text-sm cursor-pointer"
                  onClick={() => setShowQRCode(!showQRCode)}
                >
                  <span className="text-pink-100">💝 Hỗ trợ ngay</span>
                  <span className="text-white/80 group-hover:translate-x-1 transition-transform duration-200">
                    {showQRCode ? "←" : "→"}
                  </span>
                </div>
              </div>

              {/* QR Code Section */}
              {showQRCode && (
                <div className="mt-3 pt-3 border-t border-white/20 animate-fade-in">
                  <div className="text-center">
                    <h5 className="font-bold text-sm mb-3 text-white">
                      💳 Chuyển tiền qua QR Code
                    </h5>
                    <div className="bg-white rounded-xl p-3 mb-3">
                      <img
                        src={DONATE_INFO.qrImageUrl}
                        alt="Donate QR Code"
                        className="w-32 h-32 mx-auto object-contain rounded-lg"
                      />
                    </div>
                    <div className="text-xs text-pink-100 space-y-1">
                      <p>TP Bank: 0377 3935 368</p>
                      <p>Chủ tài khoản: Chau Do</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fixed Support Author Notice - Collapsed State */}
        {!showSupportNotice && (
          <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl shadow-2xl p-3 transform hover:scale-105 transition-all duration-300 cursor-pointer relative group">
              {/* Toggle Button - Dấu + để mở lại */}
              <button
                onClick={() => setShowSupportNotice(true)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-colors duration-200"
                title="Mở rộng"
              >
                +
              </button>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white text-base">❤️</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight">
                    Ủng hộ tác giả
                  </h4>
                  <p className="text-xs text-pink-100">Click để xem chi tiết</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debug Section Status - Temporary for testing */}
        {/* <div className="fixed top-4 left-4 z-50 bg-black/80 text-white p-3 rounded-lg text-xs max-w-xs">
          <div className="font-bold mb-2">🔧 Sections Status:</div>
          {Object.entries(userSections).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span>{key}:</span>
              <span className={value ? "text-green-400" : "text-red-400"}>
                {value ? "✅" : "❌"}
              </span>
            </div>
          ))}
        </div> */}

        <div className="relative py-3 sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl sm:mx-auto">
          <div
            className={`relative px-4 py-6 ${
              isDarkMode ? "bg-gray-800/50" : "bg-white/50"
            } mx-4 md:mx-0 shadow-xl rounded-3xl sm:p-8 lg:p-10 transition-colors duration-500 backdrop-blur-sm`}
          >
            <div className="max-w-6xl lg:max-w-7xl xl:max-w-8xl mx-auto">
              {/* NEW LAYOUT: Grid 2x2 for 4 main sections */}
              <div className="">
                {/* Grid Layout: 2x2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  {/* Section 1: Teacher Statistics Dashboard (Top-Left) - VỚI TABS VÀ DATE SELECTION */}
                  {userSections.teacherStatistics && (
                    <div
                      className={`p-4 lg:p-6 rounded-lg shadow-lg ${
                        isDarkMode
                          ? "bg-gray-700 border border-gray-600"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <h3 className="font-bold text-xl lg:text-2xl mb-4 lg:mb-6 text-center">
                        ⭐ Teacher Statistics
                      </h3>

                      {/* Tabs */}
                      <div
                        className={`flex mb-6 shadow rounded-lg overflow-hidden border ${
                          isDarkMode ? "border-gray-700" : "border-gray-200"
                        }`}
                      >
                        <button
                          onClick={() => setActiveTab("month")}
                          className={`flex-1 px-4 py-3 text-base font-medium transition-colors duration-200 ${
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
                          className={`flex-1 px-4 py-3 text-base font-medium transition-colors duration-200 ${
                            activeTab === "range"
                              ? "bg-blue-600 text-white"
                              : isDarkMode
                              ? "bg-gray-700 text-gray-300 hover:bg-gray-200"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          By Date Range
                        </button>
                      </div>

                      {/* Date Selection */}
                      {activeTab === "month" && (
                        <div className="flex flex-col sm:flex-row gap-3 mb-4">
                          <select
                            value={selectedMonth}
                            onChange={(e) =>
                              setSelectedMonth(parseInt(e.target.value))
                            }
                            className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring focus:ring-blue-200 bg-inherit"
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(
                              (month) => (
                                <option key={month} value={month}>
                                  {new Date(2000, month - 1).toLocaleString(
                                    "default",
                                    {
                                      month: "long",
                                    }
                                  )}
                                </option>
                              )
                            )}
                          </select>
                          <select
                            value={selectedYear}
                            onChange={(e) =>
                              setSelectedYear(parseInt(e.target.value))
                            }
                            className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring focus:ring-blue-200 bg-inherit"
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
                      )}

                      {/* Date Range Selection */}
                      {activeTab === "range" && (
                        <div className="mb-4 space-y-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">
                              From Date:
                            </label>
                            <input
                              type="date"
                              value={customStartDate}
                              onChange={(e) =>
                                setCustomStartDate(e.target.value)
                              }
                              max={new Date().toISOString().split("T")[0]}
                              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring focus:ring-blue-200 bg-inherit"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">
                              To Date:
                            </label>
                            <input
                              type="date"
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring focus:ring-blue-200 bg-inherit"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              ⏰ End time will be set to 23:59:59 of the
                              selected date
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Manual Token Toggle */}
                      {!userEmail && (
                        <div className="flex items-center mt-4 mb-3">
                          <label
                            htmlFor="toggleToken"
                            className="mr-3 text-xs font-medium"
                          >
                            Use Manual Code
                          </label>
                          <div
                            onClick={() => setShowTokenInput(!showTokenInput)}
                            className={`w-10 h-5 flex items-center bg-gray-300 rounded-full p-1 cursor-pointer ${
                              showTokenInput ? "bg-green-400" : "bg-gray-300"
                            }`}
                          >
                            <div
                              className={`bg-white w-3 h-3 rounded-full shadow transform duration-300 ease-in-out ${
                                showTokenInput ? "translate-x-5" : ""
                              }`}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Error/Instruction Message */}
                      {!bearerToken && (
                        <div className="text-red-600 mt-3 text-xs space-y-1">
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

                      {/* Manual Token Input */}
                      {!bearerToken && !userEmail && showTokenInput && (
                        <div className="mt-3 mb-4 space-y-2">
                          <input
                            type="text"
                            value={inputToken}
                            onChange={(e) => setInputToken(e.target.value)}
                            placeholder="Enter code here"
                            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring focus:ring-purple-200 bg-inherit"
                          />
                          <button
                            onClick={handleSaveToken}
                            className="w-full px-4 py-2 text-sm bg-purple-600 text-white rounded-lg font-semibold shadow hover:bg-purple-700"
                          >
                            Save Code
                          </button>
                        </div>
                      )}

                      {/* Calculate Button */}
                      {bearerToken && (
                        <button
                          onClick={
                            activeTab === "month"
                              ? fetchData
                              : fetchDataByDateRange
                          }
                          disabled={loading}
                          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                        >
                          {loading
                            ? "Processing..."
                            : `Calculate Statistics ${
                                activeTab === "range" ? "for Date Range" : ""
                              }`}
                        </button>
                      )}

                      {/* Processed count */}
                      {processedCount > 0 && (
                        <div className="mt-3 text-sm font-medium text-center">
                          Processed count: {processedCount}
                        </div>
                      )}

                      {/* Error Display */}
                      {error && (
                        <div className="text-red-600 mt-3 text-xs whitespace-pre-line">
                          Info:{" "}
                          {error === "API error: 401"
                            ? "Please log in to the address: https://teacher.ican.vn\nThen use the extension to access the website."
                            : error === "API error: 403"
                            ? "Please Reload The Page !"
                            : error}
                        </div>
                      )}

                      {/* User Email + Logout */}
                      {userEmail && (
                        <div
                          className={`mt-4 flex items-center justify-between px-3 py-2 rounded-lg shadow text-xs ${
                            isDarkMode
                              ? "bg-green-700 text-green-100"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          <span>Hello, {userEmail}</span>
                          <button
                            onClick={handleLogout}
                            className="ml-2 text-xs font-semibold uppercase text-red-600 hover:text-red-700 hover:underline"
                          >
                            Logout
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 2: Absent Students Report (Top-Right) */}
                  {userSections.absentStudents && (
                    <div
                      className={`p-4 lg:p-6 rounded-lg shadow-lg ${
                        isDarkMode
                          ? "bg-gray-700 border border-gray-600"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <h3 className="font-bold text-xl lg:text-2xl mb-4 lg:mb-6 text-center">
                        📋 Absent Students Report
                      </h3>

                      {stats.absentStudents &&
                      stats.absentStudents.length > 0 ? (
                        <>
                          {/* Desktop Table View */}
                          <div className="hidden md:block">
                            <div className="max-h-80 overflow-y-auto overflow-x-auto scrollbar-hide">
                              <table className="w-full border-collapse border border-gray-300 rounded-lg overflow-hidden shadow-lg">
                                <thead
                                  className={`${
                                    isDarkMode
                                      ? "bg-gray-800 text-gray-100"
                                      : "bg-blue-600 text-white"
                                  } sticky top-0 z-10`}
                                >
                                  <tr>
                                    <th className="px-3 py-2 text-center font-semibold border-r border-gray-300 text-sm">
                                      No.
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold border-r border-gray-300 text-sm">
                                      📚 Class
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold border-r border-gray-300 text-sm">
                                      📅 Date
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold border-r border-gray-300 text-sm">
                                      🕐 Time
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold text-sm">
                                      👤 Student
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
                                        new Date(b.fromDate) -
                                        new Date(a.fromDate)
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
                                        <td className="px-3 py-2 border-r border-gray-300 text-center font-medium text-sm">
                                          {index + 1}
                                        </td>
                                        <td className="px-3 py-2 border-r border-gray-300 font-medium text-sm">
                                          {student.className}
                                        </td>
                                        <td className="px-3 py-2 border-r border-gray-300 text-xs">
                                          {new Date(
                                            student.fromDate
                                          ).toLocaleDateString("vi-VN", {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </td>
                                        <td className="px-3 py-2 border-r border-gray-300 text-xs">
                                          {new Date(
                                            student.fromDate
                                          ).toLocaleTimeString("vi-VN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </td>
                                        <td className="px-3 py-2 font-medium text-sm">
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
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                              {stats.absentStudents
                                .sort(
                                  (a, b) =>
                                    new Date(b.fromDate) - new Date(a.fromDate)
                                )
                                .map((student, index) => (
                                  <div
                                    key={`${student.fromDate}-${index}`}
                                    className={`p-3 border rounded-lg shadow-sm ${
                                      isDarkMode
                                        ? "bg-gray-600 border-gray-500 text-gray-100"
                                        : "bg-gray-50 border-gray-200 text-gray-800"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                          #{index + 1}
                                        </span>
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">
                                          {student.studentName}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {student.className}
                                        </p>
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {new Date(
                                          student.fromDate
                                        ).toLocaleDateString("vi-VN", {
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>

                          {/* Summary */}
                          <div className="mt-4 text-center">
                            <p className="text-sm font-medium text-gray-600">
                              📊 Total Absent Records:{" "}
                              <span className="font-bold text-blue-600">
                                {stats.absentStudents.length}
                              </span>
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>No absent students found</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 3: Statistics Summary + Support Project (Bottom-Left) */}
                  {userSections.statisticsSummary && (
                    <div
                      className={`p-4 lg:p-6 rounded-lg shadow-lg ${
                        isDarkMode
                          ? "bg-gray-700 border border-gray-600"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      {/* Statistics Summary - Chỉ hiển thị khi có data */}
                      {stats.totalFinishedCount > 0 ||
                      stats.totalClasses > 0 ? (
                        <>
                          <h3 className="font-bold text-xl lg:text-2xl mb-4 lg:mb-6 text-center">
                            📊 Statistics Summary
                          </h3>
                          <div className="grid grid-cols-2 gap-4 lg:gap-6 mb-6">
                            <div className="text-center">
                              <p className="text-2xl lg:text-3xl font-bold text-blue-600">
                                {stats.totalFinishedCount}
                              </p>
                              <p className="text-sm lg:text-base text-gray-600">
                                Total Classes
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl lg:text-3xl font-bold text-red-600">
                                {stats.totalParticipationScore}
                              </p>
                              <p className="text-sm lg:text-base text-gray-600">
                                Absences
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl lg:text-3xl font-bold text-green-600">
                                {stats.totalClasses}
                              </p>
                              <p className="text-sm lg:text-base text-gray-600">
                                Effective Classes
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl lg:text-3xl font-bold text-purple-600">
                                {StatsCalculator.formatCurrency(
                                  stats.totalMoney
                                )}
                              </p>
                              <p className="text-sm lg:text-base text-gray-600">
                                Total Amount
                              </p>
                            </div>
                          </div>

                          {/* Date range info for stats */}
                          {activeTab === "range" &&
                            customStartDate &&
                            customEndDate && (
                              <div className="mb-6 pt-3 border-t border-gray-300 text-center text-sm text-gray-600">
                                <p>
                                  Period:{" "}
                                  {new Date(customStartDate).toLocaleDateString(
                                    "vi-VN"
                                  )}{" "}
                                  00:00 -{" "}
                                  {new Date(customEndDate).toLocaleDateString(
                                    "vi-VN"
                                  )}{" "}
                                  23:59
                                </p>
                              </div>
                            )}
                        </>
                      ) : (
                        /* Default content khi chưa có data */
                        <div className="text-center py-8">
                          <h3 className="font-bold text-xl lg:text-2xl mb-4 lg:mb-6 text-center">
                            📊 Statistics Summary
                          </h3>
                          <p className="text-gray-500 text-sm lg:text-base mb-6">
                            Click "Calculate Statistics" to fetch and display
                            your statistics here
                          </p>
                        </div>
                      )}

                      {/* Support the Project - Luôn hiển thị */}
                      <div className="border-t border-gray-300 pt-6">
                        <h4 className="font-bold text-lg mb-4 text-center">
                          ❤️ Support the Project
                        </h4>

                        <div className="text-center">
                          <p className="text-sm lg:text-base text-gray-600 mb-4">
                            If you find this tool helpful, consider buying me a
                            coffee!
                          </p>

                          <div
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-4 ${
                              isDarkMode ? "bg-gray-600" : "bg-pink-50"
                            }`}
                          >
                            <span className="font-semibold text-sm">
                              TP Bank:
                            </span>
                            <span className="tracking-wide font-mono text-sm">
                              {DONATE_INFO.bankNumber}
                            </span>
                          </div>

                          <div className="flex justify-center">
                            <img
                              src={DONATE_INFO.qrImageUrl}
                              alt="Donate QR"
                              className="w-32 h-32 md:w-40 md:h-40 object-contain rounded-xl"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 4: Student Details List (Bottom-Right) */}
                  {userSections.studentDetails && (
                    <div
                      className={`p-4 lg:p-6 rounded-lg shadow-lg ${
                        isDarkMode
                          ? "bg-gray-700 border border-gray-600"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <h3 className="font-bold text-xl lg:text-2xl mb-4 lg:mb-6 text-center">
                        👥 Student Details & Lessons
                      </h3>

                      {stats.studentDetails &&
                      stats.studentDetails.length > 0 ? (
                        <>
                          {/* Desktop Table View */}
                          <div className="hidden md:block">
                            <div className="max-h-96 overflow-y-auto overflow-x-auto scrollbar-hide">
                              <table className="w-full border-collapse border border-gray-300 rounded-lg overflow-hidden shadow-lg">
                                <thead
                                  className={`${
                                    isDarkMode
                                      ? "bg-gray-800 text-gray-100"
                                      : "bg-green-600 text-white"
                                  } sticky top-0 z-10`}
                                >
                                  <tr>
                                    <th className="px-3 py-2 text-center font-semibold border-r border-gray-300 text-sm">
                                      No.
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold border-r border-gray-300 text-sm">
                                      👤 Student
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold border-r border-gray-300 text-sm">
                                      📚 Class
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold border-r border-gray-300 text-sm">
                                      📖 Lesson
                                    </th>
                                    <th className="px-3 py-2 text-center font-semibold text-sm">
                                      📊 Classes Count
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
                                  {stats.studentDetails
                                    .filter(
                                      (student, index, self) =>
                                        // Lọc trùng lặp dựa trên studentId và className
                                        index ===
                                        self.findIndex(
                                          (s) =>
                                            s.studentId === student.studentId &&
                                            s.className === student.className
                                        )
                                    )
                                    .sort(
                                      (a, b) =>
                                        new Date(b.fromDate) -
                                        new Date(a.fromDate)
                                    )
                                    .map((student, index) => (
                                      <tr
                                        key={`${student.studentId}-${index}`}
                                        className={`${
                                          index % 2 === 0
                                            ? isDarkMode
                                              ? "bg-gray-600"
                                              : "bg-gray-50"
                                            : isDarkMode
                                            ? "bg-gray-700"
                                            : "bg-white"
                                        } hover:bg-green-50 hover:text-green-800 transition-colors duration-200`}
                                      >
                                        <td className="px-3 py-2 border-r border-gray-300 text-center font-medium text-sm">
                                          {index + 1}
                                        </td>
                                        <td className="px-3 py-2 border-r border-gray-300 font-medium text-sm">
                                          {student.studentName}
                                        </td>
                                        <td className="px-3 py-2 border-r border-gray-300 text-xs">
                                          {student.className}
                                        </td>
                                        <td className="px-3 py-2 border-r border-gray-300 text-xs">
                                          {student.lessonName || "N/A"}
                                        </td>
                                        <td className="px-3 py-2 text-sm">
                                          {
                                            stats.studentDetails.filter(
                                              (s) =>
                                                s.studentId ===
                                                  student.studentId &&
                                                s.className ===
                                                  student.className
                                            ).length
                                          }
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Mobile Card View */}
                          <div className="md:hidden">
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {stats.studentDetails
                                .filter(
                                  (student, index, self) =>
                                    // Lọc trùng lặp dựa trên studentId và className
                                    index ===
                                    self.findIndex(
                                      (s) =>
                                        s.studentId === student.studentId &&
                                        s.className === student.className
                                    )
                                )
                                .sort(
                                  (a, b) =>
                                    new Date(b.fromDate) - new Date(a.fromDate)
                                )
                                .map((student, index) => (
                                  <div
                                    key={`${student.studentId}-${index}`}
                                    className={`p-3 border rounded-lg shadow-sm ${
                                      isDarkMode
                                        ? "bg-gray-600 border-gray-500 text-gray-100"
                                        : "bg-gray-50 border-gray-200 text-gray-800"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                          #{index + 1}
                                        </span>
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">
                                          {student.studentName}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {student.className}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          {student.lessonName || "N/A"}
                                        </p>
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        📊{" "}
                                        {
                                          stats.studentDetails.filter(
                                            (s) =>
                                              s.studentId ===
                                                student.studentId &&
                                              s.className === student.className
                                          ).length
                                        }{" "}
                                        classes
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>

                          {/* Summary */}
                          <div className="mt-4 text-center">
                            <p className="text-sm font-medium text-gray-600">
                              👥 Total Students (After Filtering):{" "}
                              <span className="font-bold text-green-600">
                                {
                                  stats.studentDetails.filter(
                                    (student, index, self) =>
                                      index ===
                                      self.findIndex(
                                        (s) =>
                                          s.studentId === student.studentId &&
                                          s.className === student.className
                                      )
                                  ).length
                                }
                              </span>
                              {" • "}
                              📊 Total Classes:{" "}
                              <span className="font-bold text-blue-600">
                                {stats.studentDetails.length}
                              </span>
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>No student details available</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {userSections.visitorsAnalytics && (
          <footer className="mt-8 lg:mt-12 text-center text-sm">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-gray-500">
              <span>• Ver 3.6</span>
              <span>©2025 Châu Đỗ. All rights reserved.</span>

              {/* Visitors Section */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                {/* Visitors Today */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  📅 Today: <b>{visitorToday}</b>
                </span>

                {/* Visitors Total */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  👀 Total: <b>{visitorTotal}</b>
                </span>
              </div>

              {/* Date Selector for Visitors */}
              {/* <div className="flex items-center gap-2">
              <input
                type="date"
                value={visitorDate}
                onChange={(e) => setVisitorDate(e.target.value)}
                className="px-2 py-1 text-xs border rounded focus:ring focus:ring-blue-200 bg-inherit"
              />
              <button
                onClick={() =>
                  getVisitorsByDate(visitorDate).then((count) => {
                    // Có thể hiển thị kết quả trong console hoặc alert
                    console.log(`Visitors on ${visitorDate}: ${count}`);
                  })
                }
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Check
              </button>
            </div> */}
            </div>
          </footer>
        )}
      </div>

      {/* Help Guide Modal */}
      {showHelpGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 p-2 sm:p-4">
          <div className="relative top-4 sm:top-10 mx-auto w-full sm:w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 2xl:w-1/2 max-w-4xl max-h-[90vh] lg:max-h-[85vh]">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden h-full flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-600 to-blue-600 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xl sm:text-2xl">📖</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white leading-tight">
                        Hướng dẫn sử dụng
                      </h3>
                      <p className="text-green-100 text-xs sm:text-sm mt-1">
                        Cách sử dụng Teacher Tracking App
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHelpGuide(false)}
                    className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white hover:text-gray-100 transition-colors flex-shrink-0"
                  >
                    <span className="text-sm sm:text-base">✕</span>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 overflow-y-auto">
                <div className="space-y-4 sm:space-y-6">
                  {/* Step 1 */}
                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mx-auto sm:mx-0">
                      1
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base sm:text-lg text-gray-800 mb-2 text-center sm:text-left">
                        🔐 Đăng nhập vào Teacher Platform
                      </h4>
                      <p className="text-gray-600 mb-3 text-sm sm:text-base text-center sm:text-left">
                        Truy cập vào địa chỉ:{" "}
                        <a
                          href="https://teacher.ican.vn"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline font-medium break-all"
                        >
                          https://teacher.ican.vn
                        </a>
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs sm:text-sm text-blue-800 text-center sm:text-left">
                          <strong>Lưu ý:</strong> Bạn cần đăng nhập vào tài
                          khoản giáo viên của mình
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mx-auto sm:mx-0">
                      2
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base sm:text-lg text-gray-800 mb-2 text-center sm:text-left">
                        🔌 Cài đặt Extension
                      </h4>
                      <p className="text-gray-600 mb-3 text-sm sm:text-base text-center sm:text-left">
                        Cài đặt extension từ Chrome Web Store:
                      </p>
                      <div className="text-center sm:text-left">
                        <a
                          href="https://chromewebstore.google.com/detail/eihakmhchijandboncdhnjmeoakockoe?utm_source=item-share-cb"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
                        >
                          🚀 Install Extension from Chrome Web Store
                        </a>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                        <p className="text-xs sm:text-sm text-green-800 text-center sm:text-left">
                          <strong>Lưu ý:</strong> Extension này sẽ giúp bạn lấy
                          token để sử dụng Teacher Tracking App
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mx-auto sm:mx-0">
                      3
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base sm:text-lg text-gray-800 mb-2 text-center sm:text-left">
                        🌐 Sử dụng Extension
                      </h4>
                      <p className="text-gray-600 mb-3 text-sm sm:text-base text-center sm:text-left">
                        Sau khi cài đặt extension:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600 ml-4 text-sm sm:text-base">
                        <li>
                          Mở trang <strong>https://teacher.ican.vn</strong>
                        </li>
                        <li>Click vào icon extension trên thanh trình duyệt</li>
                        <li>
                          Click button <strong>"Open Website"</strong> trên
                          extension
                        </li>
                        <li>
                          Extension sẽ tự động lấy token và hiển thị trên trang
                        </li>
                      </ol>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-3">
                        <p className="text-xs sm:text-sm text-purple-800 text-center sm:text-left">
                          <strong>Lưu ý:</strong> Token sẽ được tự động lưu và
                          bạn có thể sử dụng Teacher Tracking App
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mx-auto sm:mx-0">
                      4
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base sm:text-lg text-gray-800 mb-2 text-center sm:text-left">
                        📊 Sử dụng Teacher Tracking App
                      </h4>
                      <p className="text-gray-600 mb-3 text-sm sm:text-base text-center sm:text-left">
                        Bây giờ bạn có thể:
                      </p>
                      <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4 text-sm sm:text-base">
                        <li>
                          Xem thống kê giảng dạy theo tháng hoặc khoảng thời
                          gian
                        </li>
                        <li>Xem danh sách học viên vắng học</li>
                        <li>Xem chi tiết từng buổi học</li>
                        <li>Phân tích hiệu quả giảng dạy</li>
                      </ul>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-3">
                        <p className="text-xs sm:text-sm text-orange-800 text-center sm:text-left">
                          <strong>Lưu ý:</strong> App sẽ tự động cập nhật dữ
                          liệu mới nhất từ Teacher Platform
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                  <h4 className="font-bold text-base sm:text-lg text-gray-800 mb-3 sm:mb-4 text-center">
                    🚀 Hành động nhanh
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <a
                      href="https://teacher.ican.vn"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
                    >
                      🌐 Mở Teacher Platform
                    </a>
                    <a
                      href="https://chromewebstore.google.com/detail/eihakmhchijandboncdhnjmeoakockoe?utm_source=item-share-cb"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm sm:text-base"
                    >
                      🔌 Cài đặt Extension
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex justify-center sm:justify-end px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-gray-50 border-t border-gray-200 flex-shrink-0">
                <button
                  onClick={() => setShowHelpGuide(false)}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transform hover:scale-105 transition-all duration-200 shadow-md text-sm sm:text-base"
                >
                  ✕ Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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
