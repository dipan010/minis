import type { CriterionScore } from "@/lib/types";
import ScoreMeter from "./ScoreMeter";

export default function CriterionRow({ name, score, rationale }: CriterionScore) {
  return (
    <div className="border-b border-hairline py-4 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-body text-sm font-medium text-ink">{name}</h3>
        <span className="font-mono text-sm tabular-nums text-ink-soft shrink-0">
          {score}/100
        </span>
      </div>

      <div className="mt-2">
        <ScoreMeter score={score} size="sm" />
      </div>

      <p className="mt-2 font-body text-sm leading-relaxed text-ink-soft">
        {rationale}
      </p>
    </div>
  );
}
