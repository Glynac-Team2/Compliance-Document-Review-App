import { useState, useEffect } from "react";
import {
  FileText,
  UploadCloud,
  Clock,
  CheckCircle2,
  FileCheck,
  Sparkles,
  AlertCircle,
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const data = await api.listDocuments();
        if (cancelled) return;
        setSubmissions(
          [...data].sort(
            (a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at),
          ),
        );
        setError("");
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Failed to load documents.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
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

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Metric Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Submissions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Total Submissions
            </p>
            <h3 className="text-3xl font-extrabold text-slate-900">
              {submissions.length}
            </h3>
          </div>
          <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Pending Review
            </p>
            <h3 className="text-3xl font-extrabold text-amber-600">
              {pendingCount}
            </h3>
          </div>
          <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-2xl text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Approved
            </p>
            <h3 className="text-3xl font-extrabold text-emerald-600">
              {approvedCount}
            </h3>
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
                <span className="text-xs font-bold uppercase tracking-wider">
                  AI Verification Ready
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Submit a Document
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Automated AI compliance screening will run before officer
                review.
              </p>
            </div>

            {successMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-medium flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>
                  Document uploaded and queued for screening successfully!
                </span>
              </div>
            )}

            {uploadError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/30 rounded-2xl p-8 cursor-pointer transition-all group">
                <div className="p-4 bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 rounded-2xl mb-3 transition-colors shadow-sm">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600">
                  {selectedFile
                    ? selectedFile.name
                    : "Click to upload or drag & drop"}
                </span>
                <span className="text-xs text-slate-400 mt-1">
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
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
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

          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center space-x-2 text-xs text-slate-400">
            <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>
              Files are encrypted end-to-end according to compliance policy.
            </span>
          </div>
        </div>

        {/* Right Side: Submissions List */}
        <div className="lg:col-span-7 bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Your Submissions
              </h2>
              <p className="text-xs text-slate-500">
                Track real-time review status of uploaded documents.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
              {submissions.length} Total
            </span>
          </div>

          <div className="space-y-3">
            {loading && (
              <p className="text-sm text-slate-400">Loading submissions…</p>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            {!loading && !error && submissions.length === 0 && (
              <p className="text-sm text-slate-400">No submissions yet.</p>
            )}
            {submissions.map((sub) => {
              return (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-4 bg-slate-50/60 hover:bg-slate-50 border border-slate-200/60 rounded-xl transition-all"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 truncate">
                        {sub.filename}
                      </h4>
                      <p className="text-xs text-slate-400">
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
