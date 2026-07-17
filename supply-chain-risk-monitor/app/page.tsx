"use client";

import { useMemo, useState } from "react";
import type { RiskTrend, SupplyChainReport } from "@/lib/types";
import { INDUSTRIES, REGIONS } from "@/lib/types";
import { SAMPLE_REPORTS } from "@/lib/sampleData";
import ESGGauge from "@/components/ESGGauge";
import RiskTimeline from "@/components/RiskTimeline";
import EventRow from "@/components/EventRow";

type SortKey = "date" | "severity" | "category";

const TREND_META: Record<RiskTrend, { label: string; icon: string; color: string }> = {
  improving: { label: "Improving", icon: "↗", color: "var(--low)" },
  stable: { label: "Stable", icon: "→", color: "var(--med)" },
  deteriorating: { label: "Deteriorating", icon: "↘", color: "var(--high)" },
};

const inputCls =
  "rounded-md border border-line bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sidebar/30 focus:border-sidebar";

export default function Home() {
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SupplyChainReport | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);

  function loadSample(index: number) {
    const sample = SAMPLE_REPORTS[index];
    setCompany(sample.company);
    setError(null);
    setReport(JSON.parse(JSON.stringify(sample)) as SupplyChainReport);
  }

  async function handleAnalyze() {
    if (!company.trim()) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: company.trim(),
          industry: industry || undefined,
          region: region || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? `HTTP ${res.status}`);
      } else {
        setReport(data as SupplyChainReport);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(key === "category");
    }
  }

  const sortedEvents = useMemo(() => {
    if (!report) return [];
    const events = [...report.risk_events];
    events.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.date.localeCompare(b.date);
      else if (sortKey === "severity") cmp = a.severity - b.severity;
      else cmp = a.category.localeCompare(b.category);
      return sortAsc ? cmp : -cmp;
    });
    return events;
  }, [report, sortKey, sortAsc]);

  const trend = report ? TREND_META[report.risk_trend] : null;

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  return (
    <div className="min-h-screen lg:flex">
      {/* ── Dark sidebar ── */}
      <aside className="bg-sidebar text-white lg:w-72 lg:min-h-screen shrink-0 p-6 flex flex-col gap-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50 mb-1">
            Supply chain intelligence
          </p>
          <h1 className="text-lg font-semibold leading-tight">
            Supply Chain Risk Monitor
          </h1>
        </div>

        {report ? (
          <div className="space-y-4">
            <div className="bg-sidebar-soft rounded-lg p-4">
              <p className="font-mono text-[10px] uppercase tracking-wide text-white/50 mb-1">
                Company
              </p>
              <p className="text-base font-semibold">{report.company}</p>
            </div>
            {trend && (
              <div className="bg-sidebar-soft rounded-lg p-4">
                <p className="font-mono text-[10px] uppercase tracking-wide text-white/50 mb-1">
                  Risk trend
                </p>
                <p className="text-base font-semibold flex items-center gap-2">
                  <span style={{ color: trend.color }}>{trend.icon}</span>
                  {trend.label}
                </p>
              </div>
            )}
            <div className="bg-sidebar-soft rounded-lg p-4">
              <p className="font-mono text-[10px] uppercase tracking-wide text-white/50 mb-1">
                Events analyzed
              </p>
              <p className="text-base font-semibold">{report.risk_events.length}</p>
            </div>
            <div className="bg-sidebar-soft rounded-lg p-4">
              <p className="font-mono text-[10px] uppercase tracking-wide text-white/50 mb-1">
                Analysis confidence
              </p>
              <p className="text-base font-semibold">{report.confidence}%</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/60 leading-relaxed">
            Enter a company to generate a simulated news feed and an
            ESG / supply-chain risk analysis — all inference runs on a local
            Ollama model.
          </p>
        )}

        <p className="mt-auto text-[11px] text-white/40 leading-relaxed">
          News events are AI-simulated, not scraped from real sources. ESG
          scores are illustrative. Portfolio demonstration only.
        </p>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 p-5 sm:p-8 space-y-5">
        {/* Search bar */}
        <div className="panel p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-52">
              <label className="block text-[12px] font-medium text-ink-soft mb-1">
                Company name
              </label>
              <input
                className={`${inputCls} w-full`}
                value={company}
                placeholder="e.g. TechCorp Global"
                onChange={(e) => setCompany(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAnalyze();
                }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-soft mb-1">
                Industry (optional)
              </label>
              <select className={inputCls} value={industry} onChange={(e) => setIndustry(e.target.value)}>
                <option value="">Any</option>
                {INDUSTRIES.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-soft mb-1">
                Region (optional)
              </label>
              <select className={inputCls} value={region} onChange={(e) => setRegion(e.target.value)}>
                <option value="">Any</option>
                {REGIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={!company.trim() || loading}
              onClick={handleAnalyze}
              className="rounded-md bg-sidebar text-white px-6 py-2 text-sm font-medium transition-opacity disabled:opacity-40 hover:opacity-90"
            >
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-line">
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
              Samples (no Ollama needed):
            </span>
            {SAMPLE_REPORTS.map((s, i) => (
              <button
                key={s.company}
                type="button"
                onClick={() => loadSample(i)}
                className="rounded-md border border-line px-3 py-1 text-[13px] text-ink hover:border-sidebar transition-colors"
              >
                {s.company}
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-high mt-3">{error}</p>}
        </div>

        {loading && (
          <div className="panel p-10 flex items-center justify-center gap-3">
            <span className="inline-block h-5 w-5 rounded-full border-2 border-sidebar border-t-transparent animate-spin" />
            <div>
              <p className="text-sm font-medium text-ink">
                Simulating news feed, then analyzing risk…
              </p>
              <p className="text-xs text-ink-soft">
                Two sequential LLM calls — this can take a couple of minutes.
              </p>
            </div>
          </div>
        )}

        {report && (
          <>
            {/* ESG + trend row */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr,320px] gap-5">
              <div className="panel p-5">
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-4">
                  ESG score card
                </p>
                <ESGGauge {...report.esg} />
              </div>
              <div className="panel p-5">
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-3">
                  Top risks
                </p>
                <ol className="space-y-2">
                  {report.top_risks.map((r, i) => (
                    <li key={i} className="flex gap-2 text-[13px] text-ink-soft leading-snug">
                      <span
                        className="font-mono font-bold shrink-0"
                        style={{ color: i === 0 ? "var(--high)" : i === 1 ? "var(--med)" : "var(--low)" }}
                      >
                        {i + 1}.
                      </span>
                      {r}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Timeline */}
            <div className="panel p-5">
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
                Risk event timeline — last 6 months
              </p>
              <RiskTimeline events={report.risk_events} />
            </div>

            {/* Events table */}
            <div className="panel p-5 overflow-x-auto">
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-3">
                Risk events ({report.risk_events.length}) — click a row to expand
              </p>
              <table className="w-full table-striped border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th
                      className="px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-ink-soft cursor-pointer select-none"
                      onClick={() => toggleSort("date")}
                    >
                      Date{sortIndicator("date")}
                    </th>
                    <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                      Event
                    </th>
                    <th
                      className="px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-ink-soft cursor-pointer select-none"
                      onClick={() => toggleSort("category")}
                    >
                      Category{sortIndicator("category")}
                    </th>
                    <th
                      className="px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-ink-soft cursor-pointer select-none"
                      onClick={() => toggleSort("severity")}
                    >
                      Sev{sortIndicator("severity")}
                    </th>
                    <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEvents.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recommendations */}
            <div className="panel p-5">
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-3">
                Recommendations
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {report.recommendations.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-line bg-surface p-3 text-[13px] text-ink-soft leading-snug"
                  >
                    <span className="font-mono text-xs font-bold text-sidebar block mb-1">
                      Action {i + 1}
                    </span>
                    {r}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-ink-soft text-center pb-6">
              Analysis confidence: {report.confidence}%. All news events are
              synthetically generated by a local LLM — none reference real
              reported incidents. ESG scores are illustrative and not
              comparable to any commercial rating.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
