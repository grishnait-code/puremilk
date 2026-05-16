import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Deliveries from "./pages/Deliveries";
import Enterprises from "./pages/Enterprises";
import Enterprise from "./pages/Enterprise";
import Audits from "./pages/Audits";
import Analytics from "./pages/Analytics";
import GradeStandards from "./pages/GradeStandards";
import Import from "./pages/Import";

export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f6fa" }}>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/deliveries" replace />} />
        <Route path="/deliveries" element={<Deliveries />} />
        <Route path="/enterprises" element={<Enterprises />} />
        <Route path="/enterprise/:id" element={<Enterprise />} />
        <Route path="/audits" element={<Audits />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/grade-standards" element={<GradeStandards />} />
        <Route path="/import" element={<Import />} />
      </Routes>
    </div>
  );
}
