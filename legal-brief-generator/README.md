# Legal Brief Generator

Input case facts → get a **structured legal argument outline**: executive
summary, statement of facts, issues presented, 3–4 arguments (each with
supporting points, footnoted case references, the anticipated
counterargument, and a rebuttal), an opposition summary, a recommended
strategy, and a risk assessment. Inspired by Harvey AI and Altumatim.

> ## ⚠️ Disclaimer — read first
>
> **This tool does not provide legal advice.** It is a portfolio
> demonstration project. All case law references are AI-generated and
> **potentially fictional** — every reference is tagged
> "⚠ Synthetic reference — verify before use" unless the model asserts
> otherwise, and even then it must be verified. Nothing this tool produces
> should be filed, relied upon, or shown to a client without review by a
> qualified attorney.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 |
| Typeface | Lora (serif, via `next/font/google`) for the document body |
| LLM runtime | Ollama — `llama3.1:8b` |

## Prerequisites

- Node.js 18.18+
- Ollama running locally with `ollama pull llama3.1:8b`

## Setup

```bash
npm install
npm run dev
```

> `next/font/google` needs network access on first build to fetch Lora; in a
> fully offline environment the build still works and falls back to Georgia.

---

## Usage

1. Load one of the three sample cases — a software-license contract dispute
   (US Federal, plaintiff), an age-discrimination wrongful termination
   (US State, plaintiff), or a patent-troll defense (India, defendant) — or
   fill the form yourself: title, jurisdiction, area of law, client
   position, facts (the more specific, the better the brief), desired
   outcome, and optional key-issue tags (type + Enter).
2. Click **Generate Brief**. Generation is a single large structured LLM
   call and can take 1–3 minutes on CPU (3-minute timeout).
3. Read the brief as a formal document: sticky table of contents with
   scroll tracking (desktop), collapsible argument sections, footnote-style
   case references with synthetic-reference warnings, and a risk assessment
   card. **Export as Markdown** downloads the whole document with proper
   footnotes.

---

## Architecture

### `lib/types.ts`
Domain model mirroring a brief's structure: `CaseInput`, `LegalArgument`,
`CaseReference` (with the load-bearing `is_synthetic` flag), and
`LegalBrief` with its `risk_assessment`. Also exports display label maps
and the standard disclaimer string.

### `lib/briefGenerator.ts`
The single Ollama call. The system prompt casts the model as a senior
litigation attorney and — critically — instructs it that any case reference
it cannot guarantee is real must be marked `is_synthetic: true` ("when in
doubt, mark true"). `BRIEF_SCHEMA` constrains the output shape: 2–5 issues,
3–4 arguments each with 2–5 supporting points and 1–3 references,
enum-bound strength, and 0–100 confidence. The jurisdiction label and the
fixed disclaimer are attached server-side rather than trusted to the model.

### `lib/sampleCases.ts`
Three fictional but detailed sample cases (~150 words of facts each) chosen
to exercise different jurisdictions, areas of law, and client positions.

### `lib/exportBrief.ts`
Pure function rendering a `LegalBrief` to Markdown with real footnote
syntax (`[^n]`) and the synthetic-reference warnings preserved.

### `app/api/generate/route.ts`
POST `CaseInput` → `LegalBrief`. Validates title/facts/outcome and allows
up to 3 minutes for generation.

### Components
- **`ArgumentSection.tsx`** — collapsible argument with Roman-numeral
  heading, thesis, numbered supporting points, an "Authorities" footnote
  block, and side-by-side counterargument/rebuttal panels.
- **`CaseRefFootnote.tsx`** — footnote-styled reference with the amber
  "⚠ Synthetic reference — verify before use" tag.
- **`RiskBadge.tsx`** — strong/moderate/weak pill with confidence %.
- **`TableOfContents.tsx`** — sticky TOC using an IntersectionObserver to
  highlight the section in view; clicking scrolls smoothly.

### `app/page.tsx`
Left panel: the case input form (sticky, independently scrollable on
desktop). Right panel: the brief rendered as a formal document — cream
paper background, serif body (Lora), navy headings, disclaimer banners at
top and bottom.

---

## Caveats

- **Case references are usually fictional.** A local 8B model cannot
  reliably cite real case law; the design treats every citation as suspect
  by default.
- **Legal reasoning quality is illustrative** — arguments read plausibly
  but may misstate doctrine, elements, or burdens. This is a document
  *structuring* demo, not a legal research tool.
- Generation takes 1–3 minutes on CPU and output varies between runs.
- For portfolio demonstration only. Not legal advice. No attorney-client
  relationship is created by using this software.
