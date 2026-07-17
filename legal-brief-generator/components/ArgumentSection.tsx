"use client";

import { useState } from "react";
import type { LegalArgument } from "@/lib/types";
import CaseRefFootnote from "./CaseRefFootnote";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

interface ArgumentSectionProps {
  argument: LegalArgument;
  index: number;
  /** Running footnote counter start for this argument's references. */
  footnoteStart: number;
  id: string;
}

/** Collapsible argument: heading with Roman numeral, thesis, supporting
 * points, footnoted case references, counterargument, and rebuttal. */
export default function ArgumentSection({
  argument,
  index,
  footnoteStart,
  id,
}: ArgumentSectionProps) {
  const [open, setOpen] = useState(true);

  return (
    <section id={id} className="border-t border-line pt-4 scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-3 text-left group"
      >
        <h3 className="font-serif text-lg font-semibold text-navy leading-snug">
          {ROMAN[index] ?? index + 1}. {argument.heading}
        </h3>
        <span className="font-mono text-xs text-ink-soft shrink-0 pt-1.5 group-hover:text-ink">
          {open ? "collapse ▲" : "expand ▼"}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-4 doc-body">
          <p className="italic">{argument.thesis}</p>

          <ol className="list-decimal ml-6 space-y-1.5">
            {argument.supporting_points.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ol>

          {argument.case_references.length > 0 && (
            <div className="border-l-2 border-line pl-4">
              <p className="font-sans font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1.5">
                Authorities
              </p>
              <ul className="space-y-1.5">
                {argument.case_references.map((ref, i) => (
                  <CaseRefFootnote key={i} reference={ref} index={footnoteStart + i} />
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-md bg-parchment border border-line p-3">
              <p className="font-sans font-mono text-[11px] uppercase tracking-wide text-weak mb-1">
                Anticipated counterargument
              </p>
              <p className="text-sm">{argument.counterargument}</p>
            </div>
            <div className="rounded-md bg-parchment border border-line p-3">
              <p className="font-sans font-mono text-[11px] uppercase tracking-wide text-strong mb-1">
                Rebuttal
              </p>
              <p className="text-sm">{argument.rebuttal}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
