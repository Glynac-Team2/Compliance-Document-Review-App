import { createContext, useContext, useState, useCallback } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  const persist = (token, id, role, name) => {
    localStorage.setItem("token", token);
    const u = { id, role, name };
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  };

  const login = useCallback(async (email, password) => {
    const res = await api.login({ email, password });
    persist(res.access_token, res.id, res.role, res.name);
    return res;
  }, []);

  const signup = useCallback(async (email, name, password, role) => {
    const res = await api.signup({ email, name, password, role });
    persist(res.access_token, res.id, res.role, res.name);
    return res;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
