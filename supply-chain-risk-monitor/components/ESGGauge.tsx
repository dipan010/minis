"use client";

function scoreColor(score: number): string {
  if (score >= 65) return "var(--low)";
  if (score >= 45) return "var(--med)";
  return "var(--high)";
}

function MiniGauge({ label, score }: { label: string; score: number }) {
  const size = 84;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (Math.min(100, Math.max(0, score)) / 100);
  const color = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(24,34,51,0.1)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            style={{ transition: "stroke-dasharray 800ms ease-out" }}
          />
        </svg>
        <span
          className="absolute font-mono text-lg font-bold tabular-nums"
          style={{ color }}
        >
          {score}
        </span>
      </div>
      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
        {label}
      </span>
    </div>
  );
}

interface ESGGaugeProps {
  environmental: number;
  social: number;
  governance: number;
  overall: number;
}

/** Triple mini circular gauge for E, S, G plus a large overall number. */
export default function ESGGauge({ environmental, social, governance, overall }: ESGGaugeProps) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex flex-col items-center pr-6 border-r border-line">
        <span
          className="font-mono text-5xl font-bold tabular-nums"
          style={{ color: scoreColor(overall) }}
        >
          {overall}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mt-1">
          Overall ESG
        </span>
      </div>
      <div className="flex gap-5">
        <MiniGauge label="Env" score={environmental} />
        <MiniGauge label="Social" score={social} />
        <MiniGauge label="Gov" score={governance} />
      </div>
    </div>
  );
}
