interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "flat";
}

const TREND_META = {
  up: { icon: "↑", color: "var(--pos)" },
  down: { icon: "↓", color: "var(--neg)" },
  flat: { icon: "→", color: "var(--neu)" },
};

/** Metric card: icon, big value, label, optional trend arrow + subtext. */
export default function StatCard({ icon, label, value, sub, trend }: StatCardProps) {
  return (
    <div className="panel p-4 flex items-start gap-3">
      <span aria-hidden className="text-xl leading-none pt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">{label}</p>
        <p className="text-xl font-semibold text-ink truncate flex items-center gap-1.5">
          {value}
          {trend && (
            <span className="text-sm font-mono" style={{ color: TREND_META[trend].color }}>
              {TREND_META[trend].icon}
            </span>
          )}
        </p>
        {sub && <p className="text-[11px] text-ink-soft truncate">{sub}</p>}
      </div>
    </div>
  );
}
