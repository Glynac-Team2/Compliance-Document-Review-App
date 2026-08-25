import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "advisor" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await signup(form.email, form.name, form.password, form.role);
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
            Create account
          </span>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={update("name")}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "#D7DCE3" }}
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={form.email}
            onChange={update("email")}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "#D7DCE3" }}
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={form.password}
            onChange={update("password")}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "#D7DCE3" }}
          />

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#5B6472" }}>
              Role \u2014 fixed at sign-up, cannot be changed later
            </label>
            <div className="flex gap-2">
              {["advisor", "officer"].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setForm((f) => ({ ...f, role: r }))}
                  className="flex-1 rounded-md border py-2 text-sm font-medium capitalize"
                  style={
                    form.role === r
                      ? { background: "#1F3157", color: "#FFFFFF", borderColor: "#1F3157" }
                      : { borderColor: "#D7DCE3", color: "#5B6472" }
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: "#B0453D" }}>{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md py-2.5 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: "#1F3157" }}
          >
            {busy ? "Creating account\u2026" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm" style={{ color: "#5B6472" }}>
          Already have an account? <Link to="/login" className="font-medium" style={{ color: "#1F3157" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
