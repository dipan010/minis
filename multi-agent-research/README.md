# Multi-Agent Research Assistant

Submit a research question → a pipeline of specialized AI agents —
**Planner → Researcher → Writer → Reviewer** — collaborates to produce a
structured research report, streaming every agent step to the browser in
real time over Server-Sent Events. Inspired by Anara and BCG's AI research
workflows.

**No web access.** The Researcher generates findings from the model's
training knowledge, every finding carries an "AI-generated, not from a real
source" note, and all references are explicitly marked **⚠ Simulated**.

---

## The agent pipeline

```
                ┌────────────────────────────────────────────────────┐
                │                 orchestrate(query)                 │
                └────────────────────────────────────────────────────┘
                      │              │              │            │
   ResearchQuery ──▶ ◆ Planner ──▶ ◉ Researcher ─▶ ✎ Writer ──▶ ☑ Reviewer ──▶ report
                      │              │  (per sub-Q)  │            │
                      ▼              ▼              ▼            ▼
                 ResearchPlan   Finding[]      draft report   score + feedback
                                                    ▲            │
                                                    └── rewrite ─┘
                                              (deep mode, score < 70)
```

Every agent emits `AgentMessage`s (`thinking` / `action` / `result`) through
a callback; the orchestrator timestamps and forwards them to the SSE stream,
so the browser watches the run like a terminal session.

- **Planner** (`lib/agents/planner.ts`) — "senior research director":
  decomposes the question into 3–6 sub-questions (count scales with depth),
  search-style queries, and a proposed section structure.
- **Researcher** (`lib/agents/researcher.ts`) — "domain expert": works
  through sub-questions sequentially, producing a summary, 3–6 key facts,
  and a relevance score per finding, each labeled as AI-generated.
- **Writer** (`lib/agents/writer.ts`) — "senior research analyst": one
  large structured call synthesizing all findings into the planned
  structure, plus abstract, conclusion, limitations, and numbered simulated
  references. Also exposes `reviseSections()` for the rewrite loop.
- **Reviewer** (`lib/agents/reviewer.ts`) — "peer reviewer": scores the
  draft 0–100, gives actionable feedback, and flags up to 3 sections. On
  **deep** depth with a score below 70, the orchestrator sends flagged
  sections back to the Writer and re-reviews.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 |
| Streaming | Server-Sent Events via a `ReadableStream` response |
| LLM runtime | Ollama — `llama3.1:8b` |

## Prerequisites

- Node.js 18.18+
- Ollama running locally with `ollama pull llama3.1:8b`
- The three sample buttons render pre-built reports with **no Ollama**.

## Setup

```bash
npm install
npm run dev
```

---

## Usage

1. Enter a question (or load a sample), choose depth
   (**quick** ≈ 3 sub-questions, **standard** ≈ 4–5, **deep** ≈ 5–6 + the
   rewrite loop) and format (report / briefing / comparison), then click
   **Start Research**.
2. Watch the **agent activity feed** — a dark terminal-style panel with
   color-coded agents (planner blue, researcher green, writer purple,
   reviewer amber), message-type badges, timestamps, auto-scroll, and a
   "Step N of ~M" progress bar.
3. When the run completes the **final report** renders as a formal paper:
   serif headings, justified text, abstract, numbered sections (each noting
   which findings it draws on), conclusion, limitations, and simulated
   references — with the reviewer score badged top-right.
4. **View agent trace** re-opens the full activity log;
   **Export as Markdown** downloads the report.

Expect full runs to take several minutes on CPU (6–12 sequential LLM calls
depending on depth).

---

## Architecture notes

### SSE plumbing (`app/api/research/route.ts`)
The POST handler returns a `ReadableStream`. Inside `start()`, the
orchestrator's `onMessage` callback is converted into
`data: {json}\n\n` chunks; the final event carries the whole report +
review, and errors are sent as a terminal `error` event rather than a
broken stream. The client reads `res.body` with a `TextDecoder`, splitting
on blank lines — no `EventSource` needed, which keeps POST bodies possible.

### Orchestrator (`lib/orchestrator.ts`)
Owns sequencing, step counting, timing, and the conditional rewrite loop;
agents stay single-purpose. The step counter doubles as the progress
numerator; the per-depth denominator is an estimate (`DEPTH_STEP_ESTIMATE`)
so the bar caps at 95% until completion.

### `lib/sampleData.ts`
Three complete hand-written sample runs (reports + reviewer verdicts) for
the sample buttons.

---

## Caveats

- **All research content is AI-generated** from training knowledge — no
  retrieval, no citations to real documents. References are simulated by
  design and labeled as such.
- Runs are slow on CPU; the writer call alone can take 1–3 minutes.
- An 8B model's review scores are noisy; the deep-mode rewrite loop
  triggers inconsistently.
- Portfolio demonstration project only.
