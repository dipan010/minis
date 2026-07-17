import type { Sentiment } from "@/lib/types";
import { SENTIMENT_COLORS } from "@/lib/types";

interface SentimentBadgeProps {
  sentiment: Sentiment;
  score?: number;
}

/** Colored pill: green / red / slate. */
export default function SentimentBadge({ sentiment, score }: SentimentBadgeProps) {
  const color = SENTIMENT_COLORS[sentiment];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide"
      style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      {sentiment}
      {score !== undefined && <span className="opacity-75">{score.toFixed(1)}</span>}
    </span>
  );
}
