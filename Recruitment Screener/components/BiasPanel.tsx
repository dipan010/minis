"use client";

import { useState } from "react";
import type { BiasFlag, BiasReport, BiasSeverity } from "@/lib/types";

const SEVERITY_COLOR: Record<BiasSeverity, string> = {
  low: "var(--partial)",
  medium: "var(--partial)",
  high: "var(--gap)",
};

const TYPE_LABELS: Record<BiasFlag["type"], string> = {
  age: "Age indicators",
  gender_coded_language: "Gender-coded language",
  educational_prestige: "Educational prestige",
  name_ethnicity_inference: "Name / ethnicity inference",
  employment_gap_penalty: "Employment gap penalty",
  other: "Other fairness concern",
};

function FlagRow({ flag }: { flag: BiasFlag }) {
  const [open, setOpen] = useState(false);
  const color = SEVERITY_COLOR[flag.severity];

  return (
    <div className="border-b border-hairline last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 py-3 text-left"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span
            className="font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 text-white"
            style={{ background: color }}
          >
            {flag.severity}
          </span>
          <span className="text-sm text-ink font-medium truncate">
            {TYPE_LABELS[flag.type] ?? flag.type}
          </span>
        </span>
        <span className="font-mono text-xs text-ink-soft shrink-0">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div className="pb-4 pl-1 space-y-2">
          <p className="text-sm text-ink-soft leading-relaxed">{flag.detail}</p>
          <p className="text-sm leading-relaxed">
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mr-2">
              Recommendation
            </span>
            <span className="text-ink">{flag.recommendation}</span>
          </p>
        </div>
      )}
    </div>
  );
}

interface BiasPanelProps {
  report: BiasReport | null;
  loading: boolean;
  error: string | null;
}

export default function BiasPanel({ report, loading, error }: BiasPanelProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-hairline bg-card px-4 py-3 flex items-center gap-3">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-ink-soft border-t-transparent animate-spin" />
        <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
          Checking for bias…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg border px-4 py-3"
        style={{ borderColor: "var(--gap)", background: "rgba(194,98,45,0.06)" }}
      >
        <p className="text-sm text-gap">Bias check failed: {error}</p>
      </div>
    );
  }

  if (!report) return null;

  if (report.flags.length === 0) {
    return (
      <div
        className="rounded-lg border px-4 py-3 flex items-center gap-3"
        style={{ borderColor: "var(--match)", background: "rgba(47,111,94,0.06)" }}
      >
        <span
          className="font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full text-white"
          style={{ background: "var(--match)" }}
        >
          Clean
        </span>
        <span className="text-sm text-match font-medium">
          No bias signals detected
        </span>
      </div>
    );
  }

  const bannerColor = report.overall_risk === "high" ? "var(--gap)" : "var(--partial)";

  return (
    <div
      className="rounded-lg border px-4 py-3"
      style={{
        borderColor: bannerColor,
        background:
          report.overall_risk === "high"
            ? "rgba(194,98,45,0.06)"
            : "rgba(201,154,59,0.08)",
      }}
    >
      <div className="flex items-center gap-3 mb-1">
        <span
          className="font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full text-white"
          style={{ background: bannerColor }}
        >
          {report.overall_risk} risk
        </span>
        <span className="text-sm font-medium" style={{ color: bannerColor }}>
          {report.flags.length} potential bias signal{report.flags.length === 1 ? "" : "s"} found — review before acting on this score
        </span>
      </div>
      <div>
        {report.flags.map((flag, i) => (
          <FlagRow key={i} flag={flag} />
        ))}
      </div>
    </div>
  );
}
