"use client";

import { useEffect, useState } from "react";

function scoreColor(score: number): string {
  if (score >= 80) return "var(--compliant)";
  if (score >= 55) return "var(--partial)";
  return "var(--gap)";
}

interface ComplianceGaugeProps {
  score: number; // 0-100
}

/** Large circular gauge for the overall compliance score. */
export default function ComplianceGauge({ score }: ComplianceGaugeProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setDisplayed(clamped));
    return () => cancelAnimationFrame(raf);
  }, [clamped]);

  const size = 160;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (displayed / 100);
  const color = scoreColor(clamped);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(28,37,48,0.1)"
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
          style={{ transition: "stroke-dasharray 900ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-4xl font-bold tabular-nums" style={{ color }}>
          {clamped}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-soft">
          / 100
        </span>
      </div>
    </div>
  );
}
