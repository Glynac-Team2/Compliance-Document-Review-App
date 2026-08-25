import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await login(email, password);
      navigate(res.role === "officer" ? "/officer" : "/advisor");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border p-8" style={{ borderColor: "#D7DCE3", background: "#FFFFFF" }}>
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md" style={{ background: "#1F3157" }}>
            <ShieldCheck size={16} color="#FFFFFF" />
          </div>
          <span style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 600, fontSize: "18px" }}>
            Compliance Review
          </span>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "#D7DCE3" }}
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "#D7DCE3" }}
          />
          {error && <p className="text-sm" style={{ color: "#B0453D" }}>{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md py-2.5 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: "#1F3157" }}
          >
            {busy ? "Signing in\u2026" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm" style={{ color: "#5B6472" }}>
          No account? <Link to="/signup" className="font-medium" style={{ color: "#1F3157" }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
