"use client";

import { useState } from "react";
import type { RiskCategory, RiskFactor, Severity } from "@/lib/types";

const CATEGORY_ICONS: Record<RiskCategory, string> = {
  address: "📍",
  weather: "🌧",
  package: "📦",
  timing: "⏱",
  history: "🗂",
};

const CATEGORY_LABELS: Record<RiskCategory, string> = {
  address: "Address",
  weather: "Weather",
  package: "Package",
  timing: "Timing",
  history: "History",
};

const SEVERITY_COLOR: Record<Severity, string> = {
  low: "var(--good)",
  medium: "var(--caution)",
  high: "var(--danger)",
};

interface RiskCardProps {
  factor: RiskFactor;
}

/** Expandable card: category icon + severity badge in the header, detail
 * text and mitigation suggestion revealed on click. */
export default function RiskCard({ factor }: RiskCardProps) {
  const [open, setOpen] = useState(false);
  const color = SEVERITY_COLOR[factor.severity];

  return (
    <div className="panel overflow-hidden" style={{ borderLeftWidth: 3, borderLeftColor: color }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span aria-hidden className="text-lg shrink-0">{CATEGORY_ICONS[factor.category]}</span>
          <span className="text-sm font-medium text-ink truncate">
            {CATEGORY_LABELS[factor.category]} risk
          </span>
          <span
            className="font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full text-white shrink-0"
            style={{ background: color }}
          >
            {factor.severity}
          </span>
        </span>
        <span className="font-mono text-xs text-ink-soft shrink-0">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-line pt-3">
          <p className="text-sm text-ink-soft leading-relaxed">{factor.detail}</p>
          <p className="text-sm leading-relaxed">
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mr-2">
              Mitigation
            </span>
            <span className="text-ink">{factor.mitigation}</span>
          </p>
        </div>
      )}
    </div>
  );
}
