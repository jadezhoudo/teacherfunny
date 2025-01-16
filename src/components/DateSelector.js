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
