# Delivery Confidence Scorer

Enter a delivery address and order metadata (weight, value, delivery window,
carrier, signature/fragile flags, optional address history) and get a
**pre-shipment delivery confidence score (0–100)** with categorized risk
factors, mitigations, and suggested actions. Inspired by UPS Capital's
delivery confidence scoring.

Scoring is performed by a local **llama3.1:8b** model acting as a logistics
risk analyst, guided by explicit heuristics and constrained to structured
JSON output.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 |
| LLM runtime | Ollama — `llama3.1:8b` |

## Prerequisites

- Node.js 18.18+
- Ollama running locally (`ollama serve`) with the model pulled:
  ```bash
  ollama pull llama3.1:8b
  ```

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Sample scenarios

Five one-click scenarios above the form span the confidence spectrum:

| Scenario | Setup | Designed score band |
|---|---|---|
| **Safe suburban** | Residential, 1.2 kg, $45, 14/14 successful history | 90+ |
| **Risky urban apartment** | No doorman, $1,150 value, no signature, 4/6 history | 55–65 |
| **Rural express** | Remote Montana address, express, same-day window | 40–55 |
| **Commercial reliable** | Office tower, signature required, 31/32 history | 85+ |
| **PO Box fragile** | PO box, fragile, 12.5 kg, $899, 1/2 history | 30–45 |

Actual scores vary between runs — the LLM does the judging, the bands are
design intent.

---

## Architecture

### `lib/types.ts`
Domain model: `DeliveryInput` (address with `residential`/`commercial`/
`po_box` type, order metadata, optional history), `RiskFactor` (category ×
severity × detail × mitigation), and `DeliveryScore` (confidence, risk
level, factors, recommendations, estimated attempts, suggested actions).

### `lib/scoring.ts`
The single Ollama call. `buildPrompt()` casts the model as a senior
logistics risk analyst and encodes the scoring heuristics explicitly: PO box
+ high value, unattended residential high-value drops, express-to-rural
timing risk, sub-80% historical success rates, and heavy fragile packages.
`SCORE_SCHEMA` enum-constrains categories, severities, and risk levels, and
bounds confidence (0–100) and estimated attempts (1–5). Responses are
clamped server-side as well. 120-second `AbortController` timeout with
descriptive Ollama-down errors.

### `lib/sampleData.ts`
The five scenarios above as fully-populated `DeliveryInput` objects.

### `app/api/score/route.ts`
POST `{ input: DeliveryInput }` → `DeliveryScore`. Validates the minimum
viable input (city, ZIP, positive weight) and maps errors to 4xx/500 JSON.

### `app/page.tsx`
Two-column layout (stacked on mobile). Left: the input form in four
sections — Address (with country dropdown and address-type selector),
Package (weight slider, value input, fragile toggle), Delivery (carrier
dropdown, service-level radios, signature toggle, window date pickers), and
optional History. Right: the results dashboard — circular confidence gauge
over a stylized map backdrop, risk-level badge, expandable risk cards
grouped by category, numbered recommendations, and a suggested-actions
checklist.

### `components/ConfidenceGauge.tsx`
SVG 270° circular gauge with an animated stroke sweep on mount and
red→amber→green color bands (80+/60+/40+/below). Also exports the
risk-level → color map used by the badge.

### `components/RiskCard.tsx`
Expandable card with a category icon (📍🌧📦⏱🗂), severity badge, and a
severity-colored left border; detail text and mitigation appear on click.

---

## Caveats

- **Heuristic LLM scoring, not real logistics data.** No geocoding, carrier
  APIs, weather feeds, or actual delivery statistics are involved — the
  model applies prompted heuristics plus its own judgment.
- **Scores vary between runs** even for identical input (temperature 0.2).
- The map behind the gauge is a decorative CSS gradient, not a real map.
- For portfolio demonstration purposes only — do not base shipping or
  insurance decisions on this output.
