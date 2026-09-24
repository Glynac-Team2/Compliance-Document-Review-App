import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import AuthVisual from "../components/AuthVisual";
import { api } from "../lib/api";

const MIN_LENGTH = 8;

const inputClass =
  "w-full rounded-full border-[1.5px] border-slate-200 px-[18px] py-[13px] text-[14.5px] text-[#14121F] placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10";

export default function ResetPassword() {
  const [params] = useSearchParams();
  // Read once into state so we can strip it from the address bar below.
  const [token] = useState(() => params.get("token"));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const navigate = useNavigate();

  const invalid = !token || expired;

  useEffect(() => {
    // Keep the token out of the address bar and browser history.
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname,
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      navigate("/login", { replace: true, state: { resetSuccess: true } });
    } catch (err) {
      if (err.status === 400) {
        setExpired(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen p-4 lg:p-7 gap-4">
        <div className="lg:col-span-6 flex flex-col">
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

          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-[360px]">
              {invalid ? (
                <div className="space-y-4">
                  <h1
                    className="text-2xl font-bold tracking-tight text-[#14121F]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Link invalid or expired
                  </h1>
                  <p className="text-[14px] text-slate-600">
                    Reset links work once and expire after 30 minutes. Go back
                    to sign in and choose &quot;Forgot password?&quot; to get a
                    new one.
                  </p>
                  <Link
                    to="/login"
                    className="inline-block text-sm font-semibold text-indigo-600 hover:underline"
                  >
                    Back to sign in
                  </Link>
                </div>
              ) : (
                <>
                  <h1
                    className="mb-6 text-2xl font-bold tracking-tight text-[#14121F]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Choose a new password
                  </h1>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="mb-2 block text-[13px] font-medium text-slate-600">
                        New password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={MIN_LENGTH}
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[13px] font-medium text-slate-600">
                        Confirm password
                      </label>
                      <input
                        type="password"
                        required
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Re-enter password"
                        className={inputClass}
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
                      {loading ? "Saving..." : "Reset password"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>

        <AuthVisual />
      </div>
    </div>
  );
}
