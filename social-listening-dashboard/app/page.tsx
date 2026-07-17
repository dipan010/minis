"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardReport, Platform, TimeRange } from "@/lib/types";
import { PLATFORM_META, SENTIMENT_COLORS } from "@/lib/types";
import { SAMPLE_REPORTS } from "@/lib/sampleData";
import StatCard from "@/components/StatCard";
import TopicCard from "@/components/TopicCard";
import PostRow from "@/components/PostRow";

type PlatformFilter = "all" | Platform;
type PostSort = "recent" | "engagement" | "sentiment";

function buildMarkdown(report: DashboardReport): string {
  const lines: string[] = [];
  lines.push(`# Social Listening Report — "${report.keyword}"`);
  lines.push("");
  lines.push(`_Generated ${report.generated_at}. All posts are AI-simulated._`);
  lines.push("");
  lines.push(`**Total posts:** ${report.total_posts}`);
  lines.push(
    `**Sentiment:** ${report.sentiment.positive} positive / ${report.sentiment.negative} negative / ${report.sentiment.neutral} neutral (avg score ${report.sentiment.average_score})`
  );
  lines.push("");
  lines.push("## Key Insights");
  lines.push("");
  report.key_insights.forEach((ins, i) => lines.push(`${i + 1}. ${ins}`));
  lines.push("");
  lines.push("## Topic Clusters");
  lines.push("");
  lines.push("| Topic | Posts | Avg sentiment |");
  lines.push("|---|---:|---:|");
  report.topics.forEach((t) => lines.push(`| ${t.topic} | ${t.count} | ${t.sentiment} |`));
  lines.push("");
  lines.push("## Posts");
  lines.push("");
  report.posts.forEach((p) => {
    lines.push(
      `- **${p.author}** (${p.platform}, ${p.sentiment}, ${new Date(p.timestamp).toISOString()}): ${p.content}`
    );
  });
  lines.push("");
  return lines.join("\n");
}

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<DashboardReport | null>(null);

  const [feedFilter, setFeedFilter] = useState<PlatformFilter>("all");
  const [feedSort, setFeedSort] = useState<PostSort>("recent");

  function loadSample(index: number) {
    const sample = SAMPLE_REPORTS[index];
    setKeyword(sample.keyword);
    setError(null);
    setReport(sample);
    setFeedFilter("all");
  }

  async function handleAnalyze() {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), platform, timeRange }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? `HTTP ${res.status}`);
      } else {
        setReport(data as DashboardReport);
        setFeedFilter("all");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (!report) return;
    const blob = new Blob([buildMarkdown(report)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `social-report-${report.keyword.replace(/\s+/g, "-").toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const stats = useMemo(() => {
    if (!report) return null;
    const platformCounts = report.posts.reduce<Record<string, number>>((acc, p) => {
      acc[p.platform] = (acc[p.platform] ?? 0) + 1;
      return acc;
    }, {});
    const topPlatform = (Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "—") as Platform | "—";
    const avg = report.sentiment.average_score;
    return {
      topPlatform:
        topPlatform === "—" ? "—" : PLATFORM_META[topPlatform as Platform].label,
      avgLabel: avg > 0.1 ? "Positive" : avg < -0.1 ? "Negative" : "Neutral",
      avgTrend: (avg > 0.1 ? "up" : avg < -0.1 ? "down" : "flat") as "up" | "down" | "flat",
      topTopic: report.topics[0]?.topic ?? "—",
    };
  }, [report]);

  const feedPosts = useMemo(() => {
    if (!report) return [];
    const filtered =
      feedFilter === "all"
        ? [...report.posts]
        : report.posts.filter((p) => p.platform === feedFilter);
    filtered.sort((a, b) => {
      if (feedSort === "recent") return b.timestamp.localeCompare(a.timestamp);
      if (feedSort === "engagement")
        return (
          b.engagement.likes + b.engagement.shares + b.engagement.comments -
          (a.engagement.likes + a.engagement.shares + a.engagement.comments)
        );
      return b.sentiment_score - a.sentiment_score;
    });
    return filtered;
  }, [report, feedFilter, feedSort]);

  const donutData = report
    ? [
        { name: "positive", value: report.sentiment.positive },
        { name: "negative", value: report.sentiment.negative },
        { name: "neutral", value: report.sentiment.neutral },
      ]
    : [];

  const trendData = useMemo(
    () =>
      report?.trend.map((t) => ({
        ...t,
        label: t.date.length > 10 ? t.date.slice(11, 16) : t.date.slice(5),
      })) ?? [],
    [report]
  );

  const selectCls =
    "rounded-md border border-line bg-card px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-accent";

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">

        {/* ── Top bar ── */}
        <div className="panel p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h1 className="text-lg font-semibold text-ink">
              Social Listening Dashboard
              <span className="ml-2 font-mono text-[10px] uppercase tracking-wide text-ink-soft border border-line rounded-full px-2 py-0.5">
                simulated data
              </span>
            </h1>
            {report && (
              <button
                type="button"
                onClick={handleExport}
                className="font-mono text-[11px] uppercase tracking-wide text-ink-soft hover:text-accent transition-colors"
              >
                ↓ Export report
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className="flex-1 min-w-48 rounded-md border border-line bg-card px-3 py-1.5 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-accent"
              placeholder='Keyword or brand, e.g. "iPhone 16"'
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAnalyze();
              }}
            />
            <select
              className={selectCls}
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PlatformFilter)}
            >
              <option value="all">All platforms</option>
              <option value="twitter">Twitter/X</option>
              <option value="reddit">Reddit</option>
              <option value="news">News</option>
            </select>
            <select
              className={selectCls}
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            >
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
            <button
              type="button"
              disabled={!keyword.trim() || loading}
              onClick={handleAnalyze}
              className="rounded-md bg-accent/90 text-base font-medium text-sm px-5 py-1.5 text-[#04121F] transition-opacity disabled:opacity-40 hover:opacity-90"
            >
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-line">
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
              Samples:
            </span>
            {SAMPLE_REPORTS.map((s, i) => (
              <button
                key={s.keyword}
                type="button"
                onClick={() => loadSample(i)}
                className="rounded-md border border-line px-3 py-1 text-[13px] text-ink hover:border-accent hover:text-accent transition-colors"
              >
                {s.keyword}
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-neg mt-3">{error}</p>}
        </div>

        {loading && (
          <div className="panel p-10 flex items-center justify-center gap-3">
            <span className="inline-block h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <div>
              <p className="text-sm font-medium text-ink">
                Simulating feed → clustering topics → generating insights…
              </p>
              <p className="text-xs text-ink-soft">
                Three sequential LLM calls; allow a few minutes on CPU.
              </p>
            </div>
          </div>
        )}

        {!report && !loading && (
          <div className="panel p-12 text-center">
            <p className="text-sm text-ink-soft">
              Enter a keyword (or load a sample) to build the dashboard. All
              posts are generated by a local LLM — nothing is scraped.
            </p>
          </div>
        )}

        {report && stats && (
          <>
            {/* ── Metrics row ── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <StatCard icon="🗂" label="Total posts" value={String(report.total_posts)} sub={`about "${report.keyword}"`} />
              <StatCard
                icon="🧭"
                label="Avg sentiment"
                value={stats.avgLabel}
                sub={`score ${report.sentiment.average_score}`}
                trend={stats.avgTrend}
              />
              <StatCard icon="📡" label="Most active platform" value={stats.topPlatform} />
              <StatCard icon="🏷" label="Top topic" value={stats.topTopic} sub={`${report.topics[0]?.count ?? 0} posts`} />
            </div>

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="panel p-4">
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
                  Sentiment trend
                </p>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="rgba(148,163,184,0.25)" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="rgba(148,163,184,0.25)" />
                      <Tooltip
                        contentStyle={{
                          background: "#141D2F",
                          border: "1px solid #26334D",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "#E6EBF4" }}
                      />
                      <Area type="monotone" dataKey="positive" stackId="1" stroke={SENTIMENT_COLORS.positive} fill={SENTIMENT_COLORS.positive} fillOpacity={0.35} />
                      <Area type="monotone" dataKey="neutral" stackId="1" stroke={SENTIMENT_COLORS.neutral} fill={SENTIMENT_COLORS.neutral} fillOpacity={0.25} />
                      <Area type="monotone" dataKey="negative" stackId="1" stroke={SENTIMENT_COLORS.negative} fill={SENTIMENT_COLORS.negative} fillOpacity={0.35} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="panel p-4">
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
                  Sentiment distribution
                </p>
                <div className="h-60 flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="55%"
                        outerRadius="85%"
                        paddingAngle={3}
                        stroke="none"
                      >
                        {donutData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={SENTIMENT_COLORS[entry.name as keyof typeof SENTIMENT_COLORS]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#141D2F",
                          border: "1px solid #26334D",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 pr-4">
                    {donutData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2 text-sm">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: SENTIMENT_COLORS[d.name as keyof typeof SENTIMENT_COLORS] }}
                        />
                        <span className="text-ink-soft capitalize">{d.name}</span>
                        <span className="font-mono text-ink">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Topic clusters ── */}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
                Topic clusters
              </p>
              <div className="scroll-strip flex gap-3 overflow-x-auto pb-2">
                {report.topics.map((cluster) => (
                  <TopicCard key={cluster.topic} cluster={cluster} />
                ))}
              </div>
            </div>

            {/* ── Posts feed ── */}
            <div className="panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                  Posts feed ({feedPosts.length})
                </p>
                <div className="flex gap-2">
                  <select
                    className={selectCls}
                    value={feedFilter}
                    onChange={(e) => setFeedFilter(e.target.value as PlatformFilter)}
                  >
                    <option value="all">All platforms</option>
                    <option value="twitter">Twitter/X</option>
                    <option value="reddit">Reddit</option>
                    <option value="news">News</option>
                  </select>
                  <select
                    className={selectCls}
                    value={feedSort}
                    onChange={(e) => setFeedSort(e.target.value as PostSort)}
                  >
                    <option value="recent">Most recent</option>
                    <option value="engagement">Most engagement</option>
                    <option value="sentiment">Most positive</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[720px]">
                  <thead>
                    <tr className="border-b border-line text-left">
                      {["", "Author", "Content", "Sentiment", "Engagement", "Age"].map((h, i) => (
                        <th
                          key={i}
                          className="px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-ink-soft"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {feedPosts.map((p) => (
                      <PostRow key={p.id} post={p} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Insights ── */}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
                Key insights
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {report.key_insights.map((insight, i) => (
                  <div key={i} className="panel p-4">
                    <span className="font-mono text-xs font-bold text-accent block mb-1.5">
                      Insight {i + 1}
                    </span>
                    <p className="text-[13px] text-ink-soft leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-ink-soft text-center pb-4">
              All posts, authors, and engagement figures are AI-generated
              simulations — nothing is scraped from real platforms.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
