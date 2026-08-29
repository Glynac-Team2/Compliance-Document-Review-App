import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Upload, FileText, GitBranch, MessageSquare, X, Send, CheckCircle2, ChevronRight
} from "lucide-react";
import { api } from "../lib/api";
import { StatusPill } from "../components/Badges";

const ACCEPTED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function UploadCard({ onUploaded, revisesId, onDone }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const choose = (f) => {
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      setError("Only PDF, DOCX, or XLSX files are accepted.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File exceeds the 10MB limit.");
      return;
    }
    setError("");
    setFile(f);
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await api.submitDocument(file, revisesId);
      setFile(null);
      onUploaded();
      if (onDone) onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 text-center"
        style={{ borderColor: "#C9A227", background: "#FBF7EC" }}
      >
        <Upload size={20} style={{ color: "#B8862F" }} />
        <p className="mt-2 text-sm font-medium">{file ? file.name : "Drop a file, or browse"}</p>
        <p className="mt-1 text-xs" style={{ color: "#8A93A1" }}>PDF · DOCX · XLSX · 10MB max</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => choose(e.target.files[0])}
        />
      </div>
      {error && <p className="mt-2 text-sm" style={{ color: "#B0453D" }}>{error}</p>}
      <button
        onClick={submit}
        disabled={!file || busy}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium text-white disabled:opacity-50"
        style={{ background: "#1F3157" }}
      >
        <Send size={14} /> {busy ? "Submitting…" : "Submit for review"}
      </button>
    </div>
  );
}

function RevisionDetail({ doc, onClose, onResubmitted }) {
  const [full, setFull] = useState(null);
  const [resubmitted, setResubmitted] = useState(false);

  useEffect(() => {
    api.getDocument(doc.id).then(setFull);
  }, [doc.id]);

  const latestComment = full?.reviews?.[full.reviews.length - 1]?.comment;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(22,32,46,0.45)" }}>
      <div className="w-full max-w-lg rounded-xl" style={{ background: "#FFFFFF" }}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "#D7DCE3" }}>
          <div>
            <span className="font-mono text-xs" style={{ color: "#8A93A1" }}>{doc.id}</span>
            <h3 className="text-base font-semibold">{doc.filename}</h3>
          </div>
          <button onClick={onClose} aria-label="Close"><X size={18} style={{ color: "#8A93A1" }} /></button>
        </div>

        <div className="px-6 py-5">
          {full && (
            <div className="mb-4 flex items-center gap-2 text-xs" style={{ color: "#8A93A1" }}>
              <GitBranch size={13} />
              {full.thread.map((t, i) => (
                <React.Fragment key={t.id}>
                  {i > 0 && <ChevronRight size={11} />}
                  <span style={{ color: t.id === full.id ? "#1F3157" : "#8A93A1", fontWeight: t.id === full.id ? 600 : 400 }}>
                    {t.label}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}

          {latestComment && (
            <div className="mb-5 rounded-md border-l-4 px-4 py-3" style={{ borderColor: "#1F3157", background: "#F5F6F8" }}>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "#1F3157" }}>
                <MessageSquare size={12} /> Officer comment
              </div>
              <p className="text-sm leading-relaxed">{latestComment}</p>
            </div>
          )}

          {doc.status === "needs_revision" && !resubmitted && (
            <>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#5B6472" }}>
                Attach the revised file
              </label>
              <UploadCard
                revisesId={doc.id}
                onUploaded={() => {
                  setResubmitted(true);
                  onResubmitted();
                }}
              />
            </>
          )}

          {resubmitted && (
            <div className="flex items-center gap-2 rounded-md px-4 py-3 text-sm" style={{ background: "#E7F0EA", color: "#3E7A5C" }}>
              <CheckCircle2 size={16} /> Revision submitted — back in the officer queue, linked to this thread.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdvisorDashboard() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDoc, setOpenDoc] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.listDocuments().then(setDocs).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
      <div className="rounded-xl border p-6" style={{ borderColor: "#D7DCE3", background: "#FFFFFF" }}>
        <h2 style={{ fontFamily: "'Source Serif 4', serif", fontSize: "20px", fontWeight: 600 }}>Submit a document</h2>
        <p className="mt-1 text-sm" style={{ color: "#5B6472" }}>
          A compliance officer will review it before it can go to clients.
        </p>
        <div className="mt-5">
          <UploadCard onUploaded={load} />
        </div>
      </div>

      <div className="rounded-xl border" style={{ borderColor: "#D7DCE3", background: "#FFFFFF" }}>
        <div className="border-b px-6 py-4" style={{ borderColor: "#D7DCE3" }}>
          <h3 className="text-sm font-semibold">Your submissions</h3>
        </div>
        <div>
          {loading && <div className="px-6 py-8 text-center text-sm" style={{ color: "#8A93A1" }}>Loading…</div>}
          {!loading && docs.length === 0 && (
            <div className="px-6 py-8 text-center text-sm" style={{ color: "#8A93A1" }}>
              Nothing submitted yet — upload a file to get started.
            </div>
          )}
          {docs.map((d) => (
            <button
              key={d.id}
              onClick={() => setOpenDoc(d)}
              className="block w-full border-b px-6 py-4 text-left"
              style={{ borderColor: "#EEF0F3" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={15} style={{ color: "#5B6472" }} />
                  <span className="text-sm font-medium">{d.filename}</span>
                </div>
                <StatusPill status={d.status} />
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs" style={{ color: "#8A93A1" }}>
                <GitBranch size={12} />
                {d.revises_id ? "Revision" : "Original submission"}
                <span>· {new Date(d.uploaded_at).toLocaleString()}</span>
              </div>
              {d.status === "needs_revision" && (
                <div className="mt-2 rounded-md px-3 py-2 text-xs" style={{ background: "#E7EBF3", color: "#1F3157" }}>
                  Officer requested changes — tap to read the comment and resubmit.
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {openDoc && (
        <RevisionDetail doc={openDoc} onClose={() => setOpenDoc(null)} onResubmitted={load} />
      )}
    </div>
  );
}
