import type { AdCopyVariant } from "@/lib/types";
import { PLATFORM_COLORS } from "@/lib/types";

const PLATFORM_LABELS = { google: "Google Search", facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn" } as const;
const LIMITS = {
  google: { headline: 30, body: 90 },
  facebook: { headline: 40, body: 125 },
  instagram: { headline: 40, body: 125 },
  linkedin: { headline: 70, body: 150 },
} as const;

interface AdCopyCardProps {
  ad: AdCopyVariant;
  variantLabel: string;
}

/** Platform-styled ad preview with character counts and A/B rationale. */
export default function AdCopyCard({ ad, variantLabel }: AdCopyCardProps) {
  const color = PLATFORM_COLORS[ad.platform];
  const limits = LIMITS[ad.platform];
  const overHeadline = ad.character_counts.headline > limits.headline;
  const overBody = ad.character_counts.body > limits.body;

  return (
    <div className="panel p-4 flex flex-col gap-3" style={{ borderTopWidth: 3, borderTopColor: color }}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color }}>
          {PLATFORM_LABELS[ad.platform]}
        </span>
        <span className="font-mono text-[10px] text-ink-soft border border-line rounded-full px-2 py-0.5">
          {variantLabel}
        </span>
      </div>

      {/* mock ad rendering */}
      <div className="rounded-lg bg-base/60 border border-line p-3">
        <p className="text-sm font-semibold leading-snug" style={{ color }}>
          {ad.headline}
        </p>
        <p className="text-[13px] text-ink-soft leading-snug mt-1">{ad.body}</p>
        <span
          className="inline-block mt-2 rounded px-3 py-1 text-[11px] font-medium text-white"
          style={{ background: color }}
        >
          {ad.cta}
        </span>
      </div>

      <div className="font-mono text-[10px] text-ink-soft flex gap-4">
        <span className={overHeadline ? "text-red-400" : ""}>
          headline {ad.character_counts.headline}/{limits.headline}
        </span>
        <span className={overBody ? "text-red-400" : ""}>
          body {ad.character_counts.body}/{limits.body}
        </span>
      </div>

      <p className="text-[12px] text-ink-soft leading-snug border-l-2 border-line pl-2">
        <span className="font-mono text-[10px] uppercase tracking-wide block text-accent">
          A/B angle
        </span>
        {ad.a_b_rationale}
      </p>
    </div>
  );
}
