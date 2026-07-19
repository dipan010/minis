# LinkedIn Post — 12-Project AI Portfolio

> Below is a post you can paste directly. The line above the ✂️ is the
> "above the fold" hook LinkedIn shows before "…see more". Everything after
> is what unfolds on click.

---

I just shipped 12 full-stack AI projects. Every one runs locally.
Zero API keys. Zero cloud calls. Zero real user data.

Here's what I learned building an AI portfolio that respects the "no
credentials, no vendor lock-in" constraint — and why that constraint made
the work sharper, not weaker.

✂️ — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — —

The rules I set for myself:

• Next.js 14 (App Router) + TypeScript strict + Tailwind for every project
• Ollama (llama3.1:8b, plus llava:13b for one) for every LLM call
• JSON-schema-constrained structured output — no free-text parsing
• Sample data buttons that work with no LLM at all
• A README that names exactly what's real math vs. what's an LLM guess

Then I built 12 things spanning HR, tax, logistics, ESG, legal, social,
research, fraud, healthcare, retail, GRC, and marketing.

────────

1. Recruitment Screener — JD + resume → 5-dimension match score, plus a
tailored 12-question interview kit and an automatic bias flag layer that
audits the score itself for age/gender/prestige signals.

2. AI Tax Form Extractor — W-2 / 1099 / Form 16 upload → llava:13b OCRs
the image, llama3.1 classifies the form and extracts fields with a JSON
schema built dynamically from the form type. Editable output with green /
amber / red confidence badges.

3. Delivery Confidence Scorer — Address + order metadata → 0-100 delivery
success prediction with categorised risk factors and mitigations. Five
scenarios pre-loaded spanning safe suburban to fragile-PO-box-fraud.

4. Supply Chain Risk Monitor — Company name → a two-stage pipeline invents
a plausible 6-month news feed, then acts as a risk analyst over it. ESG
gauges, severity-timeline scatter chart, sortable events table.

5. Legal Brief Generator — Case facts → executive summary, 3-4 arguments
each with counterargument and rebuttal, footnoted case references (every
one tagged "⚠ Synthetic — verify before use" because an 8B model cannot
cite real case law). Serif document UI, sticky scroll-tracking TOC.

6. Social Listening Dashboard — Keyword → 3-stage pipeline (fictional feed
simulation → topic clustering → 5 insights). Dark analytics theme, stacked
sentiment area chart, filterable post feed.

7. Multi-Agent Research Assistant — This one was the fun one. Planner →
Researcher → Writer → Reviewer, four agent classes orchestrated
sequentially with a deep-mode rewrite loop. The whole run streams over
Server-Sent Events into a terminal-style feed. Watch each agent think in
real time. Ends with a paper-style report and a reviewer score badge.

8. Real-time Fraud Detection Pipeline — Stateful transaction generator
across 20 simulated customer profiles → 5-check statistical scoring
(velocity, σ-deviation on amount, impossible-travel via haversine, local
timezone hour, category pattern). LLM is called only for flagged items —
keeps costs bounded — with a deterministic fallback so the SSE stream
never stalls.

9. Clinical Note Scribe — Doctor-patient transcript → structured SOAP
note with ICD-10 confidence bars. The prompt hard-forbids invented vitals
or doses; deterministic post-processing adds quality flags for anything
still missing. Prominent "not a medical device" disclaimers everywhere.

10. AI-Powered Demand Forecasting — CSV upload → auto-detected columns,
exponential smoothing forecast with weekly seasonal indices, 80% confidence
band, autocorrelation-based seasonality detection, z-score anomalies,
reorder-point inventory math. LLM only narrates the numbers.

11. Compliance Document Checker — Policy + regulation → LLM extracts
individual requirements, assesses them in batches of 5 (efficiency), math
computes the overall score and priority ranking. Sample pairs: GDPR-like
and SOC-2-like, both simplified synthetic summaries with deliberate gaps.

12. Marketing Campaign Generator — Brief + segment → 4 sequential
generation phases producing 6 A/B ad variants (with hard character-limit
enforcement), a 5-email drip with rendered HTML in a mock inbox, 8
platform-native social posts, image-generation prompts with palette
swatches, and a content calendar.

────────

What I actually learned:

▸ Structured output changes what "LLM app" means. Every project uses
Ollama's format field with a JSON schema. Once the shape is guaranteed, the
UI can be as opinionated as any traditional app.

▸ Split the pipeline. Every project separates deterministic work from LLM
work. The fraud pipeline scores statistically and only calls the LLM to
explain flagged items. The forecaster does all math in code and only asks
the LLM to narrate. Cheaper, faster, more predictable.

▸ Sample-data buttons are non-negotiable. Every project ships pre-computed
sample outputs so a reviewer can see the finished shape without Ollama
running. This is the single biggest UX unlock for a portfolio.

▸ Fallbacks matter. Insights, explanations, and summaries all have
deterministic backup paths so a slow or offline LLM doesn't break the
pipeline mid-run.

▸ Disclaimers as first-class UI. Legal briefs, clinical notes, compliance
reports, and simulated news each have banners at the top AND bottom
warning what is illustrative. If you're going to fake data, be loud about
it.

▸ Multi-agent isn't magic. My Planner→Researcher→Writer→Reviewer setup
worked well because each agent had one specific job and a strict schema.
The moment I tried to have one agent "do everything," quality dropped.

Total: ~15,000 lines of TypeScript. Every project type-checks strict and
production-builds clean.

Which one should I turn into a longer teardown?

#AI #NextJS #TypeScript #Ollama #LocalLLM #SoftwareEngineering #Portfolio
