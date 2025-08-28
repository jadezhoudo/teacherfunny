import "./App.css";
import "./TeacherStats.js";
import TeacherStats from "./TeacherStats";
import AdminDashboard from "./components/AdminDashboard";
import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";

// Navigation Component
const Navigation = () => {
  const location = useLocation();

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Teacher Tracking System
            </h1>
          </div>
          <nav className="flex space-x-4">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === "/"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              👨‍🏫 Teacher Stats
            </Link>
            <Link
              to="/administrator"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === "/administrator"
                  ? "bg-green-100 text-green-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              🔐 Admin Dashboard
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (token) {
      localStorage.setItem("teacher_token", token);

      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  return (
    <Router>
      <div className="App">
        {/* <Navigation /> */}
        <Routes>
          <Route path="/" element={<TeacherStats />} />
          <Route path="/administrator" element={<AdminDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
