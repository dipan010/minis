import type { GapAnalysis } from "@/lib/types";
import { STATUS_META } from "@/lib/types";

interface StatusBarProps {
  summary: GapAnalysis["status_summary"];
}

/** Stacked horizontal proportion bar: compliant / partial / gap / N/A. */
export default function StatusBar({ summary }: StatusBarProps) {
  const total =
    summary.compliant + summary.partial + summary.gap + summary.not_applicable;
  if (total === 0) return null;

  const segments = [
    { key: "compliant" as const, count: summary.compliant },
    { key: "partial" as const, count: summary.partial },
    { key: "gap" as const, count: summary.gap },
    { key: "not_applicable" as const, count: summary.not_applicable },
  ].filter((s) => s.count > 0);

  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden">
        {segments.map((segment) => (
          <div
            key={segment.key}
            style={{
              width: `${(segment.count / total) * 100}%`,
              background: STATUS_META[segment.key].color,
            }}
            title={`${STATUS_META[segment.key].label}: ${segment.count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {segments.map((segment) => (
          <span key={segment.key} className="flex items-center gap-1.5 text-[11px] text-ink-soft">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: STATUS_META[segment.key].color }}
            />
            {STATUS_META[segment.key].label} ({segment.count})
          </span>
        ))}
      </div>
    </div>
  );
}
