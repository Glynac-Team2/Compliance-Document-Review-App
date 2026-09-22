import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../contexts/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <Header name={user.name} logout={logout} role={user.role} />
      <Outlet />
    </div>
  );
}
