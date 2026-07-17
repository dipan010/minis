# Supply Chain Risk Monitor

Enter a company name → get an **ESG and supply-chain risk briefing** built
from a simulated news feed: risk events plotted on a severity timeline, E/S/G
gauges, top risks, and prioritized recommendations. Inspired by Prewave's
supply chain intelligence platform.

**Everything is synthetic.** The "news" is generated on the fly by a local
LLM (it is *instructed* to invent fictional events, suppliers, and outlets),
then a second LLM pass plays risk analyst over that feed. No scraping, no
API keys, no real incident data.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 |
| Charts | recharts |
| LLM runtime | Ollama — `llama3.1:8b` |

## Prerequisites

- Node.js 18.18+
- Ollama running locally with `ollama pull llama3.1:8b`
- The three sample company buttons work with **no Ollama at all**.

## Setup

```bash
npm install
npm run dev
```

---

## Usage

1. Type a company name (any name — it's all simulated), optionally pick an
   industry and region, and click **Analyze**. Two sequential LLM calls run:
   news simulation, then risk analysis (allow a couple of minutes on CPU).
2. Or click a sample — **TechCorp Global** (electronics, governance issues),
   **GreenHarvest Foods** (agriculture, high environmental risk),
   **SteelBridge Industries** (manufacturing, geopolitical exposure) — for an
   instant pre-built report.
3. Explore the dashboard: ESG gauges, top-3 risks, the event timeline
   (hover points for details), the sortable/expandable events table, and the
   recommendation cards. The dark sidebar summarizes company, trend, event
   count, and analysis confidence.

---

## Architecture

### `lib/types.ts`
Domain model: `RiskEvent` (date, title, summary, one of six `RiskCategory`
values, severity 1–5, source attribution, optional affected suppliers),
`ESGScore`, and the top-level `SupplyChainReport`. Also exports the
category → color map shared by the timeline and the table badges.

### `lib/ollama.ts`
Shared structured-output caller: JSON schema in Ollama's `format` field,
AbortController timeout, descriptive Ollama-down/parse errors.

### `lib/newsSimulator.ts`
First pipeline stage. Prompts the model to generate 8–12 **entirely
fictional** news events for the company: mixed categories (≥4 must appear),
realistic severity distribution, headline-style titles, outlet attributions
("Reuters", "Bloomberg", "industry trade press"…), and fictional supplier
names. The model outputs `months_ago` (0–6) per event; the code converts
that to concrete dates so events always land in the trailing 6-month window
regardless of the model's knowledge cutoff. Runs at temperature 0.7 for
variety.

### `lib/riskAnalysis.ts`
Second stage. Feeds the event digest to the model as a "senior supply chain
risk analyst" and gets back schema-constrained ESG scores (with instructions
tying pillar scores to event evidence), exactly 3 top risks, exactly 5
recommendations, a trend judgment, and a confidence value. Temperature 0.2.

### `lib/sampleData.ts`
Three fully hand-written `SupplyChainReport`s (~10 events each) matching the
three archetypes above, so the dashboard demos instantly.

### `app/api/analyze/route.ts`
POST `{ name, industry?, region? }` → `SupplyChainReport`. Chains
simulateNews → analyzeRisk with a 4-minute overall pipeline timeout on top
of the per-call timeouts.

### Components
- **`ESGGauge.tsx`** — large overall number + three animated mini circular
  gauges (E, S, G), color-banded green/amber/red.
- **`RiskTimeline.tsx`** — recharts scatter chart: x = date, y = severity,
  one series per category with the shared category colors and a custom
  tooltip showing the headline.
- **`EventRow.tsx`** — expandable table row (date, title, category pill,
  severity, source; summary + affected suppliers on click).

### `app/page.tsx`
Dark sidebar (company, trend, event count, confidence) + light main area:
search bar with dropdowns and sample buttons, ESG card, top risks, timeline,
sortable events table (click column headers), recommendation cards, and the
confidence disclaimer.

---

## Caveats

- **All news is AI-generated fiction** — the simulator is explicitly told
  not to recount real incidents, but LLMs can still echo real-world
  patterns. Never treat an event as factual.
- **ESG scores are illustrative**, not calibrated to any rating methodology
  (MSCI, Sustainalytics, etc.).
- Two sequential LLM calls mean analysis takes 1–3 minutes on CPU.
- Portfolio demonstration project only.
