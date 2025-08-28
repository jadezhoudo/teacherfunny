import React, { useState, useEffect, useCallback } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  getDocs,
  orderBy,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import pLimit from "p-limit";

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [teacherStats, setTeacherStats] = useState([]);
  const [visitorStats, setVisitorStats] = useState(null);
  const [activeTab, setActiveTab] = useState("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState("desc");

  // NEW: User details and token request states
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [tokenRequestLoading, setTokenRequestLoading] = useState(false);
  const [tokenRequestResult, setTokenRequestResult] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // NEW: User list and details states
  const [userList, setUserList] = useState([]);
  const [userListLoading, setUserListLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [userStatsLoading, setUserStatsLoading] = useState(false);
  const [userStatsResult, setUserStatsResult] = useState(null);

  // NEW: Date range states
  const [useDateRange, setUseDateRange] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        fetchTeacherStats();
        fetchVisitorStats();
        fetchUserList(); // NEW: Fetch user list
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setError("Login failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      setError("Logout failed: " + error.message);
    }
  };

  const fetchTeacherStats = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch from teacher_stats collection
      const teacherStatsQuery = query(
        collection(db, "teacher_stats"),
        orderBy(sortBy, sortOrder)
      );

      const teacherStatsSnapshot = await getDocs(teacherStatsQuery);
      const teacherStatsData = teacherStatsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch from teacher_stats_date_range collection
      const dateRangeQuery = query(
        collection(db, "teacher_stats_date_range"),
        orderBy(sortBy, sortOrder)
      );

      const dateRangeSnapshot = await getDocs(dateRangeQuery);
      const dateRangeData = dateRangeSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        type: "date_range",
      }));

      // Combine and process data
      const allStats = [...teacherStatsData, ...dateRangeData];

      // Add type for monthly stats
      const processedStats = allStats.map((stat) => ({
        ...stat,
        type: stat.type || "monthly",
      }));

      setTeacherStats(processedStats);
    } catch (error) {
      console.error("Error fetching teacher stats:", error);
      setError("Failed to fetch teacher statistics");
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder]);

  const fetchVisitorStats = async () => {
    try {
      const visitorDoc = doc(db, "metrics", "visitor_count");
      const visitorSnapshot = await getDoc(visitorDoc);

      if (visitorSnapshot.exists()) {
        setVisitorStats(visitorSnapshot.data());
      }
    } catch (error) {
      console.error("Error fetching visitor stats:", error);
    }
  };

  // NEW: Fetch user list from mail_teacher collection
  const fetchUserList = async () => {
    try {
      setUserListLoading(true);
      const userListQuery = query(
        collection(db, "mail_teacher"),
        orderBy("timestamp", "desc")
      );

      const userListSnapshot = await getDocs(userListQuery);
      const userListData = userListSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setUserList(userListData);
    } catch (error) {
      console.error("Error fetching user list:", error);
      setError("Failed to fetch user list");
    } finally {
      setUserListLoading(false);
    }
  };

  // NEW: Validate token format
  const validateToken = (token) => {
    if (!token || typeof token !== "string") {
      return false;
    }

    // Check if token has JWT format (3 parts separated by dots)
    const parts = token.split(".");
    if (parts.length !== 3) {
      return false;
    }

    return true;
  };

  // NEW: Fetch user statistics using user's token (similar to TeacherStats.js logic)
  const fetchUserStats = async (userToken, month, year) => {
    try {
      setUserStatsLoading(true);
      setUserStatsResult(null);

      // Validate token first
      if (!validateToken(userToken)) {
        throw new Error(
          "Invalid token format. Please check if the user's token is valid."
        );
      }

      // API endpoints from TeacherStats.js
      const apiBase =
        "https://api-teacher-ican.vercel.app/api/teacher/api/v1/api/teacher";

      // Test API endpoint first with GET method (HEAD not supported)
      try {
        const testResponse = await fetch(`${apiBase}/products?page=SCHEDULE`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(15000), // 15 second timeout
        });

        if (testResponse.status === 401) {
          throw new Error(
            "Token expired or invalid. Please ask the user to refresh their token."
          );
        } else if (testResponse.status === 403) {
          throw new Error(
            "Access denied. The user's token may not have sufficient permissions."
          );
        } else if (testResponse.status >= 500) {
          throw new Error("Server error. Please try again later.");
        }
      } catch (error) {
        if (error.name === "AbortError") {
          throw new Error(
            "API request timed out. The server is taking too long to respond. Please try again later."
          );
        }
        if (
          error.message.includes("Token expired") ||
          error.message.includes("Access denied")
        ) {
          throw error;
        }
        // If it's a network error, continue with the actual request
      }

      // Get products first
      const productsResponse = await fetch(
        `${apiBase}/products?page=SCHEDULE`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!productsResponse.ok) {
        throw new Error(`Products API error: ${productsResponse.status}`);
      }

      // Check if response is JSON
      const contentType = productsResponse.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await productsResponse.text();
        throw new Error(
          `Invalid response format. Expected JSON but got: ${textResponse.substring(
            0,
            100
          )}...`
        );
      }

      const productsData = await productsResponse.json();
      const productIds = productsData.data.map((item) => item.id);

      // Generate date ranges for the month (same logic as TeacherStats.js)
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      const dateRanges = [];
      let currentDate = startDate;

      while (currentDate <= endDate) {
        const toDate = new Date(currentDate);
        toDate.setUTCDate(toDate.getUTCDate() + 6);

        if (toDate > endDate) {
          toDate.setTime(endDate.getTime());
        } else {
          toDate.setUTCHours(23, 59, 59, 999);
        }

        dateRanges.push({
          from: currentDate.toISOString(),
          to: toDate.toISOString(),
        });

        currentDate = new Date(toDate);
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        currentDate.setUTCHours(0, 0, 0, 0);
      }

      // Get shifts for each date range
      const shiftPromises = dateRanges.map((dateRange) => {
        const params = new URLSearchParams({
          "status[]": "ACTIVE",
          fromDate: dateRange.from,
          toDate: dateRange.to,
        });

        const productIdsQuery = productIds
          .map((id) => `product_ids[]=${id}`)
          .join("&");

        return fetch(`${apiBase}/shifts?${params}&${productIdsQuery}`, {
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
        });
      });

      const shiftsResponses = await Promise.all(shiftPromises);

      // Check each response and handle errors
      const shiftsResults = await Promise.all(
        shiftsResponses.map(async (response, index) => {
          if (!response.ok) {
            throw new Error(
              `Shifts API error ${index + 1}: ${response.status}`
            );
          }

          // Check if response is JSON
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            const textResponse = await response.text();
            throw new Error(
              `Invalid shifts response format ${
                index + 1
              }. Expected JSON but got: ${textResponse.substring(0, 100)}...`
            );
          }

          return response.json();
        })
      );

      const allShifts = shiftsResults.flatMap((result) => result.data);
      const finishedClasses = allShifts.filter(
        (classItem) => classItem.classStatus === "FINISHED"
      );

      // Get diary details for finished classes using pLimit (same as TeacherStats.js)
      const limit = pLimit(5); // Limit to 5 concurrent requests (same as TeacherStats.js)

      const diaryPromises = finishedClasses.map((classItem, index) =>
        limit(async () => {
          try {
            const response = await fetch(
              `https://api-teacher-ican.vercel.app/api/teacher/api/v1/api/diary/${classItem.classSessionId}`,
              {
                headers: {
                  Authorization: `Bearer ${userToken}`,
                  "Content-Type": "application/json",
                },
                // Add timeout to prevent hanging requests
                signal: AbortSignal.timeout(30000), // 30 second timeout
              }
            );

            if (!response.ok) {
              if (response.status === 404) {
                console.warn(
                  `📭 Diary not found for class ${index + 1}: ${
                    classItem.classSessionId
                  }`
                );
                return null; // Return null for 404, don't throw error (same as TeacherStats.js)
              }

              // Handle other HTTP errors gracefully
              if (response.status >= 500) {
                console.warn(
                  `⚠️ Server error for diary ${index + 1}: ${response.status}`
                );
                return null;
              }

              throw new Error(
                `Diary API error ${index + 1}: ${response.status}`
              );
            }

            // Check if response is JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
              const textResponse = await response.text();
              console.warn(
                `❌ Invalid content type for diary ${
                  index + 1
                }: ${textResponse.substring(0, 100)}...`
              );
              return null; // Return null instead of throwing error
            }

            return await response.json();
          } catch (error) {
            // Handle network errors, timeouts, and other issues gracefully
            if (error.name === "AbortError") {
              console.warn(
                `⏰ Diary request timeout for class ${index + 1}: ${
                  classItem.classSessionId
                }`
              );
              return null;
            }

            if (
              error.message.includes("Failed to fetch") ||
              error.message.includes("CORS")
            ) {
              console.warn(
                `🚫 Network/CORS error for diary ${index + 1}: ${
                  classItem.classSessionId
                }`
              );
              return null;
            }

            console.error(`💥 Unexpected error for diary ${index + 1}:`, error);
            return null; // Return null instead of throwing error
          }
        })
      );

      // Wait for all diary requests to complete
      const diaryResults = await Promise.all(diaryPromises);

      // Calculate stats (same logic as TeacherStats.js)
      let totalFinishedCount = finishedClasses.length;
      let totalParticipationScore = 0;
      let allAbsentStudents = [];
      let processedDiaries = 0;
      let skippedDiaries = 0;

      diaryResults.forEach((diaryData, index) => {
        if (diaryData && diaryData.data && diaryData.data.details) {
          processedDiaries++;
          const details = diaryData.data.details;

          if (details.length > 1) {
            const absentDetails = details.filter(
              (detail) => detail.isParticipated === false
            );

            if (absentDetails.length === 2) {
              totalParticipationScore += 0.5;
              const combinedStudentNames = absentDetails
                .map((detail) => detail.studentName)
                .join(" + ");

              allAbsentStudents.push({
                studentName: combinedStudentNames,
                fromDate: finishedClasses[index].fromDate,
                className: finishedClasses[index].className,
              });
            }
          } else {
            details.forEach((detail) => {
              if (detail.isParticipated === false) {
                totalParticipationScore += 0.5;
                allAbsentStudents.push({
                  studentName: detail.studentName,
                  fromDate: finishedClasses[index].fromDate,
                  className: finishedClasses[index].className,
                });
              }
            });
          }
        } else if (diaryData === null) {
          skippedDiaries++;
          console.log(`📭 Skipped diary ${index + 1} due to missing data`);
        }
      });

      // Log summary for debugging (same as TeacherStats.js)
      console.log(
        `📊 Monthly Diary Processing: ${processedDiaries} processed, ${skippedDiaries} skipped out of ${diaryResults.length} total`
      );

      const totalClasses = totalFinishedCount - totalParticipationScore;
      const totalMoney = totalClasses * 50000;

      const result = {
        totalFinishedCount,
        totalParticipationScore,
        totalClasses,
        totalMoney,
        absentStudents: allAbsentStudents,
        month,
        year,
        userEmail: selectedUserForDetails,
        timestamp: new Date().toISOString(),
        // Additional info for debugging
        processedDiaries,
        skippedDiaries,
        totalDiaries: diaryResults.length,
      };

      setUserStatsResult(result);

      // Save to Firestore for admin requests
      try {
        await setDoc(
          doc(
            db,
            "admin_user_stats",
            `${selectedUserForDetails}_${month}_${year}`
          ),
          {
            ...result,
            requestedBy: user.email,
            requestedAt: new Date().toISOString(),
          }
        );
      } catch (e) {
        console.error("Error saving to Firestore:", e);
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
      setUserStatsResult({
        error: error.message,
        userEmail: selectedUserForDetails,
        month,
        year,
      });
    } finally {
      setUserStatsLoading(false);
    }
  };

  // NEW: Fetch user statistics using user's token for date range (similar to TeacherStats.js logic)
  const fetchUserStatsByDateRange = async (userToken, startDate, endDate) => {
    try {
      setUserStatsLoading(true);
      setUserStatsResult(null);

      // Validate token first
      if (!validateToken(userToken)) {
        throw new Error(
          "Invalid token format. Please check if the user's token is valid."
        );
      }

      // API endpoints from TeacherStats.js
      const apiBase =
        "https://api-teacher-ican.vercel.app/api/teacher/api/v1/api/teacher";

      // Test API endpoint first with GET method (HEAD not supported)
      try {
        const testResponse = await fetch(`${apiBase}/products?page=SCHEDULE`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(15000), // 15 second timeout
        });

        if (testResponse.status === 401) {
          throw new Error(
            "Token expired or invalid. Please ask the user to refresh their token."
          );
        } else if (testResponse.status === 403) {
          throw new Error(
            "Access denied. The user's token may not have sufficient permissions."
          );
        } else if (testResponse.status >= 500) {
          throw new Error("Server error. Please try again later.");
        }
      } catch (error) {
        if (error.name === "AbortError") {
          throw new Error(
            "API request timed out. The server is taking too long to respond. Please try again later."
          );
        }
        if (
          error.message.includes("Token expired") ||
          error.message.includes("Access denied")
        ) {
          throw error;
        }
        // If it's a network error, continue with the actual request
      }

      // Get products first
      const productsResponse = await fetch(
        `${apiBase}/products?page=SCHEDULE`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!productsResponse.ok) {
        throw new Error(`Products API error: ${productsResponse.status}`);
      }

      // Check if response is JSON
      const contentType = productsResponse.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await productsResponse.text();
        throw new Error(
          `Invalid response format. Expected JSON but got: ${textResponse.substring(
            0,
            100
          )}...`
        );
      }

      const productsData = await productsResponse.json();
      const productIds = productsData.data.map((item) => item.id);

      // Generate date ranges for the custom date range (same logic as TeacherStats.js)
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // Start of day

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day

      const dateRanges = [];
      let currentDate = start;

      while (currentDate <= end) {
        const toDate = new Date(currentDate);
        toDate.setDate(toDate.getDate() + 6); // 7-day chunks

        if (toDate > end) {
          toDate.setTime(end.getTime()); // Use the end date with 23:59:59
        } else {
          toDate.setHours(23, 59, 59, 999);
        }

        dateRanges.push({
          from: currentDate.toISOString(),
          to: toDate.toISOString(),
        });

        currentDate = new Date(toDate);
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(0, 0, 0, 0);
      }

      // Get shifts for each date range
      const shiftPromises = dateRanges.map((dateRange) => {
        const params = new URLSearchParams({
          "status[]": "ACTIVE",
          fromDate: dateRange.from,
          toDate: dateRange.to,
        });

        const productIdsQuery = productIds
          .map((id) => `product_ids[]=${id}`)
          .join("&");

        return fetch(`${apiBase}/shifts?${params}&${productIdsQuery}`, {
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
        });
      });

      const shiftsResponses = await Promise.all(shiftPromises);

      // Check each response and handle errors
      const shiftsResults = await Promise.all(
        shiftsResponses.map(async (response, index) => {
          if (!response.ok) {
            throw new Error(
              `Shifts API error ${index + 1}: ${response.status}`
            );
          }

          // Check if response is JSON
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            const textResponse = await response.text();
            throw new Error(
              `Invalid shifts response format ${
                index + 1
              }. Expected JSON but got: ${textResponse.substring(0, 100)}...`
            );
          }

          return response.json();
        })
      );

      const allShifts = shiftsResults.flatMap((result) => result.data);
      const finishedClasses = allShifts.filter(
        (classItem) => classItem.classStatus === "FINISHED"
      );

      // Get diary details for finished classes using pLimit (same as TeacherStats.js)
      const limit = pLimit(5); // Limit to 5 concurrent requests (same as TeacherStats.js)

      const diaryPromises = finishedClasses.map((classItem, index) =>
        limit(async () => {
          try {
            const response = await fetch(
              `https://api-teacher-ican.vercel.app/api/teacher/api/v1/api/diary/${classItem.classSessionId}`,
              {
                headers: {
                  Authorization: `Bearer ${userToken}`,
                  "Content-Type": "application/json",
                },
                // Add timeout to prevent hanging requests
                signal: AbortSignal.timeout(30000), // 30 second timeout
              }
            );

            if (!response.ok) {
              if (response.status === 404) {
                console.warn(
                  `📭 Diary not found for class ${index + 1}: ${
                    classItem.classSessionId
                  }`
                );
                return null; // Return null for 404, don't throw error (same as TeacherStats.js)
              }

              // Handle other HTTP errors gracefully
              if (response.status >= 500) {
                console.warn(
                  `⚠️ Server error for diary ${index + 1}: ${response.status}`
                );
                return null;
              }

              throw new Error(
                `Diary API error ${index + 1}: ${response.status}`
              );
            }

            // Check if response is JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
              const textResponse = await response.text();
              console.warn(
                `❌ Invalid content type for diary ${
                  index + 1
                }: ${textResponse.substring(0, 100)}...`
              );
              return null; // Return null instead of throwing error
            }

            return await response.json();
          } catch (error) {
            // Handle network errors, timeouts, and other issues gracefully
            if (error.name === "AbortError") {
              console.warn(
                `⏰ Diary request timeout for class ${index + 1}: ${
                  classItem.classSessionId
                }`
              );
              return null;
            }

            if (
              error.message.includes("Failed to fetch") ||
              error.message.includes("CORS")
            ) {
              console.warn(
                `🚫 Network/CORS error for diary ${index + 1}: ${
                  classItem.classSessionId
                }`
              );
              return null;
            }

            console.error(`💥 Unexpected error for diary ${index + 1}:`, error);
            return null; // Return null instead of throwing error
          }
        })
      );

      // Wait for all diary requests to complete
      const diaryResults = await Promise.all(diaryPromises);

      // Calculate stats (same logic as monthly)
      let totalFinishedCount = finishedClasses.length;
      let totalParticipationScore = 0;
      let allAbsentStudents = [];
      let processedDiaries = 0;
      let skippedDiaries = 0;

      diaryResults.forEach((diaryData, index) => {
        if (diaryData && diaryData.data && diaryData.data.details) {
          processedDiaries++;

          // Use same calculation logic as TeacherStats.js StatsCalculator.calculateParticipationScore
          const details = diaryData.data.details;
          const classData = {
            fromDate: finishedClasses[index].fromDate,
            className: finishedClasses[index].className,
          };

          // Check for duplicate entries to avoid counting same absence multiple times
          const isDuplicate = (newEntry) => {
            return allAbsentStudents.some(
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
              totalParticipationScore += 0.5;
              const combinedStudentNames = absentDetails
                .map((detail) => detail.studentName)
                .join(" + ");

              const newEntry = {
                studentName: combinedStudentNames,
                fromDate: classData.fromDate,
                className: classData.className,
              };

              if (!isDuplicate(newEntry)) {
                allAbsentStudents.push(newEntry);
              }
            }
          } else {
            details.forEach((detail) => {
              if (detail.isParticipated === false) {
                totalParticipationScore += 0.5;

                const newEntry = {
                  studentName: detail.studentName,
                  fromDate: classData.fromDate,
                  className: classData.className,
                };

                if (!isDuplicate(newEntry)) {
                  allAbsentStudents.push(newEntry);
                }
              }
            });
          }
        } else if (diaryData === null) {
          skippedDiaries++;
          console.log(`📭 Skipped diary ${index + 1} due to missing data`);
        }
      });

      // Log summary for debugging (same as TeacherStats.js)
      console.log(
        `📊 Date Range Diary Processing: ${processedDiaries} processed, ${skippedDiaries} skipped out of ${diaryResults.length} total`
      );

      const totalClasses = totalFinishedCount - totalParticipationScore;
      const totalMoney = totalClasses * 50000;

      const result = {
        totalFinishedCount,
        totalParticipationScore,
        totalClasses,
        totalMoney,
        absentStudents: allAbsentStudents,
        startDate,
        endDate,
        userEmail: selectedUserForDetails,
        timestamp: new Date().toISOString(),
        type: "date_range",
        // Additional info for debugging
        processedDiaries,
        skippedDiaries,
        totalDiaries: diaryResults.length,
      };

      setUserStatsResult(result);

      // Save to Firestore for admin requests
      try {
        await setDoc(
          doc(
            db,
            "admin_user_stats",
            `${selectedUserForDetails}_${startDate}_${endDate}_range`
          ),
          {
            ...result,
            requestedBy: user.email,
            requestedAt: new Date().toISOString(),
          }
        );
      } catch (e) {
        console.error("Error saving to Firestore:", e);
      }
    } catch (error) {
      console.error("Error fetching user stats by date range:", error);
      setUserStatsResult({
        error: error.message,
        userEmail: selectedUserForDetails,
        startDate,
        endDate,
        type: "date_range",
      });
    } finally {
      setUserStatsLoading(false);
    }
  };

  // NEW: Fetch user details from mail_teacher collection
  const fetchUserDetails = async (userEmail) => {
    try {
      const userDoc = doc(db, "mail_teacher", userEmail);
      const userSnapshot = await getDoc(userDoc);

      if (userSnapshot.exists()) {
        setUserDetails(userSnapshot.data());
      } else {
        setUserDetails(null);
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      setUserDetails(null);
    }
  };

  // NEW: Handle user selection
  const handleUserSelect = async (userEmail) => {
    setSelectedUser(userEmail);
    setUserDetails(null);
    setTokenRequestResult(null);
    await fetchUserDetails(userEmail);
    setShowUserModal(true);
  };

  // NEW: Handle user selection for details
  const handleUserSelectForDetails = async (userEmail) => {
    setSelectedUserForDetails(userEmail);
    setUserStatsResult(null);
    setShowUserDetailsModal(true);
  };

  const filteredStats = teacherStats.filter((stat) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      stat.email?.toLowerCase().includes(searchLower) ||
      stat.phone?.toLowerCase().includes(searchLower) ||
      stat.className?.toLowerCase().includes(searchLower)
    );
  });

  // NEW: Filter user list
  const filteredUserList = userList.filter((user) => {
    const searchLower = userSearchTerm.toLowerCase();
    return user.email?.toLowerCase().includes(searchLower);
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";

    if (typeof timestamp === "string") {
      return new Date(timestamp).toLocaleString("vi-VN");
    }

    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString("vi-VN");
    }

    return "Invalid date";
  };

  const formatCurrency = (amount) => {
    if (!amount) return "0 VND";
    return amount.toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND",
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              🔐 Admin Login
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Access teacher statistics dashboard
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                📊 Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Overview */}
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">👥</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Teachers
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {teacherStats.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">📈</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Classes
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {teacherStats.reduce(
                          (sum, stat) => sum + (stat.totalClasses || 0),
                          0
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">💰</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Amount
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatCurrency(
                          teacherStats.reduce(
                            (sum, stat) => sum + (stat.totalMoney || 0),
                            0
                          )
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">👀</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Visitors
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {visitorStats?.total || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white shadow rounded-lg">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab("users")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "users"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Details User
                </button>
                <button
                  onClick={() => setActiveTab("teachers")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "teachers"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Teacher Statistics
                </button>
                <button
                  onClick={() => setActiveTab("visitors")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "visitors"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Visitor Analytics
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === "users" && (
                <div>
                  {/* User List Search and Actions */}
                  <div className="mb-6 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Search by email..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={fetchUserList}
                      disabled={userListLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {userListLoading ? "🔄" : "🔄 Refresh"}
                    </button>
                  </div>

                  {/* User List */}
                  {userListLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600"
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
                        Loading users...
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Last Login
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Month/Year
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredUserList.map((user, index) => (
                            <tr
                              key={`${user.id}-${index}`}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.email || "N/A"}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {user.phone || "No phone"}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(user.timestamp)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {user.month}/{user.year}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <button
                                  onClick={() =>
                                    handleUserSelectForDetails(user.email)
                                  }
                                  className="text-blue-600 hover:text-blue-900 font-medium"
                                >
                                  📊 View Stats
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {filteredUserList.length === 0 && !userListLoading && (
                    <div className="text-center py-8 text-gray-500">
                      {userSearchTerm
                        ? "No users found for your search."
                        : "No users available."}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "teachers" && (
                <div>
                  {/* Search and Sort Controls */}
                  <div className="mb-6 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Search by email, phone, or class name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="timestamp">Date</option>
                        <option value="email">Email</option>
                        <option value="totalClasses">Classes</option>
                        <option value="totalMoney">Amount</option>
                      </select>
                      <button
                        onClick={() =>
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                        }
                        className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </button>
                    </div>
                  </div>

                  {/* Teacher Stats Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Teacher
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Period
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Classes
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Absences
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Effective
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Updated
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredStats.map((stat, index) => (
                          <tr
                            key={`${stat.id}-${index}`}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {stat.email || "N/A"}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {stat.phone || "No phone"}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  stat.type === "monthly"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {stat.type === "monthly"
                                  ? "Monthly"
                                  : "Date Range"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {stat.type === "monthly"
                                ? `${stat.month}/${stat.year}`
                                : stat.startDate && stat.endDate
                                ? `${stat.startDate} → ${stat.endDate}`
                                : "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {stat.totalFinishedCount || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {stat.totalParticipationScore || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {stat.totalClasses || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(stat.totalMoney || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(stat.timestamp)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <button
                                onClick={() => handleUserSelect(stat.email)}
                                className="text-blue-600 hover:text-blue-900 font-medium"
                              >
                                👁️ View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredStats.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm
                        ? "No results found for your search."
                        : "No teacher statistics available."}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "visitors" && (
                <div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-4">
                      📊 Visitor Analytics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-blue-700 mb-2">
                          Total Visitors:
                        </p>
                        <p className="text-3xl font-bold text-blue-900">
                          {visitorStats?.total || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 mb-2">
                          Last Updated:
                        </p>
                        <p className="text-sm text-blue-900">
                          {visitorStats?.updatedAt
                            ? formatDate(visitorStats.updatedAt)
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NEW: User Details Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  👤 User Details: {selectedUser}
                </h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* User Information */}
              {userDetails && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">
                    📋 User Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Email:</span>{" "}
                      {userDetails.email}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span>{" "}
                      {userDetails.phone || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Last Login:</span>{" "}
                      {formatDate(userDetails.timestamp)}
                    </div>
                    <div>
                      <span className="font-medium">Month/Year:</span>{" "}
                      {userDetails.month}/{userDetails.year}
                    </div>
                  </div>

                  {/* Token Display */}
                  <div className="mt-4">
                    <span className="font-medium text-sm">🔑 Token:</span>
                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono break-all">
                      {userDetails.token || "No token available"}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW: User Stats Modal */}
      {showUserDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-10 mx-auto w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-white text-2xl">📊</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        User Statistics
                      </h3>
                      <p className="text-blue-100 text-sm">
                        {selectedUserForDetails}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUserDetailsModal(false)}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white hover:text-gray-100 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Date Selection Toggle */}
              <div className="px-8 py-6">
                <div className="mb-6">
                  <h4 className="font-bold text-xl mb-4 text-center text-gray-800">
                    📅 Select Date Range or Month/Year
                  </h4>

                  {/* Toggle between Monthly and Date Range */}
                  <div className="flex mb-6 shadow rounded-lg overflow-hidden border border-gray-200">
                    <button
                      onClick={() => setUseDateRange(false)}
                      className={`flex-1 px-6 py-3 text-lg font-medium transition-colors duration-200 ${
                        !useDateRange
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      📅 By Month
                    </button>
                    <button
                      onClick={() => setUseDateRange(true)}
                      className={`flex-1 px-6 py-3 text-lg font-medium transition-colors duration-200 ${
                        useDateRange
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      📊 By Date Range
                    </button>
                  </div>
                </div>

                {/* Monthly Selection */}
                {!useDateRange && (
                  <div className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span className="text-blue-500">📅</span>
                          Month:
                        </label>
                        <select
                          value={selectedMonth}
                          onChange={(e) =>
                            setSelectedMonth(parseInt(e.target.value))
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span className="text-green-500">📆</span>
                          Year:
                        </label>
                        <select
                          value={selectedYear}
                          onChange={(e) =>
                            setSelectedYear(parseInt(e.target.value))
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                    </div>
                  </div>
                )}

                {/* Date Range Selection */}
                {useDateRange && (
                  <div className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span className="text-green-500">📅</span>
                          Start Date:
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          max={endDate}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span className="text-red-500">📆</span>
                          End Date:
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          ⏰ End time will be set to 23:59:59 of the selected
                          date
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Date Range Info */}
                {useDateRange && startDate && endDate && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <div className="text-center">
                      <h5 className="font-bold text-blue-900 mb-2 flex items-center justify-center gap-2">
                        <span>📅</span>
                        Selected Date Range
                      </h5>
                      <div className="bg-white rounded-lg p-3 mb-2">
                        <p className="text-blue-800 font-medium">
                          {new Date(startDate).toLocaleDateString("vi-VN")}{" "}
                          <span className="text-blue-600 font-bold">00:00</span>
                          {" → "}
                          {new Date(endDate).toLocaleDateString("vi-VN")}{" "}
                          <span className="text-blue-600 font-bold">23:59</span>
                        </p>
                      </div>
                      {(() => {
                        const start = new Date(startDate);
                        const end = new Date(endDate);
                        const days =
                          Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                        return (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
                            <span className="text-blue-700 text-xs font-medium">
                              📊 Total: {days} day{days !== 1 ? "s" : ""}
                            </span>
                            <span className="text-blue-500 text-xs">
                              (from start of first day to end of last day)
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    // Find user token from userList
                    const user = userList.find(
                      (u) => u.email === selectedUserForDetails
                    );
                    if (user?.token) {
                      if (useDateRange) {
                        fetchUserStatsByDateRange(
                          user.token,
                          startDate,
                          endDate
                        );
                      } else {
                        fetchUserStats(user.token, selectedMonth, selectedYear);
                      }
                    }
                  }}
                  disabled={
                    userStatsLoading ||
                    (useDateRange && (!startDate || !endDate))
                  }
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
                >
                  {userStatsLoading ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg
                        className="animate-spin h-6 w-6 text-white"
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
                      <span>Fetching Stats... (30-60s)</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>📊</span>
                      Fetch Statistics{" "}
                      {useDateRange ? "for Date Range" : "for Month"}
                    </span>
                  )}
                </button>
              </div>

              {/* User Stats Result */}
              {userStatsResult && (
                <div className="px-8 py-6">
                  <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl border border-green-200 shadow-lg">
                    <h4 className="font-bold text-xl text-green-900 mb-4 text-center">
                      📊 Statistics Result
                    </h4>

                    {/* Period Info */}
                    <div className="mb-4 p-3 bg-white rounded-lg border border-green-200">
                      {userStatsResult.type === "date_range" && (
                        <div className="text-center">
                          <span className="text-sm text-green-700 font-medium">
                            📅 Date Range:{" "}
                            {new Date(
                              userStatsResult.startDate
                            ).toLocaleDateString("vi-VN")}{" "}
                            <span className="text-green-600 font-bold">
                              00:00
                            </span>{" "}
                            →{" "}
                            {new Date(
                              userStatsResult.endDate
                            ).toLocaleDateString("vi-VN")}{" "}
                            <span className="text-green-600 font-bold">
                              23:59
                            </span>
                          </span>
                        </div>
                      )}
                      {!userStatsResult.type && (
                        <div className="text-center">
                          <span className="text-sm text-green-700 font-medium">
                            📅 Month: {userStatsResult.month}/
                            {userStatsResult.year}
                          </span>
                        </div>
                      )}
                    </div>

                    {userStatsResult.error ? (
                      <div className="text-red-600 text-sm">
                        ❌ Error: {userStatsResult.error}
                        {userStatsResult.error.includes("Token expired") && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                            💡 <strong>Solution:</strong> Ask the user to
                            refresh their token by logging in again to the
                            teacher platform.
                          </div>
                        )}
                        {userStatsResult.error.includes(
                          "Invalid response format"
                        ) && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                            💡 <strong>Solution:</strong> The API returned HTML
                            instead of JSON. This usually means the token is
                            invalid or expired.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium">Total Classes:</span>{" "}
                            {userStatsResult.totalFinishedCount}
                          </div>
                          <div>
                            <span className="font-medium">Absences:</span>{" "}
                            {userStatsResult.totalParticipationScore}
                          </div>
                          <div>
                            <span className="font-medium">
                              Effective Classes:
                            </span>{" "}
                            {userStatsResult.totalClasses}
                          </div>
                          <div>
                            <span className="font-medium">Total Amount:</span>{" "}
                            {formatCurrency(userStatsResult.totalMoney)}
                          </div>
                        </div>

                        {/* Additional debug info */}
                        {userStatsResult.totalDiaries && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                            <div className="grid grid-cols-3 gap-2 text-gray-600">
                              <div>
                                <span className="font-medium">Diaries:</span>{" "}
                                {userStatsResult.processedDiaries}/
                                {userStatsResult.totalDiaries}
                              </div>
                              <div>
                                <span className="font-medium">Skipped:</span>{" "}
                                {userStatsResult.skippedDiaries}
                              </div>
                              <div>
                                <span className="font-medium">
                                  Success Rate:
                                </span>{" "}
                                {Math.round(
                                  (userStatsResult.processedDiaries /
                                    userStatsResult.totalDiaries) *
                                    100
                                )}
                                %
                              </div>
                            </div>
                          </div>
                        )}

                        {userStatsResult.absentStudents &&
                          userStatsResult.absentStudents.length > 0 && (
                            <div className="mt-6">
                              <h3 className="font-bold text-lg mb-4 text-center text-gray-800">
                                📋 Absent Students Report
                              </h3>

                              {/* Desktop Table View */}
                              <div className="hidden md:block">
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse border border-gray-300 rounded-lg overflow-hidden shadow-lg">
                                    <thead className="bg-blue-600 text-white">
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
                                    <tbody className="bg-white text-gray-800">
                                      {userStatsResult.absentStudents
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
                                                ? "bg-gray-50"
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
                                  {userStatsResult.absentStudents
                                    .sort(
                                      (a, b) =>
                                        new Date(b.fromDate) -
                                        new Date(a.fromDate)
                                    )
                                    .map((student, index) => (
                                      <div
                                        key={`${student.fromDate}-${index}`}
                                        className="p-4 border rounded-lg shadow-md bg-white border-gray-200 text-gray-800 hover:shadow-lg transition-shadow duration-200"
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1">
                                            <div className="flex items-center mb-2">
                                              <span className="text-blue-500 mr-2">
                                                📚
                                              </span>
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
                                              <span className="text-red-500 mr-2">
                                                👤
                                              </span>
                                              <p className="font-medium">
                                                {student.studentName}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end px-8 py-6 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={() => setShowUserDetailsModal(false)}
                  className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transform hover:scale-105 transition-all duration-200 shadow-md"
                >
                  ✕ Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
