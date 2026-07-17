"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardStats, FraudResult, SimEvent, Transaction } from "@/lib/types";
import TransactionRow from "@/components/TransactionRow";
import DetailPanel from "@/components/DetailPanel";
import LiveChart from "@/components/LiveChart";

interface FeedItem {
  transaction: Transaction;
  result: FraudResult;
}

const EMPTY_STATS: DashboardStats = {
  total_processed: 0,
  flagged: 0,
  blocked: 0,
  flag_rate: 0,
  avg_risk_score: 0,
  amount_at_risk: 0,
};

function StatValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-2 border-r border-line last:border-r-0">
      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-soft">{label}</p>
      <p key={value} className="font-mono text-lg font-bold tabular-nums stat-pulse">
        {value}
      </p>
    </div>
  );
}

export default function Home() {
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 5>(1);
  const [feed, setFeed] = useState<FeedItem[]>([]); // newest first, last 50
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [selected, setSelected] = useState<FeedItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Aggregates over ALL processed transactions (not just last 50)
  const distributionRef = useRef<number[]>(new Array(10).fill(0));
  const categoryFlagsRef = useRef<Record<string, number>>({});
  const customerFlagsRef = useRef<Record<string, number>>({});
  const minuteRef = useRef<Map<string, { total: number; flagged: number }>>(new Map());
  const [, setAggVersion] = useState(0); // bump to re-render charts

  const sourceRef = useRef<EventSource | null>(null);

  function stop() {
    sourceRef.current?.close();
    sourceRef.current = null;
    setRunning(false);
  }

  function start() {
    if (sourceRef.current) return;
    setError(null);
    const source = new EventSource(`/api/simulate?speed=${speed}`);
    sourceRef.current = source;
    setRunning(true);

    source.onmessage = (e) => {
      const event = JSON.parse(e.data) as SimEvent;
      if (event.kind === "stats") {
        setStats(event.stats);
        return;
      }

      const item: FeedItem = { transaction: event.transaction, result: event.result };
      setFeed((prev) => [item, ...prev].slice(0, 50));

      // update aggregates
      const bucket = Math.min(9, Math.floor(event.result.risk_score / 10));
      distributionRef.current[bucket] += 1;
      if (event.result.is_flagged) {
        categoryFlagsRef.current[event.transaction.category] =
          (categoryFlagsRef.current[event.transaction.category] ?? 0) + 1;
        customerFlagsRef.current[event.transaction.customer_id] =
          (customerFlagsRef.current[event.transaction.customer_id] ?? 0) + 1;
      }
      const minute = new Date(event.transaction.timestamp).toISOString().slice(11, 16);
      const m = minuteRef.current.get(minute) ?? { total: 0, flagged: 0 };
      m.total += 1;
      if (event.result.is_flagged) m.flagged += 1;
      minuteRef.current.set(minute, m);
      setAggVersion((v) => v + 1);
    };

    source.onerror = () => {
      setError("Stream disconnected.");
      stop();
    };
  }

  useEffect(() => () => sourceRef.current?.close(), []);

  const distributionData = useMemo(
    () =>
      distributionRef.current.map((count, i) => ({
        bucket: `${i * 10}`,
        count,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feed]
  );

  const flagRateData = useMemo(
    () =>
      [...minuteRef.current.entries()].slice(-20).map(([minute, m]) => ({
        minute,
        rate: Number(((m.flagged / m.total) * 100).toFixed(1)),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feed]
  );

  const categoryData = useMemo(
    () =>
      Object.entries(categoryFlagsRef.current)
        .sort((a, b) => b[1] - a[1])
        .map(([category, flags]) => ({ category, flags })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feed]
  );

  const topCustomers = useMemo(
    () =>
      Object.entries(customerFlagsRef.current)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feed]
  );

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-[1440px] px-3 sm:px-5 py-4 space-y-4">

        {/* ── Control bar ── */}
        <div className="panel flex flex-wrap items-stretch">
          <div className="flex items-center gap-3 px-4 py-3 border-r border-line">
            <span className="relative flex h-2.5 w-2.5">
              {running && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ok opacity-60" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${running ? "bg-ok" : "bg-ink-soft"}`}
              />
            </span>
            <div>
              <h1 className="text-sm font-semibold leading-tight">Fraud Detection Pipeline</h1>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-soft">
                simulated stream · synthetic data
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-3 border-r border-line">
            <button
              type="button"
              onClick={() => (running ? stop() : start())}
              className={`rounded-md px-4 py-1.5 font-mono text-xs uppercase tracking-wide border transition-colors ${
                running
                  ? "border-bad text-bad hover:bg-bad/10"
                  : "border-ok text-ok hover:bg-ok/10"
              }`}
            >
              {running ? "■ Stop" : "▶ Start Simulation"}
            </button>
            <div className="flex rounded-md border border-line overflow-hidden">
              {([1, 2, 5] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={running}
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1.5 font-mono text-xs transition-colors disabled:opacity-50 ${
                    speed === s ? "bg-card-hover text-ink" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-1 items-center overflow-x-auto">
            <StatValue label="Processed" value={String(stats.total_processed)} />
            <StatValue label="Flagged" value={String(stats.flagged)} />
            <StatValue label="Blocked" value={String(stats.blocked)} />
            <StatValue label="Flag rate" value={`${(stats.flag_rate * 100).toFixed(1)}%`} />
            <StatValue label="Avg risk" value={stats.avg_risk_score.toFixed(1)} />
            <StatValue label="At risk" value={`$${stats.amount_at_risk.toFixed(0)}`} />
          </div>
        </div>

        {error && <p className="text-sm text-bad">{error}</p>}

        {/* ── Feed + detail ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="panel overflow-hidden">
            <p className="px-3 py-2 border-b border-line font-mono text-[10px] uppercase tracking-widest text-ink-soft">
              Transaction feed (last 50)
            </p>
            <div className="max-h-[420px] overflow-y-auto">
              {feed.length === 0 ? (
                <p className="p-6 text-xs text-ink-soft text-center">
                  Start the simulation to stream transactions. Flagged ones are
                  explained by the LLM (or a deterministic fallback if Ollama is
                  offline).
                </p>
              ) : (
                feed.map((item) => (
                  <TransactionRow
                    key={item.transaction.id}
                    transaction={item.transaction}
                    result={item.result}
                    selected={selected?.transaction.id === item.transaction.id}
                    onSelect={() => setSelected(item)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="panel p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-soft mb-3">
              Detail panel
            </p>
            {selected ? (
              <DetailPanel transaction={selected.transaction} result={selected.result} />
            ) : (
              <p className="text-xs text-ink-soft py-10 text-center">
                Click a transaction in the feed to inspect its signals and
                explanation.
              </p>
            )}
          </div>
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="panel p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-soft mb-2">
              Risk score distribution
            </p>
            <LiveChart kind="bar" data={distributionData} xKey="bucket" yKey="count" color="#2DD4A7" />
          </div>
          <div className="panel p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-soft mb-2">
              Flag rate per minute (%)
            </p>
            <LiveChart kind="line" data={flagRateData} xKey="minute" yKey="rate" color="#F5B83D" />
          </div>
          <div className="panel p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-soft mb-2">
              Flags by category
            </p>
            <LiveChart kind="bar" data={categoryData} xKey="category" yKey="flags" color="#F0524A" />
          </div>
          <div className="panel p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-soft mb-2">
              Top flagged customers
            </p>
            {topCustomers.length === 0 ? (
              <p className="text-xs text-ink-soft py-8 text-center">No flags yet.</p>
            ) : (
              <table className="w-full">
                <tbody>
                  {topCustomers.map(([customer, flags]) => (
                    <tr key={customer} className="border-b border-line/50 last:border-b-0">
                      <td className="py-1.5 font-mono text-xs text-ink">{customer}</td>
                      <td className="py-1.5 font-mono text-xs text-bad text-right tabular-nums">
                        {flags} flag{flags === 1 ? "" : "s"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <p className="text-[10px] text-ink-soft text-center pb-2 font-mono">
          All transactions, customers, and merchants are synthetic. Statistical
          scoring runs locally; the LLM is called only to explain flagged
          transactions.
        </p>
      </main>
    </div>
  );
}
