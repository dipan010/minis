"use client";

import { useMemo, useRef, useState } from "react";
import type { ComplianceStatus, GapAnalysis } from "@/lib/types";
import { CRITICALITY_ORDER, STATUS_META } from "@/lib/types";
import { SAMPLE_PAIRS } from "@/lib/sampleData";
import ComplianceGauge from "@/components/ComplianceGauge";
import StatusBar from "@/components/StatusBar";
import GapAlert from "@/components/GapAlert";
import RequirementRow from "@/components/RequirementRow";

type SortKey = "id" | "status" | "criticality" | "category";
const STATUS_ORDER: Record<ComplianceStatus, number> = {
  gap: 0,
  partial: 1,
  compliant: 2,
  not_applicable: 3,
};

function reportToMarkdown(report: GapAnalysis): string {
  const reqById = new Map(report.requirements.map((r) => [r.id, r]));
  const lines: string[] = [];
  lines.push(`# Gap Analysis — ${report.policy_title} vs ${report.regulation_title}`);
  lines.push("");
  lines.push(`_Generated ${report.generated_at}. AI-generated assessment — not legally binding._`);
  lines.push("");
  lines.push(`**Overall score:** ${report.overall_score}/100`);
  lines.push(
    `**Status:** ${report.status_summary.compliant} compliant · ${report.status_summary.partial} partial · ${report.status_summary.gap} gap · ${report.status_summary.not_applicable} N/A`
  );
  lines.push("");
  lines.push("## Executive summary");
  lines.push("");
  lines.push(report.executive_summary);
  lines.push("");
  lines.push("## Priority gaps");
  lines.push("");
  if (report.priority_gaps.length === 0) lines.push("_None._");
  report.priority_gaps.forEach((g) => {
    const req = reqById.get(g.requirement_id);
    lines.push(`### ${g.requirement_id} — ${req?.criticality ?? ""} ${g.status}`);
    lines.push("");
    lines.push(`> ${req?.text ?? ""}`);
    lines.push("");
    lines.push(`${g.detail}`);
    if (g.remediation) lines.push(`**Remediation:** ${g.remediation}`);
    lines.push("");
  });
  lines.push("## Recommendations");
  lines.push("");
  report.recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
  lines.push("");
  lines.push("## Full results");
  lines.push("");
  lines.push("| ID | Requirement | Category | Criticality | Status | Confidence | Policy reference |");
  lines.push("|---|---|---|---|---|---:|---|");
  report.results.forEach((res) => {
    const req = reqById.get(res.requirement_id);
    const esc = (s: string) => s.replace(/\|/g, "\\|");
    lines.push(
      `| ${res.requirement_id} | ${esc(req?.text ?? "")} | ${req?.category ?? ""} | ${req?.criticality ?? ""} | ${res.status} | ${res.confidence}% | ${esc(res.policy_reference)} |`
    );
  });
  lines.push("");
  return lines.join("\n");
}

interface DocState {
  title: string;
  text: string;
  file: File | null;
}

function DocumentPanel({
  label,
  doc,
  onChange,
  sampleLabel,
  onSample,
}: {
  label: string;
  doc: DocState;
  onChange: (doc: DocState) => void;
  sampleLabel: string;
  onSample: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">{label}</p>
        <button
          type="button"
          onClick={onSample}
          className="font-mono text-[11px] uppercase tracking-wide text-navy hover:underline"
        >
          {sampleLabel}
        </button>
      </div>
      <input
        className="w-full rounded-md border border-line px-3 py-1.5 text-sm focus:outline-none focus:border-navy"
        placeholder="Document title"
        value={doc.title}
        onChange={(e) => onChange({ ...doc, title: e.target.value })}
      />
      <textarea
        className="w-full rounded-md border border-line px-3 py-2 text-[12px] leading-relaxed focus:outline-none focus:border-navy resize-y h-48"
        placeholder={`Paste ${label.toLowerCase()} text here…`}
        value={doc.text}
        onChange={(e) => onChange({ ...doc, text: e.target.value, file: null })}
      />
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => onChange({ ...doc, file: e.target.files?.[0] ?? null })}
        />
        {doc.file ? (
          <span className="font-mono text-xs text-ink-soft flex items-center gap-2">
            {doc.file.name}
            <button
              type="button"
              className="text-gap hover:underline"
              onClick={() => {
                onChange({ ...doc, file: null });
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              remove
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-mono text-[11px] uppercase tracking-wide text-ink-soft hover:text-navy transition-colors"
          >
            or upload as PDF
          </button>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [policy, setPolicy] = useState<DocState>({ title: "", text: "", file: null });
  const [regulation, setRegulation] = useState<DocState>({ title: "", text: "", file: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<GapAnalysis | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("criticality");
  const [asc, setAsc] = useState(true);

  function loadSample(index: number) {
    const pair = SAMPLE_PAIRS[index];
    setPolicy({ title: pair.policy.title, text: pair.policy.content, file: null });
    setRegulation({ title: pair.regulation.title, text: pair.regulation.content, file: null });
    setError(null);
  }

  const canSubmit =
    (policy.file !== null || policy.text.trim().length >= 200) &&
    (regulation.file !== null || regulation.text.trim().length >= 200) &&
    !loading;

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setReport(null);

    const fd = new FormData();
    fd.append("policyTitle", policy.title);
    fd.append("regulationTitle", regulation.title);
    if (policy.file) fd.append("policyFile", policy.file);
    else fd.append("policyText", policy.text);
    if (regulation.file) fd.append("regulationFile", regulation.file);
    else fd.append("regulationText", regulation.text);

    try {
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? `HTTP ${res.status}`);
      } else {
        setReport(data as GapAnalysis);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (!report) return;
    const blob = new Blob([reportToMarkdown(report)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gap-analysis.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const reqById = useMemo(
    () => new Map((report?.requirements ?? []).map((r) => [r.id, r])),
    [report]
  );

  const sortedResults = useMemo(() => {
    if (!report) return [];
    const list = [...report.results];
    list.sort((a, b) => {
      const ra = reqById.get(a.requirement_id);
      const rb = reqById.get(b.requirement_id);
      let cmp = 0;
      if (sortKey === "id") cmp = a.requirement_id.localeCompare(b.requirement_id);
      else if (sortKey === "status") cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      else if (sortKey === "criticality")
        cmp =
          CRITICALITY_ORDER[ra?.criticality ?? "optional"] -
          CRITICALITY_ORDER[rb?.criticality ?? "optional"];
      else cmp = (ra?.category ?? "").localeCompare(rb?.category ?? "");
      if (cmp === 0) cmp = a.requirement_id.localeCompare(b.requirement_id);
      return asc ? cmp : -cmp;
    });
    return list;
  }, [report, reqById, sortKey, asc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(true);
    }
  }
  const arrow = (key: SortKey) => (sortKey === key ? (asc ? " ↑" : " ↓") : "");

  return (
    <div className="min-h-screen">
      <header className="bg-navy text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/60 mb-1">
            Governance · risk · compliance
          </p>
          <h1 className="text-xl font-semibold">Compliance Document Checker</h1>
          <p className="text-[13px] text-white/70 mt-1 max-w-2xl">
            Compare a company policy against a regulation or standard: every
            requirement is extracted, assessed, and scored. AI-assisted — not
            legal advice.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">

        {/* ── Input columns ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DocumentPanel
            label="Policy document"
            doc={policy}
            onChange={setPolicy}
            sampleLabel="Load sample 1 pair"
            onSample={() => loadSample(0)}
          />
          <DocumentPanel
            label="Regulation / standard"
            doc={regulation}
            onChange={setRegulation}
            sampleLabel="Load sample 2 pair"
            onSample={() => loadSample(1)}
          />
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleAnalyze}
            className="rounded-md bg-navy text-white text-sm font-medium px-10 py-2.5 transition-opacity disabled:opacity-40 hover:opacity-90"
          >
            {loading ? "Running gap analysis… (batched LLM calls, up to 5 min)" : "Run Gap Analysis"}
          </button>
          {error && <p className="text-sm text-gap">{error}</p>}
        </div>

        {loading && (
          <div className="panel p-8 flex items-center justify-center gap-3">
            <span className="inline-block h-5 w-5 rounded-full border-2 border-navy border-t-transparent animate-spin" />
            <p className="text-sm text-ink-soft">
              Extracting requirements → assessing in batches of 5 → summarizing…
            </p>
          </div>
        )}

        {report && (
          <>
            {/* ── Executive summary + gauge ── */}
            <div className="panel p-5 grid grid-cols-1 sm:grid-cols-[180px,1fr] gap-5 items-center">
              <div className="justify-self-center">
                <ComplianceGauge score={report.overall_score} />
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                    Executive summary
                  </p>
                  <button
                    type="button"
                    onClick={handleExport}
                    className="font-mono text-[11px] uppercase tracking-wide text-navy hover:underline"
                  >
                    ↓ Export gap analysis
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-ink-soft">{report.executive_summary}</p>
              </div>
            </div>

            {/* ── Status summary ── */}
            <div className="panel p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {(Object.keys(report.status_summary) as ComplianceStatus[]).map((status) => (
                  <div key={status} className="rounded-lg border border-line p-3 text-center">
                    <p
                      className="font-mono text-2xl font-bold tabular-nums"
                      style={{ color: STATUS_META[status].color }}
                    >
                      {report.status_summary[status]}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft">
                      {STATUS_META[status].label}
                    </p>
                  </div>
                ))}
              </div>
              <StatusBar summary={report.status_summary} />
            </div>

            {/* ── Priority gaps ── */}
            {report.priority_gaps.length > 0 && (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
                  Priority gaps ({report.priority_gaps.length})
                </p>
                <div className="space-y-3">
                  {report.priority_gaps.map((gap) => (
                    <GapAlert
                      key={gap.requirement_id}
                      result={gap}
                      requirement={reqById.get(gap.requirement_id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Full results table ── */}
            <div className="panel p-5 overflow-x-auto">
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-3">
                Full results ({report.results.length} requirements) — click a row to expand
              </p>
              <table className="w-full border-collapse min-w-[860px]">
                <thead>
                  <tr className="border-b-2 border-line text-left">
                    {(
                      [
                        ["id", "ID"],
                        [null, "Requirement"],
                        ["category", "Category"],
                        ["criticality", "Criticality"],
                        ["status", "Status"],
                        [null, "Confidence"],
                      ] as [SortKey | null, string][]
                    ).map(([key, label]) => (
                      <th
                        key={label}
                        onClick={key ? () => toggleSort(key) : undefined}
                        className={`px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-ink-soft ${key ? "cursor-pointer select-none" : ""}`}
                      >
                        {label}
                        {key ? arrow(key) : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((result) => {
                    const requirement = reqById.get(result.requirement_id);
                    if (!requirement) return null;
                    return (
                      <RequirementRow
                        key={result.requirement_id}
                        requirement={requirement}
                        result={result}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Recommendations ── */}
            <div className="panel p-5">
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-3">
                Recommendations
              </p>
              <ol className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-snug">
                    <span className="font-mono text-xs font-bold text-navy shrink-0 pt-0.5">
                      {i + 1}.
                    </span>
                    {rec}
                  </li>
                ))}
              </ol>
            </div>

            <p className="text-[11px] text-ink-soft text-center pb-4">
              AI-generated assessment — approximate requirement extraction and
              non-binding judgments. Always have qualified compliance officers
              review results. Sample regulations are simplified summaries, not
              actual legal text.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
