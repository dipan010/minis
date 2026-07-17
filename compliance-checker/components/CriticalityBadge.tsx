import type { Criticality } from "@/lib/types";

const META: Record<Criticality, { label: string; bg: string; fg: string }> = {
  mandatory: { label: "Mandatory", bg: "#FBE9E9", fg: "#B91C1C" },
  recommended: { label: "Recommended", bg: "#FDF3E3", fg: "#B45309" },
  optional: { label: "Optional", bg: "#EEF2F6", fg: "#5F6C7B" },
};

/** Mandatory / recommended / optional pill. */
export default function CriticalityBadge({ criticality }: { criticality: Criticality }) {
  const meta = META[criticality];
  return (
    <span
      className="inline-block font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: meta.bg, color: meta.fg }}
    >
      {meta.label}
    </span>
  );
}
