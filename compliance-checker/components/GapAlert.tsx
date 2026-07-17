import type { ComplianceResult, Requirement } from "@/lib/types";
import { STATUS_META } from "@/lib/types";
import CriticalityBadge from "./CriticalityBadge";

interface GapAlertProps {
  result: ComplianceResult;
  requirement?: Requirement;
}

/** Priority-gap alert card with remediation. */
export default function GapAlert({ result, requirement }: GapAlertProps) {
  const color = STATUS_META[result.status].color;

  return (
    <div className="panel p-4" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <span className="font-mono text-xs font-bold">{result.requirement_id}</span>
        {requirement && <CriticalityBadge criticality={requirement.criticality} />}
        <span
          className="font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full text-white"
          style={{ background: color }}
        >
          {STATUS_META[result.status].label}
        </span>
        {requirement && (
          <span className="text-[11px] text-ink-soft">
            {requirement.section} · {requirement.category}
          </span>
        )}
      </div>
      {requirement && <p className="text-sm font-medium leading-snug mb-1">{requirement.text}</p>}
      <p className="text-[13px] text-ink-soft leading-snug mb-2">{result.detail}</p>
      {result.remediation && result.remediation.toLowerCase() !== "none needed" && (
        <p className="text-[13px] leading-snug">
          <span className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mr-1.5">
            Remediation
          </span>
          {result.remediation}
        </p>
      )}
    </div>
  );
}
