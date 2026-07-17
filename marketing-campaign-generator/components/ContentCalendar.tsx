import type { CalendarDay } from "@/lib/types";

/** Table view of the campaign schedule. */
export default function ContentCalendar({ calendar }: { calendar: CalendarDay[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px]">
        <thead>
          <tr className="border-b border-line text-left">
            {["Day", "Channel", "Asset", "Description"].map((h) => (
              <th key={h} className="px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-ink-soft">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calendar.map((entry, i) => (
            <tr key={i} className="border-b border-line/50 last:border-b-0 hover:bg-card-hover transition-colors">
              <td className="px-3 py-2 font-mono text-xs font-bold text-accent tabular-nums">
                {entry.day}
              </td>
              <td className="px-3 py-2 text-[13px] whitespace-nowrap">{entry.channel}</td>
              <td className="px-3 py-2">
                <span className="font-mono text-[10px] uppercase text-ink-soft border border-line rounded-full px-2 py-0.5 whitespace-nowrap">
                  {entry.asset_type}
                </span>
              </td>
              <td className="px-3 py-2 text-[13px] text-ink-soft">{entry.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
