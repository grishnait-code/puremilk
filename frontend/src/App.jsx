import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Deliveries from "./pages/Deliveries";
import Enterprises from "./pages/Enterprises";
import Enterprise from "./pages/Enterprise";
import Audits from "./pages/Audits";
import Analytics from "./pages/Analytics";
import GradeStandards from "./pages/GradeStandards";
import Import from "./pages/Import";
import Users from "./pages/Users";
import Processors from "./pages/Processors";
import Processor from "./pages/Processor";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="*"
        element={
          <ProtectedRoute>
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
                <Route path="/processors" element={<Processors />} />
                <Route path="/processor/:id" element={<Processor />} />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Users />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
