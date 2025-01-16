import "./App.css";
import "./TeacherStats.js";
import TeacherStats from "./TeacherStats";
import React, { useEffect } from "react";

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
    <div className="App">
      <TeacherStats />
    </div>
  );
}

export default App;
