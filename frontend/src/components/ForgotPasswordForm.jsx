import { useState } from "react";
import { X } from "lucide-react";
import { api } from "../lib/api";

export default function ForgotPasswordForm({ initialEmail = "", onClose }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-start justify-between">
        <h2
          className="text-xl font-bold tracking-tight text-[#14121F]"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Reset your password
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={18} />
        </button>
      </div>

      {sent ? (
        <div className="space-y-4">
          <p className="text-[14px] text-slate-600">
            If an account exists for{" "}
            <span className="font-semibold text-[#14121F]">{email}</span>,
            we&apos;ve sent a reset link. It expires in 30 minutes.
          </p>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Use a different email
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-indigo-600 px-6 py-[10px] text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-[14px] text-slate-600">
            Enter your email and we&apos;ll send you a link to choose a new
            password.
          </p>

          <div>
            <label className="mb-2 block text-[13px] font-medium text-slate-600">
              Your email address
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full rounded-full border-[1.5px] border-slate-200 px-[18px] py-[13px] text-[14.5px] text-[#14121F] placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
            />
          </div>

          {error && (
            <p role="alert" className="text-[13px] text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-indigo-600 py-[14px] text-[14.5px] font-bold text-white transition hover:bg-indigo-700 hover:-translate-y-px disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}
    </div>
  );
}
