"use client";

import { useState } from "react";
import type { RiskEvent } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/types";

function severityColor(severity: number): string {
  if (severity >= 4) return "var(--high)";
  if (severity >= 3) return "var(--med)";
  return "var(--low)";
}

interface EventRowProps {
  event: RiskEvent;
}

/** Expandable table row: compact summary line, full detail on click. */
export default function EventRow({ event }: EventRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-surface transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-3 py-2 font-mono text-xs text-ink-soft whitespace-nowrap">
          {event.date}
        </td>
        <td className="px-3 py-2 text-sm text-ink">
          <span className="font-mono text-xs text-ink-soft mr-2">{open ? "▾" : "▸"}</span>
          {event.title}
        </td>
        <td className="px-3 py-2">
          <span
            className="inline-block font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full text-white whitespace-nowrap"
            style={{ background: CATEGORY_COLORS[event.category] }}
          >
            {event.category}
          </span>
        </td>
        <td className="px-3 py-2">
          <span
            className="font-mono text-xs font-bold tabular-nums"
            style={{ color: severityColor(event.severity) }}
          >
            {event.severity}/5
          </span>
        </td>
        <td className="px-3 py-2 text-xs text-ink-soft whitespace-nowrap">{event.source}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} className="px-3 pb-3 pt-0">
            <div className="ml-6 border-l-2 border-line pl-3 py-1">
              <p className="text-sm text-ink-soft leading-relaxed">{event.summary}</p>
              {event.affected_suppliers && event.affected_suppliers.length > 0 && (
                <p className="text-xs text-ink-soft mt-2">
                  <span className="font-mono uppercase tracking-wide">Affected suppliers:</span>{" "}
                  {event.affected_suppliers.join(", ")}
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
