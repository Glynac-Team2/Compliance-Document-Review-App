import React from "react";
import { ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh" }}>
      <div className="border-b" style={{ borderColor: "#D7DCE3", background: "#FFFFFF" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md" style={{ background: "#1F3157" }}>
              <ShieldCheck size={16} color="#FFFFFF" />
            </div>
            <span style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 600, fontSize: "18px" }}>
              Compliance Review
            </span>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm" style={{ color: "#5B6472" }}>
                {user.name} \u00b7 <span className="capitalize">{user.role}</span>
              </span>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="flex items-center gap-1.5 text-sm font-medium"
                style={{ color: "#5B6472" }}
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
