// src/components/DateSelector.js
import React from "react";

const DateSelector = ({ month, year, onMonthChange, onYearChange }) => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex gap-4 justify-center mb-4">
      <select
        value={month}
        onChange={(e) => onMonthChange(parseInt(e.target.value))}
        className="px-2 py-1 rounded-md border border-gray-300"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            {new Date(2024, i).toLocaleString("default", { month: "long" })}
          </option>
        ))}
      </select>

      <select
        value={year}
        onChange={(e) => onYearChange(parseInt(e.target.value))}
        className="px-2 py-1 rounded-md border border-gray-300"
      >
        {Array.from({ length: 2 }, (_, i) => (
          <option key={currentYear - i} value={currentYear - i}>
            {currentYear - i}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DateSelector;

// src/services/api.js
const BASE_URL = "https://api-icc.ican.vn/teacher/api/v1/api";

export const ApiService = {
  async fetchWithAuth(url, bearerToken, options = {}) {
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

  async getProducts(bearerToken) {
    return this.fetchWithAuth(
      `${BASE_URL}/teacher/products?page=SCHEDULE`,
      bearerToken
    );
  },

  async getShifts(bearerToken, dateRange, productIds) {
    const params = new URLSearchParams({
      "status[]": "ACTIVE",
      fromDate: dateRange.from,
      toDate: dateRange.to,
    });

    const productIdsQuery = productIds
      .map((id) => `product_ids[]=${id}`)
      .join("&");
    return this.fetchWithAuth(
      `${BASE_URL}/teacher/shifts?${params}&${productIdsQuery}`,
      bearerToken
    );
  },

  async getDiaryDetails(bearerToken, classSessionId) {
    return this.fetchWithAuth(
      `${BASE_URL}/diary/${classSessionId}`,
      bearerToken
    );
  },
};

// src/utils/dateUtils.js
export const DateUtil = {
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
