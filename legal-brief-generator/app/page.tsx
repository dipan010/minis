"use client";

import { useMemo, useState } from "react";
import type {
  AreaOfLaw,
  CaseInput,
  ClientPosition,
  Jurisdiction,
  LegalBrief,
} from "@/lib/types";
import { AREA_LABELS, JURISDICTION_LABELS, POSITIONS } from "@/lib/types";
import { SAMPLE_CASES } from "@/lib/sampleCases";
import { briefToMarkdown } from "@/lib/exportBrief";
import ArgumentSection from "@/components/ArgumentSection";
import RiskBadge from "@/components/RiskBadge";
import TableOfContents, { type TocEntry } from "@/components/TableOfContents";

const EMPTY_INPUT: CaseInput = {
  title: "",
  jurisdiction: "US_Federal",
  area_of_law: "contract",
  facts: "",
  client_position: "plaintiff",
  desired_outcome: "",
  key_issues: [],
};

const inputCls =
  "w-full rounded-md border border-line bg-ivory px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy";

const labelCls = "block text-[12px] font-medium text-ink-soft mb-1";

export default function Home() {
  const [input, setInput] = useState<CaseInput>(EMPTY_INPUT);
  const [issueDraft, setIssueDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<LegalBrief | null>(null);

  function patch(patchObj: Partial<CaseInput>) {
    setInput((prev) => ({ ...prev, ...patchObj }));
  }

  function addIssue() {
    const issue = issueDraft.trim();
    if (!issue) return;
    patch({ key_issues: [...(input.key_issues ?? []), issue] });
    setIssueDraft("");
  }

  function removeIssue(index: number) {
    patch({ key_issues: (input.key_issues ?? []).filter((_, i) => i !== index) });
  }

  function loadSample(index: number) {
    setInput(JSON.parse(JSON.stringify(SAMPLE_CASES[index])) as CaseInput);
    setError(null);
  }

  const canSubmit =
    input.title.trim().length > 0 &&
    input.facts.trim().length >= 50 &&
    input.desired_outcome.trim().length > 0 &&
    !loading;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setBrief(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? `HTTP ${res.status}`);
      } else {
        setBrief(data as LegalBrief);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (!brief) return;
    const blob = new Blob([briefToMarkdown(brief)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "legal-brief.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const tocEntries = useMemo<TocEntry[]>(() => {
    if (!brief) return [];
    return [
      { id: "executive-summary", label: "Executive Summary" },
      { id: "statement-of-facts", label: "Statement of Facts" },
      { id: "issues-presented", label: "Issues Presented" },
      ...brief.arguments.map((arg, i) => ({
        id: `argument-${i}`,
        label: arg.heading,
        indent: true,
      })),
      { id: "counterarguments", label: "Counterarguments Summary" },
      { id: "strategy", label: "Recommended Strategy" },
      { id: "risk-assessment", label: "Risk Assessment" },
    ];
  }, [brief]);

  // Footnote numbering runs across all arguments.
  const footnoteStarts = useMemo(() => {
    if (!brief) return [];
    const starts: number[] = [];
    let count = 1;
    for (const arg of brief.arguments) {
      starts.push(count);
      count += arg.case_references.length;
    }
    return starts;
  }, [brief]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-ivory">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-soft mb-1">
            Litigation support · demonstration
          </p>
          <h1 className="font-serif text-2xl font-semibold text-navy">
            Legal Brief Generator
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[400px,1fr] gap-6 items-start">

        {/* ── LEFT: case input form ── */}
        <div className="document p-5 space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
              Sample cases
            </p>
            <div className="flex flex-col gap-1.5">
              {SAMPLE_CASES.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => loadSample(i)}
                  className="text-left rounded-md border border-line px-3 py-1.5 text-[13px] text-ink hover:border-navy hover:text-navy transition-colors"
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-line pt-4 space-y-3">
            <div>
              <label className={labelCls}>Case title</label>
              <input
                className={inputCls}
                value={input.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Breach of Software License Agreement"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Jurisdiction</label>
                <select
                  className={inputCls}
                  value={input.jurisdiction}
                  onChange={(e) => patch({ jurisdiction: e.target.value as Jurisdiction })}
                >
                  {(Object.keys(JURISDICTION_LABELS) as Jurisdiction[]).map((j) => (
                    <option key={j} value={j}>
                      {JURISDICTION_LABELS[j]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Area of law</label>
                <select
                  className={inputCls}
                  value={input.area_of_law}
                  onChange={(e) => patch({ area_of_law: e.target.value as AreaOfLaw })}
                >
                  {(Object.keys(AREA_LABELS) as AreaOfLaw[]).map((a) => (
                    <option key={a} value={a}>
                      {AREA_LABELS[a]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Client position</label>
              <div className="grid grid-cols-2 gap-1.5">
                {POSITIONS.map((pos) => (
                  <label
                    key={pos}
                    className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                      input.client_position === pos
                        ? "border-navy bg-navy text-white"
                        : "border-line text-ink hover:border-navy"
                    }`}
                  >
                    <input
                      type="radio"
                      name="client_position"
                      className="sr-only"
                      checked={input.client_position === pos}
                      onChange={() => patch({ client_position: pos as ClientPosition })}
                    />
                    {pos}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Facts</label>
              <textarea
                className={`${inputCls} resize-y`}
                style={{ minHeight: 200 }}
                value={input.facts}
                onChange={(e) => patch({ facts: e.target.value })}
                placeholder="Describe the facts of the case…"
              />
            </div>

            <div>
              <label className={labelCls}>Desired outcome</label>
              <textarea
                className={`${inputCls} resize-y min-h-16`}
                value={input.desired_outcome}
                onChange={(e) => patch({ desired_outcome: e.target.value })}
                placeholder="What result does the client want?"
              />
            </div>

            <div>
              <label className={labelCls}>Key issues (type + Enter to add)</label>
              <input
                className={inputCls}
                value={issueDraft}
                onChange={(e) => setIssueDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addIssue();
                  }
                }}
                placeholder="e.g. pretext"
              />
              {(input.key_issues?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {input.key_issues!.map((issue, i) => (
                    <span
                      key={`${issue}-${i}`}
                      className="inline-flex items-center gap-1 rounded-full bg-navy/10 text-navy px-2.5 py-0.5 text-xs"
                    >
                      {issue}
                      <button
                        type="button"
                        onClick={() => removeIssue(i)}
                        className="hover:text-weak"
                        aria-label={`Remove ${issue}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleGenerate}
              className="w-full rounded-md bg-navy text-white text-sm font-medium py-2.5 transition-opacity disabled:opacity-40 hover:opacity-90"
            >
              {loading ? "Drafting brief… (may take a few minutes)" : "Generate Brief"}
            </button>
            {error && <p className="text-sm text-weak">{error}</p>}
          </div>
        </div>

        {/* ── RIGHT: generated brief ── */}
        <div>
          {!brief && !loading && (
            <div className="document p-12 text-center">
              <p className="font-serif italic text-ink-soft">
                Load a sample case or enter case facts, then generate the brief.
                The drafted document will appear here.
              </p>
            </div>
          )}

          {loading && (
            <div className="document p-12 flex items-center justify-center gap-3">
              <span className="inline-block h-5 w-5 rounded-full border-2 border-navy border-t-transparent animate-spin" />
              <p className="font-serif italic text-ink-soft">
                Drafting arguments, counterarguments, and strategy…
              </p>
            </div>
          )}

          {brief && (
            <div className="grid grid-cols-1 xl:grid-cols-[200px,1fr] gap-6 items-start">
              <div className="hidden xl:block">
                <TableOfContents entries={tocEntries} />
              </div>

              <article className="document p-6 sm:p-10">
                {/* Disclaimer banner */}
                <div className="rounded-md bg-warnbg border border-moderate/40 px-4 py-3 mb-8">
                  <p className="text-[13px] text-moderate leading-snug">
                    ⚠ {brief.disclaimer}
                  </p>
                </div>

                {/* Document header */}
                <header className="text-center border-b-2 border-navy pb-6 mb-8">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft mb-2">
                    {brief.jurisdiction}
                  </p>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy leading-tight">
                    {brief.title}
                  </h2>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <RiskBadge
                      strength={brief.risk_assessment.strength}
                      confidence={brief.risk_assessment.confidence}
                    />
                    <button
                      type="button"
                      onClick={handleExport}
                      className="font-mono text-[11px] uppercase tracking-wide text-ink-soft hover:text-navy transition-colors"
                    >
                      ↓ Export as Markdown
                    </button>
                  </div>
                </header>

                <div className="space-y-8">
                  <section id="executive-summary" className="scroll-mt-24">
                    <h3 className="font-serif text-lg font-semibold text-navy mb-2">
                      Executive Summary
                    </h3>
                    <p className="doc-body">{brief.executive_summary}</p>
                  </section>

                  <section id="statement-of-facts" className="scroll-mt-24">
                    <h3 className="font-serif text-lg font-semibold text-navy mb-2">
                      Statement of Facts
                    </h3>
                    <p className="doc-body whitespace-pre-line">{brief.statement_of_facts}</p>
                  </section>

                  <section id="issues-presented" className="scroll-mt-24">
                    <h3 className="font-serif text-lg font-semibold text-navy mb-2">
                      Issues Presented
                    </h3>
                    <ol className="list-decimal ml-6 space-y-1.5 doc-body">
                      {brief.issues_presented.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ol>
                  </section>

                  <div className="space-y-6">
                    <h3 className="font-serif text-lg font-semibold text-navy">Arguments</h3>
                    {brief.arguments.map((arg, i) => (
                      <ArgumentSection
                        key={i}
                        argument={arg}
                        index={i}
                        id={`argument-${i}`}
                        footnoteStart={footnoteStarts[i] ?? 1}
                      />
                    ))}
                  </div>

                  <section id="counterarguments" className="scroll-mt-24 border-t border-line pt-6">
                    <h3 className="font-serif text-lg font-semibold text-navy mb-2">
                      Counterarguments Summary
                    </h3>
                    <p className="doc-body">{brief.counterarguments_summary}</p>
                  </section>

                  <section id="strategy" className="scroll-mt-24">
                    <h3 className="font-serif text-lg font-semibold text-navy mb-2">
                      Recommended Strategy
                    </h3>
                    <p className="doc-body">{brief.recommended_strategy}</p>
                  </section>

                  <section
                    id="risk-assessment"
                    className="scroll-mt-24 rounded-lg border border-line bg-parchment p-5"
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h3 className="font-serif text-lg font-semibold text-navy">
                        Risk Assessment
                      </h3>
                      <RiskBadge
                        strength={brief.risk_assessment.strength}
                        confidence={brief.risk_assessment.confidence}
                      />
                    </div>
                    <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1.5">
                      Key vulnerabilities
                    </p>
                    <ul className="space-y-1.5 doc-body">
                      {brief.risk_assessment.key_vulnerabilities.map((v, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-weak shrink-0">▸</span>
                          {v}
                        </li>
                      ))}
                    </ul>
                  </section>

                  {/* Full-width bottom disclaimer */}
                  <div className="rounded-md bg-warnbg border border-moderate/40 px-4 py-3">
                    <p className="text-[13px] text-moderate leading-snug text-center">
                      ⚠ {brief.disclaimer}
                    </p>
                  </div>
                </div>
              </article>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
