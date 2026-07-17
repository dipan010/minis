"use client";

import { useState } from "react";
import type { InterviewQuestion, QuestionBank as QuestionBankData } from "@/lib/types";

interface CategoryMeta {
  key: keyof QuestionBankData;
  title: string;
  subtitle: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    key: "technical",
    title: "Technical",
    subtitle: "Probes the specific skill gaps found during scoring",
  },
  {
    key: "behavioural",
    title: "Behavioural",
    subtitle: "STAR-format questions tied to the role's responsibilities",
  },
  {
    key: "culture",
    title: "Culture Fit",
    subtitle: "Based on company values extracted from the job description",
  },
];

function QuestionItem({ q, index }: { q: InterviewQuestion; index: number }) {
  const [showRationale, setShowRationale] = useState(false);

  return (
    <li className="py-4 border-b border-hairline last:border-b-0">
      <div className="flex gap-3">
        <span className="font-mono text-xs text-ink-soft pt-0.5 shrink-0">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink leading-relaxed">{q.question}</p>

          <button
            type="button"
            onClick={() => setShowRationale((v) => !v)}
            className="mt-2 font-mono text-[11px] uppercase tracking-wide text-ink-soft hover:text-ink transition-colors"
          >
            {showRationale ? "▲ hide" : "▼ why this question"}
          </button>

          {showRationale && (
            <p className="mt-2 text-sm text-ink-soft leading-relaxed border-l-2 border-hairline pl-3">
              {q.rationale}
            </p>
          )}

          <div className="mt-3 rounded-md px-3 py-2" style={{ background: "rgba(47,111,94,0.06)" }}>
            <p className="font-mono text-[10px] uppercase tracking-wide text-match mb-1">
              What good looks like
            </p>
            <p className="text-sm text-ink-soft leading-snug">{q.what_to_look_for}</p>
          </div>
        </div>
      </div>
    </li>
  );
}

function CategoryAccordion({
  meta,
  questions,
  defaultOpen,
}: {
  meta: CategoryMeta;
  questions: InterviewQuestion[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="report-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div>
          <p className="font-display text-lg font-semibold text-ink">
            {meta.title}
            <span className="font-mono text-xs text-ink-soft ml-2">
              {questions.length} questions
            </span>
          </p>
          <p className="text-xs text-ink-soft mt-0.5">{meta.subtitle}</p>
        </div>
        <span className="font-mono text-sm text-ink-soft shrink-0">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <ul className="px-5 pb-2 border-t border-hairline">
          {questions.map((q, i) => (
            <QuestionItem key={i} q={q} index={i} />
          ))}
        </ul>
      )}
    </div>
  );
}

interface QuestionBankProps {
  bank: QuestionBankData;
}

export default function QuestionBank({ bank }: QuestionBankProps) {
  return (
    <div className="space-y-4">
      {CATEGORIES.map((meta, i) => (
        <CategoryAccordion
          key={meta.key}
          meta={meta}
          questions={bank[meta.key] ?? []}
          defaultOpen={i === 0}
        />
      ))}
    </div>
  );
}
