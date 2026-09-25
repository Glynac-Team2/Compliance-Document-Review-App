import { LogOut, ShieldCheck, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Header({ name, logout, role }) {
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={
              role === "officer"
                ? "p-2.5 bg-indigo-950 rounded-xl text-white shadow-md"
                : role === "admin"
                  ? "p-2.5 bg-amber-600 rounded-xl text-white shadow-md shadow-amber-600/20"
                  : "p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-600/20"
            }
          >
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Compliance Portal
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {role[0].toUpperCase() + role.slice(1)} Workspace
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 px-3.5 py-2 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
            <User className="w-3.5 h-3.5 text-indigo-600" />
            <span>{name}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
