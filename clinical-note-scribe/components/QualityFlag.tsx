"use client";

import { useState } from "react";
import type { QualityFlag as QualityFlagData } from "@/lib/types";

const TYPE_LABELS: Record<QualityFlagData["type"], string> = {
  missing_info: "Missing info",
  ambiguous: "Ambiguous",
  critical: "Critical",
  inconsistency: "Inconsistency",
};

interface QualityFlagsProps {
  flags: QualityFlagData[];
}

/** Amber banner with expandable flag details, shown above the note. */
export default function QualityFlags({ flags }: QualityFlagsProps) {
  const [open, setOpen] = useState(false);

  if (flags.length === 0) return null;

  const hasCritical = flags.some((f) => f.type === "critical");

  return (
    <div
      className="rounded-lg border px-4 py-3"
      style={{
        background: hasCritical ? "#FDECEC" : "#FEF6E7",
        borderColor: hasCritical ? "#DC2626" : "#D97706",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <span
          className="text-sm font-medium"
          style={{ color: hasCritical ? "#B91C1C" : "#B45309" }}
        >
          ⚠ {flags.length} quality flag{flags.length === 1 ? "" : "s"} — review before
          approving this note
        </span>
        <span className="font-mono text-xs" style={{ color: hasCritical ? "#B91C1C" : "#B45309" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <ul className="mt-3 space-y-1.5">
          {flags.map((flag, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] leading-snug">
              <span
                className="font-mono text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 shrink-0 text-white"
                style={{ background: flag.type === "critical" ? "#DC2626" : "#D97706" }}
              >
                {TYPE_LABELS[flag.type]}
              </span>
              <span className="text-ink">
                {flag.message}
                <span className="text-ink-soft"> · {flag.section}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
