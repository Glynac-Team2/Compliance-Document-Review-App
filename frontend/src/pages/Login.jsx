import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import AuthVisual from "../components/AuthVisual";
import { useAuth } from "../contexts/AuthContext";
import { ROLE_HOME } from "../lib/roles";
import { Modal } from "../components/Modal";
import ForgotPasswordForm from "../components/ForgotPasswordForm";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(email, password);
      navigate(ROLE_HOME[res.role] ?? "/advisor", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen p-4 lg:p-7 gap-4">
        {/* Left: form */}
        <div className="lg:col-span-6 flex flex-col">
          {/* wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-[#14121F]">
              <ShieldCheck
                size={14}
                className="text-emerald-400"
                strokeWidth={2.2}
              />
            </div>
            <span
              className="text-[19px] font-bold tracking-tight text-[#14121F]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              compliance.
            </span>
          </div>

          {/* form */}
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-[360px]">
              <div className="mb-6 flex items-baseline justify-between">
                <h1
                  className="text-2xl font-bold tracking-tight text-[#14121F]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Workspace sign in
                </h1>
                <Link
                  to="/signup"
                  className="text-sm font-semibold text-indigo-600 hover:underline"
                >
                  Register
                </Link>
              </div>
              {location.state?.resetSuccess && (
                <p role="status" className="mb-4 text-[13px] text-emerald-600">
                  Password updated. Sign in with your new password.
                </p>
              )}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-slate-600">
                    Your email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full rounded-full border-[1.5px] border-slate-200 px-[18px] py-[13px] text-[14.5px] text-[#14121F] placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[13px] font-medium text-slate-600">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
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
                  className="mt-1 w-full rounded-full bg-indigo-600 py-[14px] text-[14.5px] font-bold text-white transition hover:bg-indigo-700 hover:-translate-y-px disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Continue"}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3.5 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                or
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <button className="flex w-full items-center justify-center gap-2.5 rounded-full border-[1.5px] border-slate-200 bg-white py-3 text-sm font-semibold text-[#14121F] transition hover:border-slate-400 hover:bg-slate-50">
                <GoogleIcon />
                Continue with Google
              </button>

              <p className="mt-5 text-center text-xs text-slate-400">
                Need access? Contact your compliance administrator or
                supervisor.
              </p>
            </div>
          </div>
        </div>

        {/* Right: shared visual */}
        <AuthVisual />
      </div>
      <Modal
        isOpen={showForgot}
        onClose={() => setShowForgot(false)}
        maxWidth="max-w-md"
      >
        <ForgotPasswordForm
          initialEmail={email}
          onClose={() => setShowForgot(false)}
        />
      </Modal>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-[17px] w-[17px]">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.9 32.7 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.6 0-14.1 4.3-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.4C29.6 35.4 27 36 24 36c-5.4 0-9.9-3.3-11.4-8l-6.6 5.1C9.8 39.6 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3-3.5 5.4-6.6 6.9l6.6 5.4C39.1 37.4 44 31.3 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}
