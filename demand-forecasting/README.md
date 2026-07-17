# AI-Powered Demand Forecasting

Upload a historical sales CSV → get a demand forecast chart with an 80%
confidence band, **anomaly detection**, **seasonality decomposition**, and
**inventory recommendations** (reorder point, safety stock, order quantity),
plus five business-language insights written by a local LLM. Inspired by
Devoteam and Kinaxis.

The forecasting itself is **pure statistics** — the LLM only narrates.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 (light BI theme) |
| Charts | recharts (composed chart) |
| Statistics | mathjs + papaparse |
| LLM runtime | Ollama — `llama3.1:8b` (insights only, deterministic fallback) |

## Prerequisites

- Node.js 18.18+
- Optional: Ollama with `llama3.1:8b` for LLM-written insights — without it,
  deterministic insights are generated from the same numbers.

## Setup

```bash
npm install
npm run dev
```

## CSV format

Minimum: a **date** column (`date`/`day`/`order_date`/`month`) and a
**quantity** column (`quantity`/`qty`/`units`/`sales`/`mrr`). Optional:
`product`, `revenue`, `region`. Headers are auto-detected (exact match
first, then substring). Multiple products are aggregated per day. At least
14 valid rows are required.

---

## Statistical methods (`lib/forecasting.ts`)

- **Smoothing / fit** — simple exponential smoothing (α = 0.3); the fitted
  series doubles as the expectation for anomaly detection.
- **Trend** — least-squares slope; direction is classified by the slope's
  relative magnitude over the window (±10%).
- **Seasonality** — autocorrelation at lags 7 / 30 / 91 / 365 (each only
  when enough data exists); components with r ≥ 0.25 are reported with
  their strength and peak buckets (weekday names, days of month, months).
- **Anomalies** — residual z-scores against the smoothed fit; |z| > 2 flags
  a point (mild), > 3 moderate, > 4 severe, with a heuristic possible cause
  from the deviation's sign.
- **Forecast** — last smoothed level + linear trend, multiplied by weekly
  multiplicative seasonal indices when weekly autocorrelation is
  significant. 80% confidence bounds come from residual σ (z = 1.28),
  widening with the horizon.
- **Inventory** — reorder point = avg daily demand × lead time + safety
  stock; safety stock = 1.65 × demand σ × √lead time (~95% service level);
  order quantity covers ~2 lead times. Stockout risk is classified from the
  demand coefficient of variation and lead time length.

## Sample datasets (`lib/sampleData.ts`)

Deterministic (seeded PRNG), so results are reproducible:
1. **Electronics Store** — 365 days × 3 products, weekend uplift, a
   Nov–Dec holiday surge, January slump.
2. **Grocery Chain** — 180 days, payday spikes (1st–4th, 15th–17th), and a
   9-day supply disruption at ~30% volume that the anomaly detector should
   catch.
3. **SaaS Subscriptions** — 24 monthly MRR points, steady ~3.5–5.5% growth
   with small quarter-end dips.

## Pipeline (`app/api/forecast/route.ts`)

parse → aggregate daily → forecast + anomalies → seasonality → inventory →
LLM insights → `ForecastReport`. Accepts JSON (`csvText`) or
multipart form data (`file`), plus `horizon` (7–90 days) and `leadTime`
(1–60 days).

---

## Caveats

- **Simple models by design** — no ARIMA/Prophet/ML; treat outputs as
  illustrative, not production forecasting.
- Monthly-granularity data (like the SaaS sample) flows through the same
  "daily" pipeline — horizons are then effectively in rows, not days.
- Confidence bands assume roughly normal residuals.
- All sample data is synthetic; portfolio demonstration only.
