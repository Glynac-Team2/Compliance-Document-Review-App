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
  MessageSquare,
} from "lucide-react";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import { StatusPill } from "../components/Badges";

export default function AdvisorDashboard() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMsg, setSuccessMsg] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [advisorNotes, setAdvisorNotes] = useState(""); // Feature 4 state

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
    const file = e.target.files[0];
    if (!file) return;

    const allowedExtensions = ['pdf', 'docx', 'xlsx'];
    const fileExt = file.name.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
      setUploadError(`Invalid file format (.${fileExt}). Please select PDF, DOCX, or XLSX.`);
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size exceeds 10MB limit.");
      setSelectedFile(null);
      return;
    }

    setUploadError("");
    setSelectedFile(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(15);
    setUploadError("");
    
    try {
      const timer = setInterval(() => {
        setUploadProgress((prev) => (prev < 85 ? prev + 20 : prev));
      }, 200);

      const doc = await api.submitDocument(selectedFile);
      clearInterval(timer);
      setUploadProgress(100);

      setTimeout(() => {
        setSubmissions((prev) => [{ ...doc, notes: advisorNotes }, ...prev]);
        setSelectedFile(null);
        setAdvisorNotes("");
        setUploading(false);
        setUploadProgress(0);
        setSuccessMsg(true);
        setTimeout(() => setSuccessMsg(false), 4000);
      }, 400);

    } catch (err) {
      setUploading(false);
      setUploadProgress(0);
      setUploadError(err.message || "Upload failed.");
    }
  };

  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const approvedCount = submissions.filter(
    (s) => s.status === "approved",
  ).length;

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch = sub.filename.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === "pending") return matchesSearch && sub.status === "pending";
    if (statusFilter === "approved") return matchesSearch && sub.status === "approved";
    return matchesSearch;
  });

  const getFileExtension = (filename) => {
    const ext = filename.split('.').pop();
    return ext ? ext.toUpperCase() : 'FILE';
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-8 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors">
      
      {/* Top Header Section */}
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
        <div 
          onClick={() => setStatusFilter("all")}
          className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border ${statusFilter === 'all' ? 'border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200/80 dark:border-slate-800'} shadow-sm flex items-center justify-between relative overflow-hidden transition-all cursor-pointer hover:shadow-md`}
        >
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

        <div 
          onClick={() => setStatusFilter("pending")}
          className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border ${statusFilter === 'pending' ? 'border-amber-500 dark:border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200/80 dark:border-slate-800'} shadow-sm flex items-center justify-between relative overflow-hidden transition-all cursor-pointer hover:shadow-md`}
        >
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

        <div 
          onClick={() => setStatusFilter("approved")}
          className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border ${statusFilter === 'approved' ? 'border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/80 dark:border-slate-800'} shadow-sm flex items-center justify-between relative overflow-hidden transition-all cursor-pointer hover:shadow-md`}
        >
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

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Widget with Optional Notes (Feature 4) */}
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
                Automated AI compliance screening will run before officer review.
              </p>
            </div>

            {successMsg && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Document uploaded and queued for screening successfully!</span>
              </div>
            )}

            {uploadError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 rounded-2xl p-6 cursor-pointer transition-all group">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-2xl mb-2 transition-colors shadow-sm">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate max-w-full">
                  {selectedFile ? selectedFile.name : "Click to upload or drag & drop"}
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

              {/* Feature 4: Advisor Notes Text Area */}
              <div className="space-y-1.5">
                <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Submission Notes (Optional)</span>
                </label>
                <div className="relative">
                  <textarea
                    rows="2"
                    maxLength={200}
                    value={advisorNotes}
                    onChange={(e) => setAdvisorNotes(e.target.value)}
                    placeholder="Add any specific context or remarks for compliance reviewers..."
                    className="w-full p-3 text-xs bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 transition-all resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    {advisorNotes.length}/200
                  </span>
                </div>
              </div>

              {uploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span>Uploading & Screening...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

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
                <span>{uploading ? "Processing AI Screening..." : "Submit for Review"}</span>
              </button>
            </form>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2 text-xs text-slate-400 dark:text-slate-500">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Files are encrypted end-to-end according to compliance policy.</span>
          </div>
        </div>

        {/* Submissions List */}
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
                {filteredSubmissions.length} Shown
              </span>
            </div>
          </div>

          <div className="relative flex items-center space-x-2">
            <div className="relative flex-1">
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
            {statusFilter !== "all" && (
              <button
                onClick={() => setStatusFilter("all")}
                className="px-3 py-2.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 rounded-xl hover:bg-indigo-100 transition-all cursor-pointer"
              >
                Clear Filter ({statusFilter})
              </button>
            )}
          </div>

          <div className="space-y-3">
            {loading && <p className="text-sm text-slate-400 dark:text-slate-500">Loading submissions…</p>}
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
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
                  className="flex flex-col p-4 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-xl transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl flex-shrink-0 relative">
                        <FileText className="w-5 h-5" />
                        <span className="absolute -bottom-1 -right-1 text-[9px] font-extrabold px-1 bg-indigo-600 text-white rounded">
                          {getFileExtension(sub.filename)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 mb-0.5">
                          <span className="text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">
                            DOC-{sub.id}
                          </span>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                            {sub.filename}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Submitted {formatDate(sub.uploaded_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0 ml-4">
                      <StatusPill status={sub.status} />
                    </div>
                  </div>

                  {sub.notes && (
                    <div className="text-xs bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-lg p-2.5 text-slate-600 dark:text-slate-300 italic flex items-start space-x-2">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <span>Note: {sub.notes}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}