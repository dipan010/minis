"use client";

import { useMemo, useState } from "react";
import type { AnomalyEvent } from "@/lib/types";

const SEVERITY_COLOR = {
  mild: "#B45309",
  moderate: "#C2410C",
  severe: "#B91C1C",
} as const;

type SortKey = "date" | "deviation" | "severity";
const SEVERITY_ORDER = { mild: 0, moderate: 1, severe: 2 } as const;

interface AnomalyTableProps {
  anomalies: AnomalyEvent[];
}

/** Sortable anomaly table. */
export default function AnomalyTable({ anomalies }: AnomalyTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [asc, setAsc] = useState(true);

  const sorted = useMemo(() => {
    const list = [...anomalies];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.date.localeCompare(b.date);
      else if (sortKey === "deviation") cmp = Math.abs(a.deviation_pct) - Math.abs(b.deviation_pct);
      else cmp = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      return asc ? cmp : -cmp;
    });
    return list;
  }, [anomalies, sortKey, asc]);

  function toggle(key: SortKey) {
    if (sortKey === key) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "date");
    }
  }

  const arrow = (key: SortKey) => (sortKey === key ? (asc ? " ↑" : " ↓") : "");

  if (anomalies.length === 0) {
    return <p className="text-sm text-good">No anomalies exceeded the 2σ threshold.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px]">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-wide text-ink-soft cursor-pointer select-none" onClick={() => toggle("date")}>
              Date{arrow("date")}
            </th>
            <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-wide text-ink-soft">Expected</th>
            <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-wide text-ink-soft">Actual</th>
            <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-wide text-ink-soft cursor-pointer select-none" onClick={() => toggle("deviation")}>
              Deviation{arrow("deviation")}
            </th>
            <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-wide text-ink-soft cursor-pointer select-none" onClick={() => toggle("severity")}>
              Severity{arrow("severity")}
            </th>
            <th className="py-2 font-mono text-[10px] uppercase tracking-wide text-ink-soft">Possible cause</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => (
            <tr key={a.date} className="border-b border-line/60 last:border-b-0">
              <td className="py-2 pr-3 font-mono text-xs">{a.date}</td>
              <td className="py-2 pr-3 font-mono text-xs tabular-nums">{a.expected}</td>
              <td className="py-2 pr-3 font-mono text-xs tabular-nums font-semibold">{a.actual}</td>
              <td
                className="py-2 pr-3 font-mono text-xs tabular-nums font-semibold"
                style={{ color: a.deviation_pct > 0 ? "#15803D" : "#B91C1C" }}
              >
                {a.deviation_pct > 0 ? "+" : ""}
                {a.deviation_pct}%
              </td>
              <td className="py-2 pr-3">
                <span
                  className="font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full text-white"
                  style={{ background: SEVERITY_COLOR[a.severity] }}
                >
                  {a.severity}
                </span>
              </td>
              <td className="py-2 text-xs text-ink-soft">{a.possible_cause}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
