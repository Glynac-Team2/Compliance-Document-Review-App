import React, { useEffect, useState, useCallback } from "react";
import { ShieldCheck, AlertTriangle, Scale, WifiOff } from "lucide-react";
import { api } from "../lib/api";
import { StatusPill, SeverityTag } from "./Badges";

export default function AssistPanel({ documentId }) {
  const [state, setState] = useState({ loading: true, data: null, error: null });

  const load = useCallback(() => {
    setState({ loading: true, data: null, error: null });
    api
      .getAssist(documentId)
      .then((data) => setState({ loading: false, data, error: null }))
      .catch((err) => setState({ loading: false, data: null, error: err.message }));
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.loading) {
    return <p className="text-sm" style={{ color: "#8A93A1" }}>Loading assist\u2026</p>;
  }

  // Network/server failure, or the endpoint's "unavailable" response —
  // either way the review page (and the decision buttons) stay usable.
  if (state.error || (state.data && state.data.available === false)) {
    return (
      <div className="rounded-lg border p-5" style={{ borderColor: "#D7DCE3" }}>
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#16202E" }}>
          <WifiOff size={16} style={{ color: "#B0453D" }} />
          AI assist unavailable
        </div>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "#5B6472" }}>
          {state.error || state.data?.error || "The analysis service didn\u2019t respond."} The
          document itself is unaffected \u2014 you can still read it and record a decision.
        </p>
        <button
          onClick={load}
          className="mt-4 rounded-md border px-3 py-1.5 text-sm font-medium"
          style={{ borderColor: "#1F3157", color: "#1F3157" }}
        >
          Retry
        </button>
      </div>
    );
  }

  const doc = state.data;

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#5B6472" }}>
          <ShieldCheck size={14} /> AI summary
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "#16202E" }}>{doc.summary}</p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#5B6472" }}>
            <AlertTriangle size={14} /> Flags
          </div>
          <span className="text-xs" style={{ color: "#8A93A1" }}>{doc.flags.length} found</span>
        </div>
        {doc.flags.length === 0 ? (
          <div className="rounded-md border border-dashed px-3 py-4 text-sm" style={{ borderColor: "#D7DCE3", color: "#8A93A1" }}>
            No compliance flags raised on this submission.
          </div>
        ) : (
          <div className="space-y-3">
            {doc.flags.map((f, i) => (
              <div key={i} className="relative rounded-md border pl-4 pr-3 py-3" style={{ borderColor: "#D7DCE3" }}>
                <span className="absolute left-0 top-0 h-full w-1 rounded-l-md" style={{ background: "#C9A227" }} />
                <div className="mb-1.5 flex items-center gap-2">
                  <SeverityTag level={f.severity} />
                  <span className="text-xs font-medium" style={{ color: "#1F3157" }}>{f.rule}</span>
                </div>
                <p className="text-sm italic leading-snug" style={{ color: "#16202E" }}>{f.passage}</p>
                <p className="mt-1.5 text-xs leading-snug" style={{ color: "#5B6472" }}>{f.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {doc.precedents?.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#5B6472" }}>
            <Scale size={14} /> Precedent
          </div>
          <div className="space-y-2">
            {doc.precedents.map((p) => (
              <div key={p.document_id} className="rounded-md px-3 py-2" style={{ background: "#F5F6F8" }}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs" style={{ color: "#1F3157" }}>{p.document_id}</span>
                  <StatusPill status={p.verdict} />
                </div>
                <p className="mt-1 text-xs leading-snug" style={{ color: "#5B6472" }}>{p.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
