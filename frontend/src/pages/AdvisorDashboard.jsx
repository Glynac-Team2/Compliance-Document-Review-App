import { useState, useEffect } from "react";
import {
  FileText,
  UploadCloud,
  Clock,
  CheckCircle2,
  FileCheck,
  Sparkles,
  AlertCircle,
  Moon,
  Sun,
  Search,
  RefreshCw,
} from "lucide-react";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import { StatusPill } from "../components/Badges";

export default function AdvisorDashboard() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Toggle dark mode class on root HTML element
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const loadDocuments = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await api.listDocuments();
      setSubmissions(
        [...data].sort(
          (a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at),
        ),
      );
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load documents.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadError("");
    try {
      const doc = await api.submitDocument(selectedFile);
      setSubmissions((prev) => [doc, ...prev]);
      setSelectedFile(null);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 4000);
    } catch (err) {
      setUploadError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const approvedCount = submissions.filter(
    (s) => s.status === "approved",
  ).length;

  // Filter submissions based on search input
  const filteredSubmissions = submissions.filter((sub) =>
    sub.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to extract file extension badge text
  const getFileExtension = (filename) => {
    const ext = filename.split('.').pop();
    return ext ? ext.toUpperCase() : 'FILE';
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-8 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors">
      
      {/* Top Header Section with Dark Mode Toggle */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Advisor Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage your submissions and monitor AI verification status.
          </p>
        </div>
        <button
          onClick={toggleDarkMode}
          className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-semibold cursor-pointer"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
        </button>
      </div>

      {/* Metric Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Submissions */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden transition-colors">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Total Submissions
            </p>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {submissions.length}
            </h3>
          </div>
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden transition-colors">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Pending Review
            </p>
            <h3 className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {pendingCount}
            </h3>
          </div>
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/50 rounded-2xl text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden transition-colors">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Approved
            </p>
            <h3 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {approvedCount}
            </h3>
          </div>
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Content Grid: Submit Section + Submissions List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Upload Widget */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  AI Verification Ready
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Submit a Document
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Automated AI compliance screening will run before officer
                review.
              </p>
            </div>

            {successMsg && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>
                  Document uploaded and queued for screening successfully!
                </span>
              </div>
            )}

            {uploadError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-medium">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 rounded-2xl p-8 cursor-pointer transition-all group">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-2xl mb-3 transition-colors shadow-sm">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {selectedFile
                    ? selectedFile.name
                    : "Click to upload or drag & drop"}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  PDF, DOCX, XLSX (Max 10MB)
                </span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.docx,.xlsx"
                />
              </label>

              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className={`w-full py-3.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center space-x-2 shadow-md ${
                  !selectedFile
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 cursor-pointer"
                }`}
              >
                <FileCheck className="w-4 h-4" />
                <span>
                  {uploading
                    ? "Processing AI Screening..."
                    : "Submit for Review"}
                </span>
              </button>
            </form>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2 text-xs text-slate-400 dark:text-slate-500">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              Files are encrypted end-to-end according to compliance policy.
            </span>
          </div>
        </div>

        {/* Right Side: Submissions List */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Your Submissions
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track real-time review status of uploaded documents.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => loadDocuments(true)}
                disabled={refreshing}
                title="Refresh Submissions"
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <span className="text-xs font-semibold px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                {submissions.length} Total
              </span>
            </div>
          </div>

          {/* Search Filter Input Bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search submissions by file name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-3">
            {loading && (
              <p className="text-sm text-slate-400 dark:text-slate-500">Loading submissions…</p>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            {!loading && !error && submissions.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500">No submissions yet.</p>
            )}
            {!loading && !error && submissions.length > 0 && filteredSubmissions.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500">No matching submissions found.</p>
            )}
            {filteredSubmissions.map((sub) => {
              return (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-4 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-xl transition-all"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl flex-shrink-0 relative">
                      <FileText className="w-5 h-5" />
                      <span className="absolute -bottom-1 -right-1 text-[9px] font-extrabold px-1 bg-indigo-600 text-white rounded">
                        {getFileExtension(sub.filename)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                        {sub.filename}
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Submitted {formatDate(sub.uploaded_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-4">
                    <StatusPill status={sub.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}