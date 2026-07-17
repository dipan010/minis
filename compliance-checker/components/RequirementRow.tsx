"use client";

import { useState } from "react";
import type { ComplianceResult, Requirement } from "@/lib/types";
import { STATUS_META } from "@/lib/types";
import CriticalityBadge from "./CriticalityBadge";

interface RequirementRowProps {
  requirement: Requirement;
  result: ComplianceResult;
}

/** Expandable results-table row: compact line with badges + confidence bar;
 * detail, policy reference, and remediation on expand. */
export default function RequirementRow({ requirement, result }: RequirementRowProps) {
  const [open, setOpen] = useState(false);
  const statusColor = STATUS_META[result.status].color;
  const truncated =
    requirement.text.length > 110 ? `${requirement.text.slice(0, 110)}…` : requirement.text;

  return (
    <>
      <tr
        className="border-b border-line/70 hover:bg-surface cursor-pointer transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
          <span className="text-ink-soft mr-1">{open ? "▾" : "▸"}</span>
          {requirement.id}
        </td>
        <td className="px-3 py-2 text-[13px] leading-snug min-w-64">{truncated}</td>
        <td className="px-3 py-2 text-xs text-ink-soft whitespace-nowrap">{requirement.category}</td>
        <td className="px-3 py-2">
          <CriticalityBadge criticality={requirement.criticality} />
        </td>
        <td className="px-3 py-2">
          <span
            className="font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full text-white whitespace-nowrap"
            style={{ background: statusColor }}
          >
            {STATUS_META[result.status].label}
          </span>
        </td>
        <td className="px-3 py-2 w-28">
          <div className="flex items-center gap-1.5">
            <div className="relative h-1.5 flex-1 rounded-full bg-line overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${result.confidence}%`, background: statusColor }}
              />
            </div>
            <span className="font-mono text-[10px] text-ink-soft tabular-nums">
              {result.confidence}
            </span>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-line/70 bg-surface/60">
          <td colSpan={6} className="px-3 py-3">
            <div className="ml-6 space-y-2 max-w-3xl">
              <p className="text-[13px] leading-snug">
                <span className="font-mono text-[10px] uppercase tracking-wide text-ink-soft block">
                  Full requirement ({requirement.section})
                </span>
                {requirement.text}
              </p>
              <p className="text-[13px] text-ink-soft leading-snug">
                <span className="font-mono text-[10px] uppercase tracking-wide block">
                  Assessment
                </span>
                {result.detail}
              </p>
              <p className="text-[13px] text-ink-soft leading-snug">
                <span className="font-mono text-[10px] uppercase tracking-wide block">
                  Policy reference
                </span>
                {result.policy_reference || "none"}
              </p>
              {result.remediation && result.remediation.toLowerCase() !== "none needed" && (
                <p className="text-[13px] leading-snug">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-ink-soft block">
                    Remediation
                  </span>
                  {result.remediation}
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
