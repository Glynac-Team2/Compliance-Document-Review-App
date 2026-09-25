import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// This only controls what renders in the browser. The real boundary is
// server-side (`require_role` in the backend) — this exists so an advisor
// doesn't even see officer navigation, not to be the actual security layer.
export default function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (user.role !== role) {
    let location =
      user.role === "officer"
        ? "/officer"
        : user.role === "advisor"
          ? "/advisor"
          : user.role === "admin"
            ? "/admin"
            : "/login";

    return <Navigate to={location} replace />;
  }
  return children;
}
