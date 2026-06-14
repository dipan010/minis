export function bandColor(score: number): string {
  if (score >= 75) return "var(--match)";
  if (score >= 50) return "var(--partial)";
  return "var(--gap)";
}

interface ScoreMeterProps {
  score: number;
  size?: "lg" | "sm";
}

export default function ScoreMeter({ score, size = "lg" }: ScoreMeterProps) {
  const trackH = size === "lg" ? "10px" : "6px";
  const markerSize = size === "lg" ? 16 : 12;
  const tickH = size === "lg" ? 8 : 5;
  const color = bandColor(score);
  const clampedScore = Math.min(100, Math.max(0, score));

  return (
    <div className="w-full">
      {/* Track + fill + marker */}
      <div className="relative" style={{ height: trackH }}>
        {/* Track */}
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: "var(--hairline)" }}
        />

        {/* Fill */}
        <div
          className="absolute left-0 top-0 rounded-full transition-all duration-700 ease-out"
          style={{
            height: trackH,
            width: `${clampedScore}%`,
            background: color,
          }}
        />

        {/* Marker */}
        <div
          className="absolute top-1/2"
          style={{
            left: `${clampedScore}%`,
            transform: "translate(-50%, -50%)",
            width: markerSize,
            height: markerSize,
            borderRadius: "50%",
            background: color,
            border: "2px solid white",
          }}
        />
      </div>

      {/* Tick marks */}
      <div className="flex justify-between" style={{ marginTop: 3 }}>
        {Array.from({ length: 11 }, (_, i) => (
          <div
            key={i}
            style={{
              width: 1,
              height: tickH,
              background:
                i === 0 || i === 10
                  ? "transparent"
                  : "rgba(32,42,60,0.18)",
            }}
          />
        ))}
      </div>

      {/* Labels — lg only */}
      {size === "lg" && (
        <div className="flex justify-between mt-1">
          <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">0</span>
          <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">50</span>
          <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">100</span>
        </div>
      )}
    </div>
  );
}
