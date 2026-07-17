# Real-time Fraud Detection Pipeline

Simulates a live stream of financial transactions, scores each with a
**statistical anomaly model** (no LLM in the hot path), flags suspicious
activity in real time, and renders a SOC-style monitoring dashboard.
Flagged transactions — and only those — get a human-readable explanation
from a local LLM. Inspired by Cloudwalk and Bradesco.

**All data is synthetic.** Customers, merchants, cards, and amounts are
generated; no real financial data is involved.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 (dark SOC theme) |
| Charts | recharts |
| Statistics | mathjs (mean / σ for baseline deviation) |
| Streaming | Server-Sent Events (`EventSource`) |
| LLM runtime | Ollama — `llama3.1:8b` (explanations only, with a deterministic fallback) |

## Prerequisites

- Node.js 18.18+
- Optional: Ollama with `llama3.1:8b` for LLM explanations. **The simulation
  runs fine without Ollama** — flagged transactions fall back to a
  deterministic signal-based explanation.

## Setup

```bash
npm install
npm run dev
```

---

## How scoring works

### Customer profiles (`lib/customerProfiles.ts`)
20 simulated customers, each with a home city (with coordinates for travel
checks), currency, average spend, usual categories, timezone offset, and a
risk tier. The generator and every check reason **relative to each
customer's baseline**, which is what makes the anomalies detectable.

### Transaction generator (`lib/transactionGenerator.ts`)
Stateful class holding per-customer history. Weighted intents:
- **85% normal** — usual categories, amounts jittered around the profile
  average, home city.
- **10% suspicious** — exactly one anomaly: ~4.5× amount, an off-profile
  category, or a forced ~3am local-time transaction.
- **5% fraudulent** — compounded anomalies: foreign city (Lagos, Singapore,
  Dubai, Moscow) + ~9× amounts, or round-number transfers ($1000/$2000/…).

### Statistical scoring (`lib/fraudScoring.ts`) — no LLM
Five checks, each returning a signal scored 0–30; the sum (capped at 100)
is the risk score:
- `velocityCheck` — >3 transactions on a card within 5 minutes
- `amountCheck` — >3× the customer baseline (σ-deviation reported when ≥5
  history points exist, via mathjs)
- `locationCheck` — haversine distance / elapsed time > 900 km/h
  ("impossible travel"), with a lesser signal for >3000 km jumps
- `timeCheck` — 01:00–05:00 in the customer's home timezone
- `patternCheck` — category outside the profile (transfers/ATM weighted
  higher), plus a round-number-transfer heuristic

Score > 50 ⇒ flagged (action `review`); > 75 ⇒ `block`.

### LLM explanations (`lib/fraudExplainer.ts`)
Called **only for flagged transactions**, keeping LLM usage to ~10–15% of
volume. 45-second timeout; on any failure it returns a deterministic
explanation assembled from the signals so the stream never stalls.

---

## API

- **`GET /api/simulate?speed=1|2|5`** — SSE stream. Emits a
  `{ transaction, result }` event per transaction (1/2/5 per second) and a
  stats snapshot every 5 transactions. A `busy` guard skips ticks while a
  slow LLM explanation is in flight rather than stacking them. Close the
  connection to stop.
- **`POST /api/analyze`** — score a single transaction JSON manually
  (history-free), returning a full `FraudResult`.

---

## Dashboard (`app/page.tsx`)

- **Control bar** — start/stop toggle with a live pulse dot, speed selector,
  and six real-time counters (processed, flagged, blocked, flag rate, avg
  risk, amount at risk) that pulse on change.
- **Transaction feed** — terminal-style rolling list of the last 50, flagged
  rows edged amber/red; click to inspect.
- **Detail panel** — full fields, per-signal scores, the LLM explanation
  block for flagged items, and Approve/Review/Block buttons (UI only).
- **Charts** — risk-score histogram, flag-rate-per-minute line, flags by
  category, and a top-flagged-customers table. Aggregates cover *all*
  processed transactions, not just the visible 50.

---

## Caveats

- The scoring model is intentionally simple and threshold-based — a
  demonstration of pipeline architecture, not production fraud modeling.
- Simulated timestamps for "late-night" anomalies are shifted synthetically,
  which can make feed ordering look non-monotonic — expected.
- LLM explanations add latency at 5x speed; the tick guard drops ticks
  rather than queueing, so effective throughput dips while explaining.
- Portfolio demonstration project only.
