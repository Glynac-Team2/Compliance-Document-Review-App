import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, User, ArrowRight, CheckCircle, Sparkles, Briefcase, ShieldAlert } from 'lucide-react';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('advisor'); // Default to advisor
  const [loading, setLoading] = useState(false);

  const handleSignup = (e) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      // Route based on selected role
      if (role === 'officer') {
        window.location.href = '/officer';
      } else {
        window.location.href = '/advisor';
      }
    }, 800);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50 font-sans">
      
      {/* Left Column: Branding Banner */}
      <div className="lg:col-span-6 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 p-10 lg:p-16 flex flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center space-x-3 relative z-10">
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-white shadow-xl">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Compliance Portal</h1>
            <p className="text-xs text-indigo-200/80">Automated Document & Risk Review</p>
          </div>
        </div>

        <div className="space-y-6 my-auto relative z-10 py-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Workspace Registration</span>
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
            Join the automated workspace for secure document verification.
          </h2>
          
          <p className="text-indigo-100/80 text-sm lg:text-base leading-relaxed">
            Register your profile as an advisor to submit compliance files, or as a compliance officer to review and verify incoming documentation.
          </p>

          <div className="space-y-3 pt-2">
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

        <div className="text-xs text-indigo-300/60 relative z-10">
          © {new Date().getFullYear()} Compliance Review Workspace. All rights reserved.
        </div>
      </div>

      {/* Right Column: Signup Form with Role Picker */}
      <div className="lg:col-span-6 flex items-center justify-center p-8 lg:p-16 bg-white">
        <div className="w-full max-w-md space-y-6">
          
          <div className="space-y-2 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Create an account</h2>
              <p className="text-sm text-slate-500">Select your role and enter your details.</p>
            </div>
            <a href="/login" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
              Sign in
            </a>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            
            {/* Role Selector Cards */}
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Select Role</label>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setRole('advisor')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col space-y-1 cursor-pointer ${
                    role === 'advisor' 
                      ? 'border-indigo-600 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-600' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Briefcase className={`w-4 h-4 ${role === 'advisor' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <input type="radio" checked={role === 'advisor'} readOnly className="accent-indigo-600" />
                  </div>
                  <span className={`text-xs font-bold ${role === 'advisor' ? 'text-indigo-950' : 'text-slate-700'}`}>Advisor</span>
                  <span className="text-[10px] text-slate-400 leading-tight">Submit & track documents</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('officer')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col space-y-1 cursor-pointer ${
                    role === 'officer' 
                      ? 'border-indigo-600 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-600' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <ShieldAlert className={`w-4 h-4 ${role === 'officer' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <input type="radio" checked={role === 'officer'} readOnly className="accent-indigo-600" />
                  </div>
                  <span className={`text-xs font-bold ${role === 'officer' ? 'text-indigo-950' : 'text-slate-700'}`}>Officer</span>
                  <span className="text-[10px] text-slate-400 leading-tight">Review & verify files</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Idongesit Udo"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === 'officer' ? 'officer@company.com' : 'advisor@company.com'}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 group cursor-pointer mt-2"
            >
              <span>{loading ? 'Creating account...' : `Register as ${role === 'officer' ? 'Compliance Officer' : 'Advisor'}`}</span>
              {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>

          </form>

        </div>
      </div>

    </div>
  );
}