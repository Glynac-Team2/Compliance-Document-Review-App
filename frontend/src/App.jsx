import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdvisorDashboard from "./pages/AdvisorDashboard";
import OfficerDashboard from "./pages/OfficerDashboard";
import { AuthProvider } from "./contexts/AuthContext";
import RequireRole from "./components/RequireRole";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/advisor"
            element={
              <RequireRole role="advisor">
                <AdvisorDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/officer"
            element={
              <RequireRole role="officer">
                <OfficerDashboard />
              </RequireRole>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
