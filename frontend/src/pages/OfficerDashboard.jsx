import { useState, useEffect } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Search,
  Check,
  Sun,
  Moon,
} from "lucide-react";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import { StatusPill } from "../components/Badges";
import AssistPanel from "../components/AssistPanel";

export default function OfficerDashboard() {
  const [filterTab, setFilterTab] = useState("All");
  const [queue, setQueue] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  
  // State for tracking dark mode status inside the component
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });

  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const data = await api.listDocuments();
        if (cancelled) return;
        const sorted = [...data].sort(
          (a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at),
        );
        setQueue(sorted);
        setSelectedId((prev) => prev ?? sorted[0]?.id ?? null);
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

  // Derived from the queue so it can never go stale after a status change.
  const selectedDoc = queue.find((d) => d.id === selectedId) ?? null;

  const handleSelect = (id) => {
    setSelectedId(id);
    setComment("");
    setDecisionError("");
  };

  const handleDecision = async (newStatus) => {
    if (!selectedDoc) return;
    const id = selectedDoc.id;
    setDeciding(true);
    setDecisionError("");
    try {
      await api.decide(id, newStatus, comment.trim());
      setQueue((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d)),
      );
      setComment("");
    } catch (err) {
      setDecisionError(err.message || "Failed to record decision.");
    } finally {
      setDeciding(false);
    }
  };

  const filteredQueue = queue.filter((item) => {
    if (filterTab === "All") return true;
    return item.status === filterTab.toLowerCase();
  });

  const pendingCount = queue.filter((s) => s.status === "pending").length;
  const approvedCount = queue.filter((s) => s.status === "approved").length;

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header bar with built-in Dark Mode Toggle */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 px-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm transition-colors">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Officer Workspace
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review and manage verification queues.
          </p>
        </div>
        <button
          onClick={toggleDarkMode}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center space-x-2 cursor-pointer text-xs font-semibold"
          title="Toggle Dark Mode"
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-600" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Metric Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm flex items-center justify-between transition-colors">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Queue
            </p>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {queue.length}
            </h3>
          </div>
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm flex items-center justify-between transition-colors">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Requires Review
            </p>
            <h3 className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {pendingCount}
            </h3>
          </div>
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/50 rounded-2xl text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm flex items-center justify-between transition-colors">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Verified & Approved
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

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Review Queue List */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-6 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Verification Queue
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a document to inspect AI pre-checks.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-medium">
              {["All", "Pending", "Approved"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterTab === tab
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {loading && (
              <p className="text-sm text-slate-400">Loading queue…</p>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            {!loading && !error && filteredQueue.length === 0 && (
              <p className="text-sm text-slate-400">
                No documents in this view.
              </p>
            )}
            {filteredQueue.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedDoc?.id === item.id
                    ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-600 dark:border-indigo-500 shadow-sm"
                    : "bg-slate-50/60 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200/60 dark:border-slate-700/60"
                }`}
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 rounded-xl flex-shrink-0 shadow-sm">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                      {item.filename}
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Advisor: {item.advisor?.name} •{" "}
                      {formatDate(item.uploaded_at)}
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0 ml-4">
                  <StatusPill status={item.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Inspector & Action Panel */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-col justify-between transition-colors">
          {selectedDoc ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center space-x-1 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Pre-Screening Result</span>
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedDoc.filename}
                  </h3>
                </div>
                <StatusPill status={selectedDoc.status} />
              </div>

              <div className="space-y-4">
                <AssistPanel documentId={selectedDoc.id} />

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-400 dark:text-slate-500 block mb-0.5">
                      Submitted By
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedDoc.advisor?.name}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-400 dark:text-slate-500 block mb-0.5">
                      Timestamp
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatDate(selectedDoc.uploaded_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Officer Action Buttons */}
              {selectedDoc.status === "pending" ? (
                <div className="space-y-3 pt-4">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Comment for the advisor (recommended when requesting changes)"
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-indigo-600 dark:focus:border-indigo-500"
                  />
                  {decisionError && (
                    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                      {decisionError}
                    </p>
                  )}
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      disabled={deciding}
                      onClick={() => handleDecision("approved")}
                      className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve Document</span>
                    </button>

                    <button
                      type="button"
                      disabled={deciding}
                      onClick={() => handleDecision("needs_revision")}
                      className="flex-1 py-3 px-4 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 font-semibold text-xs rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Request Changes</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="pt-4 text-xs text-slate-500 dark:text-slate-400">
                  This document has already been reviewed.
                </p>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 space-y-3 text-slate-400">
              <Search className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium">
                Select a document from the queue to inspect details.
              </p>
            </div>
          )}

          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>Secure Compliance Node v2.4</span>
            <span>Encrypted Officer Session</span>
          </div>
        </div>
      </div>
    </main>
  );
}