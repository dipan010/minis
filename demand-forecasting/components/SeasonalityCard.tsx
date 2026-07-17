import type { SeasonalComponent } from "@/lib/types";

interface SeasonalityCardProps {
  component: SeasonalComponent;
}

/** One detected seasonal pattern: period, strength bar, peak periods. */
export default function SeasonalityCard({ component }: SeasonalityCardProps) {
  const pct = Math.round(Math.min(1, component.strength) * 100);

  return (
    <div className="panel p-4 w-full sm:w-64">
      <p className="text-sm font-semibold capitalize mb-2">{component.period} pattern</p>
      <div className="flex items-center gap-2 mb-3">
        <div className="relative h-1.5 flex-1 rounded-full bg-line overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-[11px] text-ink-soft w-14 text-right">
          {component.strength.toFixed(2)} ac
        </span>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">Peaks</p>
      <div className="flex flex-wrap gap-1.5">
        {component.peak_periods.map((peak) => (
          <span key={peak} className="rounded-full bg-primary-soft text-primary px-2.5 py-0.5 text-xs">
            {peak}
          </span>
        ))}
      </div>
    </div>
  );
}
