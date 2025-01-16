import React, { useState } from "react";

const TeacherStats = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [bearerToken, setBearerToken] = useState("");

  const formatCurrency = (amount) => {
    return amount.toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND",
    });
  };

  const calculateParticipationScore = (details) => {
    let score = 0;
    if (details.length > 1) {
      const absentCount = details.filter(
        (detail) => detail.isParticipated === false
      ).length;
      if (absentCount === 2) score += 0.5;
    } else {
      details.forEach((detail) => {
        if (detail.isParticipated === false) score += 0.5;
      });
    }
    return score;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch products
      const productsResponse = await fetch(
        "https://api-icc.ican.vn/teacher/api/v1/api/teacher/products?page=SCHEDULE",
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      const productsData = await productsResponse.json();
      const productIds = productsData.data.map((item) => item.id);

      // Calculate date range
      const startDate = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
      const endDate = new Date(
        Date.UTC(selectedYear, selectedMonth, 0, 23, 59, 59, 999)
      );

      // Fetch shifts
      const shiftsResponse = await fetch(
        `https://api-icc.ican.vn/teacher/api/v1/api/teacher/shifts?status[]=ACTIVE&fromDate=${startDate.toISOString()}&toDate=${endDate.toISOString()}&${productIds
          .map((id) => `product_ids[]=${id}`)
          .join("&")}`,
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      const shiftsData = await shiftsResponse.json();

      let totalFinishedCount = 0;
      let totalParticipationScore = 0;

      // Process each finished class
      for (const classItem of shiftsData.data) {
        if (classItem.classStatus === "FINISHED") {
          totalFinishedCount++;
          const diaryResponse = await fetch(
            `https://api-icc.ican.vn/teacher/api/v1/api/diary/${classItem.classSessionId}`,
            {
              headers: {
                Authorization: `Bearer ${bearerToken}`,
                "Content-Type": "application/json",
              },
            }
          );
          const diaryData = await diaryResponse.json();
          totalParticipationScore += calculateParticipationScore(
            diaryData.data.details || []
          );
        }
      }

      const totalClasses = totalFinishedCount - totalParticipationScore;
      const totalMoney = totalClasses * 50000;

      setStats({
        totalFinishedCount,
        totalParticipationScore,
        totalClasses,
        totalMoney,
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
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h1 className="text-3xl font-bold text-center mb-8">
                  Teacher Statistics
                </h1>

                <div className="flex gap-4 mb-4">
                  <select
                    className="flex-1 p-2 border rounded"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
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
                    className="flex-1 p-2 border rounded"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  >
                    {[selectedYear, selectedYear - 1].map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  type="text"
                  className="w-full p-2 border rounded mb-4"
                  placeholder="Enter Bearer Token"
                  value={bearerToken}
                  onChange={(e) => setBearerToken(e.target.value)}
                />

                <button
                  onClick={fetchData}
                  disabled={loading || !bearerToken}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                >
                  {loading ? "Processing..." : "Calculate Statistics"}
                </button>

                {error && (
                  <div className="text-red-500 mt-4">Error: {error}</div>
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
                      <strong>Total effective classes:</strong>{" "}
                      {stats.totalClasses}
                    </p>
                    <p>
                      <strong>Total amount:</strong>{" "}
                      {formatCurrency(stats.totalMoney)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherStats;
