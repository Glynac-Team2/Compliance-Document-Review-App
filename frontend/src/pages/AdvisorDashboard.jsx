import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  UploadCloud, 
  Clock, 
  CheckCircle2, 
  LogOut, 
  User, 
  FileCheck, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

export default function AdvisorDashboard() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // Mock submissions state matching your current UI
  const [submissions, setSubmissions] = useState([
    { id: 1, name: 'micro1 - First Hackathon97ec7c5.pdf', time: 'Just now', status: 'Pending' },
    { id: 2, name: 'SEO Link Building Report – Idongesit Udo.xlsx', time: 'Submitted Sept 17, 2026 • 3:36 PM', status: 'Pending' },
    { id: 3, name: 'Idongesit_Udo_Resume_micro1.pdf', time: 'Submitted Sept 17, 2026 • 3:36 PM', status: 'Approved' },
  ]);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setTimeout(() => {
      const newSub = {
        id: Date.now(),
        name: selectedFile.name,
        time: 'Just now',
        status: 'Pending'
      };
      setSubmissions([newSub, ...submissions]);
      setUploading(false);
      setSelectedFile(null);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 4000);
    }, 1000);
  };

  const pendingCount = submissions.filter(s => s.status === 'Pending').length;
  const approvedCount = submissions.filter(s => s.status === 'Approved').length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-600/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Compliance Portal</h1>
              <p className="text-xs text-slate-500 font-medium">Advisor Workspace</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 px-3.5 py-2 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span>Test Advisor</span>
            </div>
            <a 
              href="/login" 
              className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </a>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Metric Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Total Submissions */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Submissions</p>
              <h3 className="text-3xl font-extrabold text-slate-900">{submissions.length}</h3>
            </div>
            <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          {/* Pending Review */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Pending Review</p>
              <h3 className="text-3xl font-extrabold text-amber-600">{pendingCount}</h3>
            </div>
            <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-2xl text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Approved */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Approved</p>
              <h3 className="text-3xl font-extrabold text-emerald-600">{approvedCount}</h3>
            </div>
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* Content Grid: Submit Section + Submissions List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Side: Upload Widget */}
          <div className="lg:col-span-5 bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="space-y-6">
              
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">AI Verification Ready</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">Submit a Document</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Automated AI compliance screening will run before officer review.
                </p>
              </div>

              {successMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-medium flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Document uploaded and queued for screening successfully!</span>
                </div>
              )}

              <form onSubmit={handleUpload} className="space-y-4">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/30 rounded-2xl p-8 cursor-pointer transition-all group">
                  <div className="p-4 bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 rounded-2xl mb-3 transition-colors shadow-sm">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600">
                    {selectedFile ? selectedFile.name : 'Click to upload or drag & drop'}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">PDF, DOCX, XLSX (Max 10MB)</span>
                  <input type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.docx,.xlsx" />
                </label>

                <button 
                  type="submit" 
                  disabled={!selectedFile || uploading}
                  className={`w-full py-3.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center space-x-2 shadow-md ${
                    !selectedFile 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 cursor-pointer'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{uploading ? 'Processing AI Screening...' : 'Submit for Review'}</span>
                </button>
              </form>

            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center space-x-2 text-xs text-slate-400">
              <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>Files are encrypted end-to-end according to compliance policy.</span>
            </div>
          </div>

          {/* Right Side: Submissions List */}
          <div className="lg:col-span-7 bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Your Submissions</h2>
                <p className="text-xs text-slate-500">Track real-time review status of uploaded documents.</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                {submissions.length} Total
              </span>
            </div>

            <div className="space-y-3">
              {submissions.map((sub) => (
                <div 
                  key={sub.id} 
                  className="flex items-center justify-between p-4 bg-slate-50/60 hover:bg-slate-50 border border-slate-200/60 rounded-xl transition-all"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 truncate">{sub.name}</h4>
                      <p className="text-xs text-slate-400">{sub.time}</p>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-4">
                    {sub.status === 'Pending' ? (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 border border-amber-200/60 text-amber-700 text-xs font-semibold rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        <span>Pending</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Approved</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}