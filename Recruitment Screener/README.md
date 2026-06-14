# Recruitment Screener

An AI-powered recruitment screening tool that evaluates a candidate's resume against a job description and produces a structured match report. You paste (or upload as a PDF) both documents, hit "Score candidate", and the app sends them to a locally-running Ollama model which scores the candidate across five fixed dimensions — Technical skills, Experience & seniority, Education & certifications, Domain / industry experience, and Responsibilities & scope alignment — returning an overall score, a one-line verdict, a short summary, and separate lists of strengths and gaps. Because inference runs entirely on your machine via Ollama, no candidate data ever leaves your network.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 with custom design tokens |
| LLM runtime | [Ollama](https://ollama.com) — `llama3.1:8b` |
| PDF extraction | `pdf-parse@1.1.1` |
| Fonts | Google Fonts via `next/font/google` (Fraunces, Inter, IBM Plex Mono) |

---

## Prerequisites

- **Node.js 18.18+** — check with `node -v`
- **Ollama installed** — see [ollama.com/download](https://ollama.com/download)
- **llama3.1:8b pulled locally:**
  ```bash
  ollama pull llama3.1:8b
  ```
- Ollama running in the background:
  ```bash
  ollama serve
  ```

---

## Running

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Note — Google Fonts on first run:** `next/font/google` downloads font files
> from Google Fonts at build / dev-server startup and caches them locally. This
> requires an internet connection the first time. Subsequent runs work offline
> from the cache. If you're in a fully air-gapped environment, the dev server
> will still start but the custom typefaces (Fraunces, Inter, IBM Plex Mono)
> will fall back to the system serif / sans-serif / monospace stack defined in
> `tailwind.config.js`.

---

## Usage

1. **Paste text** into the Job Description and Resume cards, or click
   "or upload … as a PDF" beneath each card to extract text from a PDF file.
   Uploading a PDF overrides any pasted text for that side.

2. **Sample data buttons** let you try the tool immediately without preparing
   your own documents:
   - **Job Description → "Load sample"** loads a fictional Senior Backend
     Engineer role at FinFlow Technologies.
   - **Resume → "Sample: strong fit"** loads Ananya Rao, a strong match
     (Go + Kafka, payments domain, PCI-DSS, K8s).
   - **Resume → "Sample: partial fit"** loads Rohan Mehta, a partial match
     (Node.js full-stack, no Go, no fintech experience).

3. Optionally expand **Model settings** (top-right toggle) to point the app at
   a different Ollama URL or swap in a different model name.

4. Click **Score candidate**. Results appear below the button as a full report
   card once Ollama responds.

---

## Architecture

### `lib/types.ts`
Defines the shared TypeScript types for the entire app. `ScreeningResult` is
the exact shape the LLM is asked to return: `overall_score`, `verdict`,
`summary`, `criteria` (an array of `CriterionScore`), `strengths`, and `gaps`.
`CRITERIA_DIMENSIONS` is a `const` tuple of the five fixed scoring dimension
names — it is the single source of truth referenced by both the prompt builder
and any UI that renders those names. `ScoreRequestBody` types the request body
that the API route accepts.

### `lib/ollama.ts`
Handles all LLM communication. `SCORE_SCHEMA` is a JSON Schema object passed
verbatim to Ollama's `format` field, which constrains the model to emit valid
structured output matching `ScreeningResult` (integer 0–100 bounds enforced on
all score fields). `buildPrompt()` constructs a detailed system + user prompt
that instructs the model to act as an experienced technical recruiter, score
strictly on evidence in the resume without assuming unstated skills, and use
the five `CRITERIA_DIMENSIONS` names verbatim and in order. `scoreMatch()`
POSTs to `${ollamaUrl}/api/generate` with `stream: false`,
`temperature: 0.1`, and the schema in `format`, then parses `data.response`
as JSON into a `ScreeningResult`. It provides clear, actionable error messages
for the two most common failure modes: Ollama not running (ECONNREFUSED / fetch
failed) and malformed JSON in the model's response.

### `lib/sampleData.ts`
Three fictional but realistic constants for rapid testing without Ollama.
`SAMPLE_JD` describes a Senior Backend Engineer role at FinFlow Technologies
(Go, Kafka, AWS, K8s, 5+ years, fintech preferred, PCI-DSS nice-to-have).
`SAMPLE_RESUME_STRONG` is Ananya Rao — a near-perfect match with Go, Kafka at
scale, PCI-DSS compliance, K8s, PostgreSQL optimisation, and mentoring
experience. `SAMPLE_RESUME_PARTIAL` is Rohan Mehta — a full-stack Node.js
developer with some AWS but no Go, no Kafka, no fintech, and fewer years of
experience. Together they are designed to produce meaningfully different overall
scores when fed through the scorer.

### `app/api/score/route.ts`
The Next.js App Router POST handler that sits between the browser and Ollama.
It reads `multipart/form-data` and, for each side (JD and resume), prefers a
PDF upload over pasted text — extracting PDF text via `pdf-parse` when a file
is present. After validating that both sides are non-empty it calls
`scoreMatch()` and returns the `ScreeningResult` as JSON. HTTP errors from
Ollama and JSON parse failures are caught and returned as 500 responses with
descriptive messages; an extra hint ("Is Ollama running? Try: ollama serve")
is appended when the underlying error is a fetch failure. The route sets
`runtime = "nodejs"` to ensure Node.js APIs are available for `pdf-parse`.

### `app/page.tsx`
The single client component that renders the full UI. It manages six pieces of
state: the four input values (jdText, jdFile, resumeText, resumeFile), the two
model-settings values (model, ollamaUrl), plus UI flags (showAdvanced, loading)
and the result/error pair. The two input cards follow a mutual-exclusivity rule:
typing text clears any uploaded file for that side, and selecting a file clears
the pasted text. `handleScreen` builds a `FormData` payload, POSTs it to
`/api/score`, and populates either `result` or `error`. The results section
renders the overall score in a large display typeface coloured by `bandColor`,
followed by the verdict, summary, strengths/gaps lists, and the criteria
breakdown table.

### `components/ScoreMeter.tsx`
The signature visual element of the report. A horizontal 0–100 measure bar
rendered entirely in inline styles and Tailwind, with a coloured fill, a
circular marker at the score position, 11 evenly-spaced tick marks (first and
last transparent), and — in `size="lg"` mode — axis labels at 0, 50, and 100.
The exported `bandColor(score)` function maps scores to one of three semantic
CSS variable colours: `--match` (green, ≥ 75), `--partial` (amber, ≥ 50),
`--gap` (rust, < 50). This function is also imported by `page.tsx` to colour
the overall score number and verdict text without duplicating the threshold
logic.

### `components/CriterionRow.tsx`
Renders a single row in the criteria breakdown section of the report. Accepts a
`CriterionScore` (`name`, `score`, `rationale`) and renders the dimension name
and numeric score on a baseline-aligned flex row, a small `ScoreMeter`, and the
one-to-two-sentence rationale beneath it. A `border-b border-hairline` with
`last:border-b-0` creates a clean divider list without a trailing line.

---

## Caveats

- **Ollama version:** Structured JSON output via the `format` field requires
  Ollama **0.3.0 or later**. If you see the model ignoring the schema and
  returning free-form text, run `ollama --version` and upgrade if needed.

- **pdf-parse import path:** `pdf-parse` is imported as
  `require("pdf-parse/lib/pdf-parse.js")` rather than the package root. The
  root entry point (`require("pdf-parse")`) runs a debug self-test at import
  time that tries to read a bundled test PDF from an absolute path, which fails
  in Next.js server builds and serverless environments. Using the internal
  `lib/pdf-parse.js` path skips that check. This is a well-known community
  workaround for `pdf-parse@1.1.1`.

- **Non-determinism:** Even at `temperature: 0.1`, scores will vary slightly
  between runs for the same inputs. The structured-output schema constrains the
  *shape* of the response but not the exact numeric values the model chooses.
  Treat scores as directional guidance, not precise measurements.

---

## Feature checklist

- [x] JD + resume parser (paste or PDF upload)
- [x] Ollama match scoring with JSON schema–constrained output
- [ ] Tailored interview questions
- [ ] Bias-flag layer
