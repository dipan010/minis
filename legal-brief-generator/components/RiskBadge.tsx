import type { BriefStrength } from "@/lib/types";

const STRENGTH_META: Record<BriefStrength, { color: string; label: string }> = {
  strong: { color: "#1F6B4A", label: "Strong position" },
  moderate: { color: "#9A6E1B", label: "Moderate position" },
  weak: { color: "#9C3B2E", label: "Weak position" },
};

interface RiskBadgeProps {
  strength: BriefStrength;
  confidence: number;
}

/** Strength indicator pill with confidence percentage. */
export default function RiskBadge({ strength, confidence }: RiskBadgeProps) {
  const meta = STRENGTH_META[strength];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-white text-xs font-medium"
      style={{ background: meta.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
      {meta.label}
      <span className="font-mono opacity-80">{confidence}%</span>
    </span>
  );
}
