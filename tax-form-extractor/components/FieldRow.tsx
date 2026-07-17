"use client";

import type { ExtractedField } from "@/lib/types";
import ConfidenceMeter, { confidenceColor, confidenceLabel } from "./ConfidenceMeter";

interface FieldRowProps {
  label: string;
  field: ExtractedField;
  onChange: (value: string) => void;
}

/** One extracted field: label, editable input, confidence badge, and the
 * original OCR value as a hover tooltip. Fields under 50% confidence get a
 * red left border + tinted background to demand manual review. */
export default function FieldRow({ label, field, onChange }: FieldRowProps) {
  const needsReview = field.confidence < 50;
  const color = confidenceColor(field.confidence);

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2.5 rounded-lg border ${
        needsReview ? "border-bad/40 bg-red-50" : "border-transparent"
      }`}
      style={needsReview ? { borderLeftWidth: 3, borderLeftColor: "var(--bad)" } : undefined}
    >
      <label className="w-full sm:w-56 shrink-0 text-[13px] text-ink-soft leading-tight">
        {label}
        {needsReview && (
          <span className="block text-[11px] text-bad font-medium">needs manual review</span>
        )}
      </label>

      <input
        type="text"
        value={field.value}
        onChange={(e) => onChange(e.target.value)}
        title={`Original OCR value: ${field.value || "(empty)"}`}
        placeholder="(not found)"
        className="flex-1 min-w-0 rounded-md border border-line bg-card px-3 py-1.5 font-mono text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
      />

      <div className="flex items-center gap-2 shrink-0">
        <ConfidenceMeter confidence={field.confidence} />
        <span
          className="font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full text-white w-14 text-center"
          style={{ background: color }}
        >
          {confidenceLabel(field.confidence)}
        </span>
      </div>
    </div>
  );
}
