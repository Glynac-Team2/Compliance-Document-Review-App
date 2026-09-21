import React from "react";

export const STATUS_META = {
  pending: { label: "Pending review", color: "#B8862F", bg: "#F7EFDE" },
  approved: { label: "Approved", color: "#3E7A5C", bg: "#E7F0EA" },
  rejected: { label: "Rejected", color: "#B0453D", bg: "#F7E9E7" },
  needs_revision: { label: "Needs revision", color: "#1F3157", bg: "#E7EBF3" },
};

export const SEVERITY = {
  high: { color: "#B0453D", bg: "#F7E9E7", label: "High" },
  medium: { color: "#B8862F", bg: "#F7EFDE", label: "Medium" },
  low: { color: "#3E7A5C", bg: "#E7F0EA", label: "Low" },
};

export function StatusPill({ status }) {
  // Unknown statuses show their raw value instead of masquerading as pending.
  const m = STATUS_META[status] ?? {
    label: status ?? "Unknown",
    color: "#5B6472",
    bg: "#F5F6F8",
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ color: m.color, background: m.bg }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: m.color }}
      />
      {m.label}
    </span>
  );
}

export function SeverityTag({ level }) {
  const s = SEVERITY[level] || SEVERITY.medium;
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}
