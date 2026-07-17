"use client";

import { useEffect, useState } from "react";
import type { RiskLevel } from "@/lib/types";

export function gaugeColor(score: number): string {
  if (score >= 80) return "var(--good)";
  if (score >= 60) return "var(--caution)";
  if (score >= 40) return "var(--danger)";
  return "var(--critical)";
}

export const RISK_LEVEL_COLOR: Record<RiskLevel, string> = {
  low: "var(--good)",
  medium: "var(--caution)",
  high: "var(--danger)",
  critical: "var(--critical)",
};

interface ConfidenceGaugeProps {
  score: number; // 0-100
}

/** SVG circular gauge with an animated fill that sweeps from 0 to the score
 * on mount, colored red→amber→green by band. */
export default function ConfidenceGauge({ score }: ConfidenceGaugeProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    // trigger the CSS stroke transition after first paint
    const raf = requestAnimationFrame(() => setDisplayed(clamped));
    return () => cancelAnimationFrame(raf);
  }, [clamped]);

  const size = 200;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // 270° arc, opening at the bottom
  const arc = circumference * 0.75;
  const filled = arc * (displayed / 100);
  const color = gaugeColor(clamped);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="rotate-[135deg]">
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(23,35,58,0.12)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
        />
        {/* fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: "stroke-dasharray 900ms ease-out, stroke 400ms" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-5xl font-bold tabular-nums" style={{ color }}>
          {clamped}
        </span>
        <span className="text-xs uppercase tracking-widest text-ink-soft mt-1">
          confidence
        </span>
      </div>
    </div>
  );
}
