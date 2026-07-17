# Social Listening Dashboard

Enter a keyword or brand → get a **simulated social media sentiment
dashboard**: stacked sentiment trend, distribution donut, topic clusters,
a filterable post feed, and five analyst-style key insights. Inspired by
Wisesight's social intelligence platform.

**All posts are AI-generated.** Nothing is scraped from Twitter/X, Reddit,
or news sites — a local LLM simulates a plausible feed, then analyzes it.
No API keys, no real user data.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 (dark theme) |
| Charts | recharts |
| LLM runtime | Ollama — `llama3.1:8b` |

## Prerequisites

- Node.js 18.18+
- Ollama running locally with `ollama pull llama3.1:8b`
- The three sample buttons work with **no Ollama at all**.

## Setup

```bash
npm install
npm run dev
```

---

## Usage

1. Type a keyword, pick a platform filter and time range, and click
   **Analyze**. Three sequential LLM calls run (feed simulation → topic
   clustering → insights); allow a few minutes on CPU.
2. Or load a sample instantly: **iPhone 16** (mostly positive, battery
   complaints), **Remote Work Policy** (polarized), **Climate Summit 2026**
   (negative-leaning).
3. Explore: stat cards, sentiment trend (stacked area), distribution donut,
   horizontally scrolling topic cards, and the posts feed (filter by
   platform, sort by recency/engagement/sentiment). **Export report**
   downloads everything as Markdown.

---

## Architecture

### `lib/types.ts`
Domain model: `SocialPost` (platform, author, content, timestamp, sentiment
label + score −1..1, engagement, topics), `TopicCluster`, `TrendPoint`, and
the top-level `DashboardReport`. Exports platform icons/labels and the
sentiment color map (green `#22c55e` / red `#ef4444` / slate `#94a3b8`).

### `lib/ollama.ts`
Shared structured-output caller (JSON schema in `format`, AbortController
timeout, descriptive errors).

### `lib/socialSimulator.ts`
`simulateSocialData()` prompts the model to generate 20–30 **fictional**
posts with a prescribed sentiment distribution (~40/25/35), platform-
appropriate formatting (short casual tweets, longer Reddit posts, formal
news headlines), fictional authors, `hours_ago` spread across the selected
time range (converted to concrete timestamps in code), plausible
engagement, and reusable lowercase topic phrases so clustering works.

### `lib/analysis.ts`
- `analyzeSentiment()` / `buildTrend()` — pure aggregation, no LLM. Trend
  buckets are hourly for 24h queries, daily otherwise.
- `clusterTopics()` — LLM assigns post IDs to 5–8 named clusters; counts,
  average sentiment, and sample snippets are computed locally from the
  assignments (the model never invents stats).
- `generateInsights()` — LLM writes exactly 5 insights from a computed
  digest (breakdown, cluster stats, top-engagement posts).

### `lib/sampleData.ts`
Three hand-written feeds (12–14 posts each) with topic clusters and
insights; sentiment breakdown and trend are computed by the same pure
functions used in the live pipeline.

### `app/api/analyze/route.ts`
POST `QueryInput` → `DashboardReport`. Chains the three LLM stages with a
~5-minute overall cap.

### Components
`StatCard` (icon/value/label/trend arrow), `SentimentBadge` (tinted pill),
`TopicCard` (count, −1..1 sentiment marker bar, sample snippets),
`PostRow` (platform icon, author, content, badge, engagement, age).

---

## Caveats

- **Simulated data only** — distributions, authors, and engagement are LLM
  inventions; treat every number as illustrative.
- Live analysis is three sequential LLM calls (2–5 minutes on CPU).
- An 8B model occasionally assigns a post to no cluster or drifts from the
  requested sentiment ratios; aggregations tolerate both.
- Portfolio demonstration project only.
