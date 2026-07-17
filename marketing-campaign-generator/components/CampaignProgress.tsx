import type { GenerationPhase } from "@/lib/types";
import { PHASE_LABELS } from "@/lib/types";

const PHASES: GenerationPhase[] = ["ads", "emails", "social", "calendar"];

interface CampaignProgressProps {
  /** Currently active phase; phases before it render as done. */
  active: GenerationPhase;
}

/** Multi-step generation indicator (client-side simulated pacing — the API
 * is a single request, so steps advance on a timer while it runs). */
export default function CampaignProgress({ active }: CampaignProgressProps) {
  const activeIndex = PHASES.indexOf(active);

  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {PHASES.map((phase, i) => {
        const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
        return (
          <li key={phase} className="flex items-center gap-2">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] ${
                state === "done"
                  ? "bg-accent text-base"
                  : state === "active"
                    ? "border-2 border-accent text-accent animate-pulse"
                    : "border border-line text-ink-soft"
              }`}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <span
              className={`text-[12px] ${
                state === "pending" ? "text-ink-soft" : "text-ink"
              }`}
            >
              {PHASE_LABELS[phase]}
            </span>
            {i < PHASES.length - 1 && <span className="text-line">—</span>}
          </li>
        );
      })}
    </ol>
  );
}
