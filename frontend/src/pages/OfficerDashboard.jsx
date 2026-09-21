import React, { useState } from "react";
import {
  ShieldCheck,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  User,
  Sparkles,
  Search,
  Check,
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useNavigate } from "react-router-dom";

export default function OfficerDashboard() {
  const [filterTab, setFilterTab] = useState("All");
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Mock submissions queue for officers to review
  const [queue, setQueue] = useState([
    {
      id: 1,
      name: "micro1 - First Hackathon97ec7c5.pdf",
      advisor: "Test Advisor",
      time: "Just now",
      status: "Pending",
      riskScore: "Low (92/100)",
      summary:
        "Standard hackathon submission document. No compliance flags detected.",
    },
    {
      id: 2,
      name: "SEO Link Building Report – Idongesit Udo.xlsx",
      advisor: "Test Advisor",
      time: "Sept 17, 2026 • 3:36 PM",
      status: "Pending",
      riskScore: "Medium (78/100)",
      summary:
        "Spreadsheet contains outbound links requiring verification against whitehat standards.",
    },
    {
      id: 3,
      name: "Idongesit_Udo_Resume_micro1.pdf",
      advisor: "Test Advisor",
      time: "Sept 17, 2026 • 3:36 PM",
      status: "Approved",
      riskScore: "Low (98/100)",
      summary:
        "Verified credentials and identification match workspace records.",
    },
  ]);

  const [selectedDoc, setSelectedDoc] = useState(queue[0]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleUpdateStatus = (id, newStatus) => {
    const updated = queue.map((item) => {
      if (item.id === id) {
        return { ...item, status: newStatus };
      }
      return item;
    });
    setQueue(updated);
    const current = updated.find((i) => i.id === id);
    if (current) setSelectedDoc(current);
  };

  const filteredQueue = queue.filter((item) => {
    if (filterTab === "All") return true;
    return item.status === filterTab;
  });

  const pendingCount = queue.filter((s) => s.status === "Pending").length;
  const approvedCount = queue.filter((s) => s.status === "Approved").length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-950 rounded-xl text-white shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                Compliance Portal
              </h1>
              <p className="text-xs text-indigo-600 font-semibold">
                Officer Verification Workspace
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 px-3.5 py-2 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs font-semibold text-indigo-900">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span>Compliance Officer</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Metric Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Queue
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900">
                {queue.length}
              </h3>
            </div>
            <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Requires Review
              </p>
              <h3 className="text-3xl font-extrabold text-amber-600">
                {pendingCount}
              </h3>
            </div>
            <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-2xl text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Verified & Approved
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

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Review Queue List */}
          <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Verification Queue
                </h2>
                <p className="text-xs text-slate-500">
                  Select a document to inspect AI pre-checks.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
                {["All", "Pending", "Approved"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterTab === tab
                        ? "bg-white text-indigo-600 shadow-sm font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredQueue.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedDoc(item)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedDoc?.id === item.id
                      ? "bg-indigo-50/50 border-indigo-600 shadow-sm"
                      : "bg-slate-50/60 hover:bg-slate-50 border-slate-200/60"
                  }`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="p-2.5 bg-white border border-slate-200 text-indigo-600 rounded-xl flex-shrink-0 shadow-sm">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 truncate">
                        {item.name}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Advisor: {item.advisor} • {item.time}
                      </p>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-4">
                    {item.status === "Pending" ? (
                      <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-full">
                        Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-full">
                        Approved
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Inspector & Action Panel */}
          <div className="lg:col-span-6 bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            {selectedDoc ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center space-x-1 mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Pre-Screening Result</span>
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      {selectedDoc.name}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-lg">
                    Risk Score: {selectedDoc.riskScore}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Document Summary & Compliance Note
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {selectedDoc.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 block mb-0.5">
                        Submitted By
                      </span>
                      <span className="font-semibold text-slate-800">
                        {selectedDoc.advisor}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 block mb-0.5">
                        Timestamp
                      </span>
                      <span className="font-semibold text-slate-800">
                        {selectedDoc.time}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Officer Action Buttons */}
                <div className="pt-4 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateStatus(selectedDoc.id, "Approved")
                    }
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Document</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateStatus(selectedDoc.id, "Flagged")
                    }
                    className="flex-1 py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-semibold text-xs rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Request Changes</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 space-y-3 text-slate-400">
                <Search className="w-10 h-10 text-slate-300" />
                <p className="text-sm font-medium">
                  Select a document from the queue to inspect details.
                </p>
              </div>
            )}

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Secure Compliance Node v2.4</span>
              <span>Encrypted Officer Session</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
