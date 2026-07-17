interface ProgressBarProps {
  step: number;
  estimatedTotal: number;
  active: boolean;
}

/** Step counter with animated progress fill. The total is an estimate, so
 * the bar caps at 95% until the run completes. */
export default function ProgressBar({ step, estimatedTotal, active }: ProgressBarProps) {
  const pct = active
    ? Math.min(95, (step / estimatedTotal) * 100)
    : step > 0
      ? 100
      : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-1.5 flex-1 rounded-full bg-terminal-line overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-sky-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-slate-400 whitespace-nowrap">
        Step {step} of ~{estimatedTotal}
      </span>
    </div>
  );
}
