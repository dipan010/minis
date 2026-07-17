"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AgentMessage as AgentMessageData,
  ResearchDepth,
  ResearchFormat,
  ResearchReport,
  ReviewResult,
  StreamEvent,
} from "@/lib/types";
import { DEPTH_STEP_ESTIMATE } from "@/lib/types";
import { SAMPLE_RESEARCH } from "@/lib/sampleData";
import AgentMessage from "@/components/AgentMessage";
import ProgressBar from "@/components/ProgressBar";
import ReportDocument from "@/components/ReportDocument";
import TableOfContents, { type TocEntry } from "@/components/TableOfContents";

function reportToMarkdown(report: ResearchReport, review: ReviewResult): string {
  const lines: string[] = [];
  lines.push(`# ${report.title}`);
  lines.push("");
  lines.push(
    `_Reviewer score: ${review.score}/100 · ${report.metadata.depth} depth · ${report.metadata.total_steps} agent steps · all findings and references are AI-generated._`
  );
  lines.push("");
  lines.push("## Abstract");
  lines.push("");
  lines.push(report.abstract);
  lines.push("");
  report.sections.forEach((s, i) => {
    lines.push(`## ${i + 1}. ${s.heading}`);
    lines.push("");
    lines.push(s.content);
    lines.push("");
  });
  lines.push("## Conclusion");
  lines.push("");
  lines.push(report.conclusion);
  lines.push("");
  lines.push("## Limitations");
  lines.push("");
  report.limitations.forEach((l) => lines.push(`- ${l}`));
  lines.push("");
  lines.push("## References (simulated)");
  lines.push("");
  report.simulated_references.forEach((r) =>
    lines.push(`${r.id}. ${r.text} *(⚠ simulated reference)*`)
  );
  lines.push("");
  return lines.join("\n");
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [depth, setDepth] = useState<ResearchDepth>("standard");
  const [format, setFormat] = useState<ResearchFormat>("report");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessageData[]>([]);
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [showTrace, setShowTrace] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // auto-scroll the activity feed as messages arrive
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function loadSample(index: number) {
    const sample = SAMPLE_RESEARCH[index];
    setQuestion(sample.question);
    setError(null);
    setMessages([]);
    setReport(sample.report);
    setReview(sample.review);
    setShowTrace(false);
  }

  async function handleStart() {
    if (!question.trim() || running) return;
    setRunning(true);
    setError(null);
    setMessages([]);
    setReport(null);
    setReview(null);
    setShowTrace(false);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), depth, format }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let boundary: number;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const chunk = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const dataLine = chunk
            .split("\n")
            .find((line) => line.startsWith("data: "));
          if (!dataLine) continue;

          const event = JSON.parse(dataLine.slice(6)) as StreamEvent;
          if (event.kind === "message") {
            setMessages((prev) => [...prev, event.message]);
          } else if (event.kind === "report") {
            setReport(event.report);
            setReview(event.review);
          } else if (event.kind === "error") {
            setError(event.error);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  function handleExport() {
    if (!report || !review) return;
    const blob = new Blob([reportToMarkdown(report, review)], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "research-report.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const tocEntries = useMemo<TocEntry[]>(() => {
    if (!report) return [];
    return [
      { id: "abstract", label: "Abstract" },
      ...report.sections.map((s, i) => ({
        id: `section-${i}`,
        label: `${i + 1}. ${s.heading}`,
        indent: true,
      })),
      { id: "conclusion", label: "Conclusion" },
      { id: "limitations", label: "Limitations" },
      { id: "references", label: "References" },
    ];
  }, [report]);

  const showFeed = running || (messages.length > 0 && (showTrace || !report));

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">

        {/* ── Header + query input ── */}
        <div className="panel p-5">
          <h1 className="text-xl font-semibold text-ink mb-1">
            Multi-Agent Research Assistant
          </h1>
          <p className="text-[13px] text-ink-soft mb-4 max-w-3xl">
            Planner → Researcher → Writer → Reviewer. Four specialized agents
            collaborate on your question, streaming their activity live. All
            findings and references are AI-generated — no web access.
          </p>

          <textarea
            className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ink/20 resize-y min-h-20"
            placeholder="What research question should the agents tackle?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                Depth
              </span>
              {(["quick", "standard", "deep"] as ResearchDepth[]).map((d) => (
                <label key={d} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="depth"
                    checked={depth === d}
                    onChange={() => setDepth(d)}
                    className="accent-[#20242C]"
                  />
                  {d}
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                Format
              </span>
              <select
                className="rounded-md border border-line bg-card px-2.5 py-1.5 text-sm focus:outline-none"
                value={format}
                onChange={(e) => setFormat(e.target.value as ResearchFormat)}
              >
                <option value="report">Report</option>
                <option value="briefing">Briefing</option>
                <option value="comparison">Comparison</option>
              </select>
            </div>
            <button
              type="button"
              disabled={!question.trim() || running}
              onClick={handleStart}
              className="ml-auto rounded-lg bg-ink text-surface text-sm font-medium px-6 py-2 transition-opacity disabled:opacity-40 hover:opacity-90"
            >
              {running ? "Agents working…" : "Start Research"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-line">
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
              Samples (no Ollama needed):
            </span>
            {SAMPLE_RESEARCH.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => loadSample(i)}
                className="rounded-md border border-line px-3 py-1 text-[13px] text-ink hover:border-ink transition-colors text-left"
              >
                {s.question.length > 56 ? `${s.question.slice(0, 56)}…` : s.question}
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-red-700 mt-3">{error}</p>}
        </div>

        {/* ── Agent activity feed ── */}
        {showFeed && (
          <div className="bg-terminal rounded-xl border border-terminal-line overflow-hidden">
            <div className="px-4 py-3 border-b border-terminal-line flex items-center gap-4">
              <span className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
                Agent activity
              </span>
              <div className="flex-1">
                <ProgressBar
                  step={messages.length}
                  estimatedTotal={DEPTH_STEP_ESTIMATE[depth]}
                  active={running}
                />
              </div>
            </div>
            <div ref={feedRef} className="max-h-96 overflow-y-auto">
              {messages.map((message, i) => (
                <AgentMessage key={i} message={message} />
              ))}
              {running && (
                <div className="px-4 py-3 font-mono text-xs text-slate-500 animate-pulse">
                  ▋ waiting for next agent step…
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Final report ── */}
        {report && review && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                Final report
              </p>
              <div className="flex gap-4">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowTrace((v) => !v)}
                    className="font-mono text-[11px] uppercase tracking-wide text-ink-soft hover:text-ink transition-colors"
                  >
                    {showTrace ? "Hide agent trace" : "View agent trace"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleExport}
                  className="font-mono text-[11px] uppercase tracking-wide text-ink-soft hover:text-ink transition-colors"
                >
                  ↓ Export as Markdown
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[210px,1fr] gap-6 items-start">
              <div className="hidden xl:block">
                <TableOfContents entries={tocEntries} />
              </div>
              <ReportDocument report={report} review={review} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
