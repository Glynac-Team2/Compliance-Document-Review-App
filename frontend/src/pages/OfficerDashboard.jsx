import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronRight,
  Search,
  MessageSquare,
  Eye,
  Download,
} from "lucide-react";
import { api } from "../lib/api";
import { StatusPill } from "../components/Badges";
import AssistPanel from "../components/AssistPanel";
import { Modal } from "../components/Modal";
import { Document, Page, pdfjs } from "react-pdf";
import { renderAsync } from "docx-preview";
import * as XLSX from "xlsx";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const TABS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "needs_revision", label: "Revision" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function PDFPreview({ previewURL }) {
  const [numPages, setNumPages] = useState(null);

  return (
    <div className="h-[80vh] overflow-y-auto">
      <div className="flex flex-col items-center gap-4">
        <Document
          file={previewURL}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        >
          {Array.from({ length: numPages || 0 }, (_, index) => (
            <div key={index} className="mb-4">
              <Page
                pageNumber={index + 1}
                width={700}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}

function DOCXPreview({ previewURL }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!previewURL || !containerRef.current) return;

    const renderDocument = async () => {
      try {
        const response = await fetch(previewURL);

        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();

        containerRef.current.innerHTML = "";

        await renderAsync(buffer, containerRef.current);
      } catch (error) {
        console.error("DOCX preview error:", error);
      }
    };

    renderDocument();
  }, [previewURL]);

  return (
    <div className="h-[80vh] overflow-y-auto bg-gray-100 p-4">
      <div ref={containerRef} />
    </div>
  );
}

function XLSXPreview({ previewURL }) {
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!previewURL) return;

    const loadWorkbook = async () => {
      try {
        setError("");

        const response = await fetch(previewURL);
        const buffer = await response.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const parsedSheets = workbook.SheetNames.map((sheetName) => ({
          name: sheetName,
          data: XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            header: 1,
            defval: "",
          }),
        }));

        setSheets(parsedSheets);
        setActiveSheet(parsedSheets[0]?.name || "");
      } catch (err) {
        console.error("Failed to render XLSX:", err);
        setError("Failed to load spreadsheet.");
      }
    };
    loadWorkbook();
  }, [previewURL]);
  if (error) {
    return <div className="p-4 text-sm text-red-500">{error}</div>;
  }
  const activeData =
    sheets.find((sheet) => sheet.name === activeSheet)?.data || [];
  return (
    <div className="h-[80vh] flex flex-col">
      {sheets.length > 0 && (
        <div className="flex gap-2 border-b px-3 py-2 overflow-x-auto">
          {sheets.map((sheet) => (
            <button
              key={sheet.name}
              onClick={() => setActiveSheet(sheet.name)}
              className={`px-3 py-1 text-sm rounded ${activeSheet === sheet.name ? "bg-gray-200 font-medium" : "hover:bg-gray-100"}`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-auto p-4">
        <table className="border-collapse text-sm">
          <tbody>
            {activeData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border border-gray-300 px-3 py-2 whitespace-nowrap"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FilePreview({ previewURL, contentType }) {
  if (!contentType || !previewURL) return null;

  switch (contentType) {
    case "application/pdf":
      return <PDFPreview previewURL={previewURL} />;

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return <DOCXPreview previewURL={previewURL} />;

    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return <XLSXPreview previewURL={previewURL} />;

    default:
      return null;
  }
}

export default function OfficerDashboard() {
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [previewURL, setPreviewURL] = useState("");
  const [isPreviewOpen, setPreviewOpen] = useState(false);

  const loadQueue = useCallback(() => {
    setLoadingQueue(true);

    api
      .listDocuments(filter || undefined)
      .then((docs) => {
        setQueue(docs);

        if (!selectedId && docs.length) {
          setSelectedId(docs[0].id);
        }
      })
      .finally(() => setLoadingQueue(false));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    api.getDocument(selectedId).then(setDetail);
    setComment("");
    setDecisionError("");
  }, [selectedId]);

  const filtered = queue.filter(
    (d) =>
      d.filename.toLowerCase().includes(query.toLowerCase()) ||
      d.advisor.name.toLowerCase().includes(query.toLowerCase()) ||
      d.id.toLowerCase().includes(query.toLowerCase()),
  );

  const decide = async (status) => {
    if (!comment.trim()) {
      setDecisionError(
        "Add a comment before recording a decision — the advisor will see it.",
      );
      return;
    }

    setSubmitting(true);
    setDecisionError("");

    try {
      await api.decide(selectedId, status, comment);
      await api.getDocument(selectedId).then(setDetail);
      loadQueue();
      setComment("");
    } catch (err) {
      setDecisionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const download = async () => {
    const blob = await api.download(selectedId);
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = detail.filename;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };

  const preview = async () => {
    const blob = await api.preview(selectedId);
    const url = URL.createObjectURL(blob);

    setPreviewURL(url);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);

    if (previewURL) {
      URL.revokeObjectURL(previewURL);
      setPreviewURL("");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr_320px]">
      {/* Preview modal */}
      <Modal isOpen={isPreviewOpen} onClose={closePreview}>
        {detail && (
          <FilePreview
            previewURL={previewURL}
            contentType={detail.content_type}
          />
        )}
      </Modal>

      {/* Queue */}
      <div
        className="rounded-xl border"
        style={{ borderColor: "#D7DCE3", background: "#FFFFFF" }}
      >
        <div className="border-b p-4" style={{ borderColor: "#D7DCE3" }}>
          <div
            className="mb-3 flex items-center gap-2 rounded-md border px-2.5 py-1.5"
            style={{ borderColor: "#D7DCE3" }}
          >
            <Search size={14} style={{ color: "#8A93A1" }} />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search advisor, file, ID"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={
                  filter === t.key
                    ? { background: "#1F3157", color: "#FFFFFF" }
                    : { background: "#F1F2F5", color: "#5B6472" }
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[560px] overflow-y-auto">
          {loadingQueue && (
            <div
              className="px-4 py-10 text-center text-sm"
              style={{ color: "#8A93A1" }}
            >
              Loading…
            </div>
          )}

          {!loadingQueue && filtered.length === 0 && (
            <div
              className="px-4 py-10 text-center text-sm"
              style={{ color: "#8A93A1" }}
            >
              Nothing in this queue.
            </div>
          )}

          {filtered.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              className="flex w-full flex-col gap-1.5 border-b px-4 py-3 text-left"
              style={{
                borderColor: "#EEF0F3",
                background: d.id === selectedId ? "#F5F6F8" : "transparent",
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-xs"
                  style={{ color: "#8A93A1" }}
                >
                  {d.id}
                </span>

                <StatusPill status={d.status} />
              </div>

              <div className="flex items-center gap-1.5 text-sm font-medium">
                <FileText size={14} style={{ color: "#5B6472" }} />
                <span className="truncate">{d.filename}</span>
              </div>

              <div
                className="flex items-center justify-between text-xs"
                style={{ color: "#8A93A1" }}
              >
                <span>{d.advisor.name}</span>
                <span>{new Date(d.uploaded_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Document + decision */}
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: "#D7DCE3", background: "#FFFFFF" }}
      >
        {!detail ? (
          <div
            className="py-20 text-center text-sm"
            style={{ color: "#8A93A1" }}
          >
            Select a document from the queue.
          </div>
        ) : (
          <>
            <div
              className="mb-1 flex items-center gap-2 text-xs"
              style={{ color: "#8A93A1" }}
            >
              {detail.thread.map((t, i) => (
                <React.Fragment key={t.id}>
                  {i > 0 && <ChevronRight size={12} />}

                  <span
                    style={{
                      color: t.id === detail.id ? "#1F3157" : "#8A93A1",
                      fontWeight: t.id === detail.id ? 600 : 400,
                    }}
                  >
                    {t.label}
                  </span>
                </React.Fragment>
              ))}
            </div>

            <h2
              className="mb-1"
              style={{
                fontFamily: "'Source Serif 4', serif",
                fontSize: "22px",
                fontWeight: 600,
              }}
            >
              {detail.filename}
            </h2>

            <div
              className="mb-5 flex items-center justify-between gap-3 text-sm"
              style={{ color: "#5B6472" }}
            >
              <span>{detail.advisor.name}</span>
              <span>·</span>

              <span className="flex items-center gap-1">
                <Clock size={13} />
                {new Date(detail.uploaded_at).toLocaleString()}
              </span>

              <Eye size={13} onClick={preview} className="cursor-pointer" />

              <Download
                size={13}
                onClick={download}
                className="cursor-pointer"
              />
            </div>

            <div
              className="mb-6 rounded-lg p-5"
              style={{
                background: "#F5F6F8",
                minHeight: "120px",
                maxHeight: "400px",
                overflowY: "auto",
              }}
            >
              <pre
                className="whitespace-pre-wrap font-sans text-sm leading-relaxed"
                style={{ color: "#16202E" }}
              >
                {detail.extracted_text ||
                  "No text could be extracted from this document."}
              </pre>
            </div>

            {detail.reviews?.length > 0 && (
              <div className="mb-5 space-y-2">
                {detail.reviews.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-md px-3 py-2 text-xs"
                    style={{ background: "#F5F6F8", color: "#5B6472" }}
                  >
                    <strong style={{ color: "#16202E" }}>
                      {r.officer.name}
                    </strong>{" "}
                    — {r.status} — &quot;{r.comment}&quot;
                  </div>
                ))}
              </div>
            )}

            {detail.status === "pending" ||
            detail.status === "needs_revision" ? (
              <>
                <div className="mb-4">
                  <label
                    className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "#5B6472" }}
                  >
                    <MessageSquare size={13} />
                    Decision comment
                  </label>

                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Explain the decision — the advisor sees this."
                    rows={3}
                    className="w-full rounded-md border p-3 text-sm outline-none"
                    style={{ borderColor: "#D7DCE3" }}
                  />

                  {decisionError && (
                    <p className="mt-1.5 text-xs" style={{ color: "#B0453D" }}>
                      {decisionError}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={submitting}
                    onClick={() => decide("approved")}
                    className="flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    style={{ background: "#3E7A5C" }}
                  >
                    <CheckCircle2 size={15} />
                    Approve
                  </button>

                  <button
                    disabled={submitting}
                    onClick={() => decide("needs_revision")}
                    className="flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    style={{ background: "#1F3157" }}
                  >
                    <RotateCcw size={15} />
                    Needs revision
                  </button>

                  <button
                    disabled={submitting}
                    onClick={() => decide("rejected")}
                    className="flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    style={{ background: "#B0453D" }}
                  >
                    <XCircle size={15} />
                    Reject
                  </button>
                </div>
              </>
            ) : (
              <div
                className="rounded-md px-4 py-3 text-sm"
                style={{ background: "#F5F6F8", color: "#5B6472" }}
              >
                This document already has a final decision. No further action
                needed.
              </div>
            )}
          </>
        )}
      </div>

      {/* AI assist */}
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: "#D7DCE3", background: "#FFFFFF" }}
      >
        <div className="mb-4 text-sm font-semibold">AI assist</div>

        {detail ? (
          <AssistPanel documentId={detail.id} />
        ) : (
          <p className="text-sm" style={{ color: "#8A93A1" }}>
            Select a document to see its analysis.
          </p>
        )}
      </div>
    </div>
  );
}