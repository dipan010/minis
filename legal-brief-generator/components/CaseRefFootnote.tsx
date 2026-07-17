import type { CaseReference } from "@/lib/types";

interface CaseRefFootnoteProps {
  reference: CaseReference;
  index: number;
}

/** Footnote-styled case reference with a synthetic-reference warning tag. */
export default function CaseRefFootnote({ reference, index }: CaseRefFootnoteProps) {
  return (
    <li className="flex gap-2 text-[13px] leading-snug">
      <span className="font-mono text-xs text-ink-soft shrink-0 pt-0.5">[{index}]</span>
      <span>
        <span className="font-serif italic">{reference.case_name}</span>
        {reference.citation && (
          <span className="font-mono text-xs text-ink-soft">, {reference.citation}</span>
        )}
        {" — "}
        <span className="text-ink-soft">{reference.relevance}</span>
        {reference.is_synthetic && (
          <span className="ml-2 inline-block rounded bg-warnbg border border-moderate/40 px-1.5 py-0.5 text-[11px] text-moderate whitespace-nowrap">
            ⚠ Synthetic reference — verify before use
          </span>
        )}
      </span>
    </li>
  );
}
