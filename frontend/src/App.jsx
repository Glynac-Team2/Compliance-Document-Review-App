import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import Layout from "./components/Layout";
import RequireRole from "./components/RequireRole";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdvisorDashboard from "./pages/AdvisorDashboard";
import OfficerDashboard from "./pages/OfficerDashboard";

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "officer" ? "/officer" : "/advisor"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/advisor"
            element={
              <RequireRole role="advisor">
                <Layout>
                  <AdvisorDashboard />
                </Layout>
              </RequireRole>
            }
          />
          <Route
            path="/officer"
            element={
              <RequireRole role="officer">
                <Layout>
                  <OfficerDashboard />
                </Layout>
              </RequireRole>
            }
          />
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
