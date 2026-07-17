import type { TopicCluster } from "@/lib/types";

function sentimentColor(score: number): string {
  if (score > 0.15) return "var(--pos)";
  if (score < -0.15) return "var(--neg)";
  return "var(--neu)";
}

interface TopicCardProps {
  cluster: TopicCluster;
}

/** Fixed-width card for the horizontal topic strip: name, count, sentiment
 * bar (-1..1), and up to two sample post snippets. */
export default function TopicCard({ cluster }: TopicCardProps) {
  const color = sentimentColor(cluster.sentiment);
  // Map -1..1 to 0..100% for the bar fill.
  const pct = ((cluster.sentiment + 1) / 2) * 100;

  return (
    <div className="panel p-4 w-72 shrink-0 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-ink truncate">{cluster.topic}</p>
        <span className="font-mono text-[11px] text-ink-soft shrink-0">
          {cluster.count} posts
        </span>
      </div>

      <div>
        <div className="flex justify-between font-mono text-[10px] text-ink-soft mb-1">
          <span>neg</span>
          <span style={{ color }}>{cluster.sentiment.toFixed(2)}</span>
          <span>pos</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-line overflow-hidden">
          <div
            className="absolute top-0 bottom-0 w-1 rounded-full"
            style={{ left: `calc(${pct}% - 2px)`, background: color }}
          />
          <div className="absolute inset-y-0 left-1/2 w-px bg-ink-soft/30" />
        </div>
      </div>

      <div className="space-y-1.5">
        {cluster.sample_posts.slice(0, 2).map((snippet, i) => (
          <p key={i} className="text-[12px] text-ink-soft leading-snug line-clamp-2 border-l-2 border-line pl-2">
            {snippet}
          </p>
        ))}
      </div>
    </div>
  );
}
