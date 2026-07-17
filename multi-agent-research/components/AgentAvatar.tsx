import type { AgentRole } from "@/lib/types";
import { AGENT_META } from "@/lib/types";

interface AgentAvatarProps {
  role: AgentRole;
  size?: "sm" | "md";
}

/** Colored circular icon for an agent role. */
export default function AgentAvatar({ role, size = "sm" }: AgentAvatarProps) {
  const meta = AGENT_META[role];
  const dim = size === "sm" ? "h-6 w-6 text-xs" : "h-9 w-9 text-base";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-mono shrink-0 ${dim}`}
      style={{ background: `color-mix(in srgb, ${meta.color} 22%, transparent)`, color: meta.color }}
      title={meta.label}
      aria-label={meta.label}
    >
      {meta.icon}
    </span>
  );
}
