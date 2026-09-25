import { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Briefcase,
  ShieldAlert,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROLE_HOME } from "../lib/roles";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("advisor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signup(email, name, password, role);
      navigate(ROLE_HOME[res.role] ?? "/advisor", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50 font-sans">
      {/* Left Column: Branding Banner */}
      <div className="lg:col-span-5 bg-indigo-950 p-10 lg:p-12 flex flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-900 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

        <div className="flex items-center space-x-3 relative z-10">
          <div className="p-2.5 bg-indigo-900/60 backdrop-blur-md rounded-2xl border border-indigo-800 text-white shadow-xl">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Compliance Portal
            </h1>
            <p className="text-xs text-indigo-200/80">
              Automated Document & Risk Review
            </p>
          </div>
        </div>

        <div className="space-y-6 my-auto relative z-10 py-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-900/60 border border-indigo-800 text-indigo-200 text-xs font-medium backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Workspace Registration</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
            Join the automated workspace for secure document verification.
          </h2>

          <p className="text-indigo-200/80 text-sm lg:text-base leading-relaxed">
            Register your profile as an advisor to submit compliance files, or
            as a compliance officer to review and verify incoming documentation.
          </p>

          <div className="space-y-3.5 pt-2">
            <div className="flex items-center space-x-3 text-sm text-indigo-100">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Role-based portal access</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-indigo-100">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Automated compliance checks & risk scoring</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-indigo-400/60 relative z-10">
          © {new Date().getFullYear()} Compliance Review Workspace. All rights
          reserved.
        </div>
      </div>

      {/* Right Column: Signup Form with Role Picker */}
      <div className="lg:col-span-7 flex items-center justify-center p-8 lg:p-12 bg-white">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Create an account
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Select your role and enter your details.
              </p>
            </div>
            <Link
              to="/login"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
            >
              Sign in
            </Link>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {/* Role Selector Cards */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Select Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Advisor Card */}
                <div
                  onClick={() => setRole("advisor")}
                  className={`cursor-pointer border rounded-xl p-4 flex flex-col justify-between transition-all relative ${
                    role === "advisor"
                      ? "border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-600/20 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`p-2 rounded-lg ${
                        role === "advisor"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        role === "advisor"
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-slate-300"
                      }`}
                    >
                      {role === "advisor" && (
                        <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                      )}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Advisor</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Submit & track documents
                    </p>
                  </div>
                </div>

                {/* Officer Card */}
                <div
                  onClick={() => setRole("officer")}
                  className={`cursor-pointer border rounded-xl p-4 flex flex-col justify-between transition-all relative ${
                    role === "officer"
                      ? "border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-600/20 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`p-2 rounded-lg ${
                        role === "officer"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        role === "officer"
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-slate-300"
                      }`}
                    >
                      {role === "officer" && (
                        <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                      )}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Officer</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review & verify files
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Idongesit Udo"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    role === "officer"
                      ? "officer@company.com"
                      : "advisor@company.com"
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>
                {loading
                  ? "Creating account..."
                  : `Register as ${
                      role === "officer" ? "Compliance Officer" : "Advisor"
                    }`}
              </span>
              {!loading && (
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}