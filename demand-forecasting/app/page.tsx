"use client";

import { useRef, useState } from "react";
import type { ForecastReport } from "@/lib/types";
import { SAMPLE_DATASETS } from "@/lib/sampleData";
import ForecastChart from "@/components/ForecastChart";
import AnomalyTable from "@/components/AnomalyTable";
import SeasonalityCard from "@/components/SeasonalityCard";
import InventoryCard from "@/components/InventoryCard";

function reportToMarkdown(report: ForecastReport): string {
  const h = report.historical_summary;
  const inv = report.inventory_recommendations;
  const lines: string[] = [];
  lines.push(`# Demand Forecast — ${report.product}`);
  lines.push("");
  lines.push(`- Records: ${h.total_records} (${h.date_range})`);
  lines.push(`- Avg daily: ${h.avg_daily} · Trend: ${h.trend} · Volatility (CV): ${h.volatility}`);
  lines.push("");
  lines.push("## Insights");
  lines.push("");
  report.insights.forEach((ins, i) => lines.push(`${i + 1}. ${ins}`));
  lines.push("");
  lines.push("## Seasonality");
  lines.push("");
  if (report.seasonality.length === 0) lines.push("_None detected._");
  report.seasonality.forEach((s) =>
    lines.push(`- **${s.period}** (strength ${s.strength}) — peaks: ${s.peak_periods.join(", ")}`)
  );
  lines.push("");
  lines.push("## Anomalies");
  lines.push("");
  if (report.anomalies.length === 0) lines.push("_None beyond 2σ._");
  else {
    lines.push("| Date | Expected | Actual | Deviation | Severity |");
    lines.push("|---|---:|---:|---:|---|");
    report.anomalies.forEach((a) =>
      lines.push(`| ${a.date} | ${a.expected} | ${a.actual} | ${a.deviation_pct}% | ${a.severity} |`)
    );
  }
  lines.push("");
  lines.push("## Inventory");
  lines.push("");
  lines.push(`- Reorder point: ${inv.reorder_point}`);
  lines.push(`- Safety stock: ${inv.safety_stock}`);
  lines.push(`- Suggested order quantity: ${inv.suggested_order_quantity}`);
  lines.push(`- Stockout risk: ${inv.stockout_risk}`);
  lines.push("");
  lines.push("## Forecast points");
  lines.push("");
  lines.push("| Date | Actual | Predicted | 80% band |");
  lines.push("|---|---:|---:|---|");
  report.forecast.forEach((p) =>
    lines.push(
      `| ${p.date} | ${p.actual ?? ""} | ${p.predicted} | ${p.lower_bound}–${p.upper_bound} |`
    )
  );
  lines.push("");
  return lines.join("\n");
}

const TREND_META = {
  growing: { icon: "↗", color: "#15803D" },
  stable: { icon: "→", color: "#B45309" },
  declining: { icon: "↘", color: "#B91C1C" },
} as const;

export default function Home() {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [horizon, setHorizon] = useState(30);
  const [leadTime, setLeadTime] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ForecastReport | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function readFile(file: File) {
    setFileName(file.name);
    setCsvText(await file.text());
  }

  function loadSample(index: number) {
    const sample = SAMPLE_DATASETS[index];
    setCsvText(sample.csv);
    setFileName(`${sample.name.toLowerCase().replace(/\s+/g, "-")}.csv`);
    setHorizon(sample.defaultHorizon);
    setError(null);
  }

  async function handleForecast() {
    if (!csvText.trim()) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, horizon, leadTime }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? `HTTP ${res.status}`);
      } else {
        setReport(data as ForecastReport);
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
    a.download = "demand-forecast.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const h = report?.historical_summary;
  const trend = h ? TREND_META[h.trend] : null;

  return (
    <div className="min-h-screen">
      <header className="bg-card border-b border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
          <h1 className="text-lg font-semibold">AI-Powered Demand Forecasting</h1>
          <p className="text-[13px] text-ink-soft">
            Statistical forecasting (exponential smoothing + autocorrelation) with
            LLM-written business insights. CSV needs date + quantity columns.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">

        {/* ── Upload + config ── */}
        <div className="panel p-5 grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-5">
          <div
            className={`rounded-lg border-2 border-dashed p-5 transition-colors cursor-pointer ${
              dragActive ? "border-primary bg-primary-soft" : "border-line"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void readFile(f);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void readFile(f);
              }}
            />
            <p className="text-sm font-medium text-center">
              {fileName ? `Loaded: ${fileName}` : "Drop a sales CSV here, or click to browse"}
            </p>
            <p className="text-xs text-ink-soft text-center mt-1 mb-3">
              …or paste CSV text below
            </p>
            <textarea
              className="w-full rounded-md border border-line bg-card px-3 py-2 font-mono text-[11px] focus:outline-none focus:border-primary resize-y h-28"
              placeholder={"date,product,quantity,revenue\n2026-01-01,Widget,42,999"}
              value={csvText.length > 20000 ? `${csvText.slice(0, 20000)}\n… (${csvText.length} chars loaded)` : csvText}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => { setCsvText(e.target.value); setFileName(null); }}
            />
          </div>

          <div className="space-y-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
                Samples
              </p>
              <div className="flex flex-col gap-1.5">
                {SAMPLE_DATASETS.map((s, i) => (
                  <button
                    key={s.name}
                    type="button"
                    title={s.description}
                    onClick={() => loadSample(i)}
                    className="text-left rounded-md border border-line px-3 py-1.5 text-[13px] hover:border-primary hover:text-primary transition-colors"
                  >
                    {s.name}
                    <span className="block text-[11px] text-ink-soft">{s.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-ink-soft mb-1">
                Forecast horizon — <span className="font-mono">{horizon} days</span>
              </label>
              <input
                type="range"
                min={7}
                max={90}
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="w-full accent-[#1D4ED8]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-soft mb-1">
                Supplier lead time (days)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                className="w-full rounded-md border border-line px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
                value={leadTime}
                onChange={(e) => setLeadTime(Number(e.target.value))}
              />
            </div>
            <button
              type="button"
              disabled={!csvText.trim() || loading}
              onClick={handleForecast}
              className="w-full rounded-md bg-primary text-white text-sm font-medium py-2.5 transition-opacity disabled:opacity-40 hover:opacity-90"
            >
              {loading ? "Forecasting…" : "Generate Forecast"}
            </button>
            {error && <p className="text-sm text-bad">{error}</p>}
          </div>
        </div>

        {report && h && trend && (
          <>
            {/* ── Summary cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: "Records", value: String(h.total_records) },
                { label: "Date range", value: h.date_range },
                { label: "Trend", value: `${trend.icon} ${h.trend}`, color: trend.color },
                { label: "Volatility (CV)", value: String(h.volatility) },
                { label: "Avg daily volume", value: String(h.avg_daily) },
              ].map((card) => (
                <div key={card.label} className="panel p-3">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-soft">
                    {card.label}
                  </p>
                  <p
                    className="font-mono text-sm font-bold mt-1 truncate"
                    style={card.color ? { color: card.color } : undefined}
                    title={card.value}
                  >
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            {/* ── Main chart ── */}
            <div className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                  {report.product} — history, forecast, 80% confidence band, anomalies
                </p>
                <button
                  type="button"
                  onClick={handleExport}
                  className="font-mono text-[11px] uppercase tracking-wide text-ink-soft hover:text-primary transition-colors"
                >
                  ↓ Export report
                </button>
              </div>
              <ForecastChart points={report.forecast} />
              <div className="flex flex-wrap gap-4 mt-2 text-[11px] text-ink-soft">
                <span><span className="inline-block w-4 border-t-2 border-primary align-middle mr-1" /> actual</span>
                <span><span className="inline-block w-4 border-t-2 border-dashed border-primary align-middle mr-1" /> forecast</span>
                <span><span className="inline-block w-3 h-3 rounded-sm bg-primary/10 align-middle mr-1" /> 80% band</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-bad align-middle mr-1" /> anomaly</span>
              </div>
            </div>

            {/* ── Anomalies ── */}
            <div className="panel p-5">
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-3">
                Detected anomalies ({report.anomalies.length})
              </p>
              <AnomalyTable anomalies={report.anomalies} />
            </div>

            {/* ── Seasonality ── */}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
                Seasonality
              </p>
              {report.seasonality.length === 0 ? (
                <div className="panel p-4">
                  <p className="text-sm text-ink-soft">
                    No significant seasonal pattern detected (autocorrelation
                    below 0.25 at weekly/monthly/quarterly/yearly lags).
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {report.seasonality.map((component) => (
                    <SeasonalityCard key={component.period} component={component} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Inventory ── */}
            <InventoryCard inventory={report.inventory_recommendations} leadTime={leadTime} />

            {/* ── Insights ── */}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
                Analyst insights
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {report.insights.map((insight, i) => (
                  <div key={i} className="panel p-4">
                    <span className="font-mono text-xs font-bold text-primary block mb-1.5">
                      Insight {i + 1}
                    </span>
                    <p className="text-[13px] text-ink-soft leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-ink-soft text-center pb-4">
              Simple statistical models (exponential smoothing, autocorrelation,
              z-scores) for demonstration — not production-grade forecasting.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
