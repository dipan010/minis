export function riskColor(score: number): string {
  if (score > 75) return "var(--bad)";
  if (score > 50) return "var(--warn)";
  return "var(--ok)";
}

interface RiskBadgeProps {
  score: number;
}

/** Colored risk-score badge. */
export default function RiskBadge({ score }: RiskBadgeProps) {
  const color = riskColor(score);
  return (
    <span
      className="inline-block font-mono text-[11px] font-bold tabular-nums rounded px-1.5 py-0.5 min-w-9 text-center"
      style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
    >
      {score}
    </span>
  );
}
