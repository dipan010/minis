# Compliance Document Checker

Upload (or paste) a **company policy** and a **regulation/standard** → get a
gap analysis: every regulatory requirement extracted, assessed as
compliant / partial / gap / not-applicable against the policy, scored,
prioritized, and summarized. Inspired by Deloitte's Tariff Suite and
AODocs.

> ⚠️ Compliance assessments here are **AI-generated and not legally
> binding**. Requirement extraction is approximate. Always have qualified
> compliance officers review results. The bundled sample "regulations" are
> simplified synthetic summaries — not actual legal text. Portfolio
> project only.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 (conservative audit theme) |
| PDF extraction | `pdf-parse@1.1.1` |
| LLM runtime | Ollama — `llama3.1:8b` |

## Prerequisites

- Node.js 18.18+
- Ollama running locally with `ollama pull llama3.1:8b`

## Setup

```bash
npm install
npm run dev
```

---

## Usage

1. Fill both panels — paste text or upload a PDF for each side — or load a
   sample pair:
   - **Sample 1:** Employee Data Privacy Policy vs GDPR Art. 5–9
     (simplified) — designed to surface gaps around retention schedules and
     the right to erasure.
   - **Sample 2:** IT Security Policy vs SOC 2 controls (simplified) —
     designed to show partial compliance on access revocation timing,
     access reviews, IR plan testing, and risk assessment cadence.
2. Click **Run Gap Analysis**. The pipeline runs several batched LLM calls
   and can take a few minutes on CPU (5-minute cap).
3. Review: score gauge + executive summary, status stat cards with a
   stacked proportion bar, priority-gap alert cards (mandatory gaps first),
   the sortable/expandable full results table, and prioritized
   recommendations. **Export gap analysis** downloads everything as
   Markdown.

---

## Architecture

### `lib/requirementExtractor.ts`
One LLM call parses the regulation into 4–25 individually checkable
requirements — section reference, single-obligation restatement, topical
category, and criticality derived from the modal language (shall/must →
mandatory, should → recommended, may → optional). IDs are assigned in code.

### `lib/complianceAnalyzer.ts`
Assesses requirements **in batches of 5 per LLM call** for efficiency.
Each assessment returns status, confidence, a quoted policy reference (or
"none"), justification, and remediation. The prompt instructs strict
judgment ("vague policy language does not satisfy a specific obligation").
Assessments the model drops are backfilled as low-confidence gaps so the
report always covers every requirement.

### `lib/reportGenerator.ts`
Deterministic math first: overall score =
`(compliant + 0.5·partial) / applicable × 100`; priority gaps sorted by
criticality then gap-before-partial. Then one LLM call writes the
executive summary and 3–7 recommendations — with a deterministic fallback
if Ollama fails, so the report still completes.

### `app/api/analyze/route.ts`
Accepts multipart form data (text or PDF per side) or JSON. Pipeline:
extract text → extractRequirements → analyzeCompliance → generateReport,
with a 5-minute overall timeout.

### Components
`ComplianceGauge` (animated circular score), `StatusBar` (stacked
proportion bar with legend), `CriticalityBadge`, `GapAlert` (priority-gap
card with remediation), `RequirementRow` (expandable table row with
confidence bar).

---

## Caveats

- Requirement splitting and status judgments vary between runs; treat the
  output as a starting checklist, not a verdict.
- Long documents are truncated (~12k chars regulation, ~10k policy) to fit
  the local model's context.
- Scanned (image-only) PDFs yield no text via `pdf-parse`.
- Batched analysis of ~20 requirements ≈ 4–6 LLM calls — minutes on CPU.
