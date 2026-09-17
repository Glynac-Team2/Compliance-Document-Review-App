import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdvisorDashboard from './pages/AdvisorDashboard';
import OfficerDashboard from './pages/OfficerDashboard'; // 1. Ensure this import exists

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/advisor" element={<AdvisorDashboard />} />
        <Route path="/officer" element={<OfficerDashboard />} /> {/* 2. Ensure this route exists */}
      </Routes>
    </Router>
  );
}