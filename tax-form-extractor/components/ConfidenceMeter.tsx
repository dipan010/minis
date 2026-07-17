export function confidenceColor(confidence: number): string {
  if (confidence > 80) return "var(--ok)";
  if (confidence >= 50) return "var(--warn)";
  return "var(--bad)";
}

export function confidenceLabel(confidence: number): string {
  if (confidence > 80) return "high";
  if (confidence >= 50) return "review";
  return "low";
}

interface ConfidenceMeterProps {
  confidence: number;
}

/** Small horizontal bar showing confidence %, colored by threshold. */
export default function ConfidenceMeter({ confidence }: ConfidenceMeterProps) {
  const clamped = Math.min(100, Math.max(0, confidence));
  const color = confidenceColor(clamped);

  return (
    <div className="flex items-center gap-2 w-28 shrink-0">
      <div className="relative h-1.5 flex-1 rounded-full bg-line overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
      <span className="font-mono text-[11px] tabular-nums w-8 text-right" style={{ color }}>
        {clamped}%
      </span>
    </div>
  );
}
