# Gemma 4 Good Hackathon — Grand-Master Project Blueprint

> **Competition**: The Gemma 4 Good Hackathon (Kaggle × Google DeepMind)
> **Prize Pool**: $200,000 USD | **Track**: Health & Sciences + Digital Equity
> **Submission Deadline**: May 18 2026 (closed) — *blueprint remains fully executable as a portfolio/open-source project*

---

## 0 · Competition Intel Summary

### What the judges actually want

| Criterion | Weight Signal | What "great" looks like |
|---|---|---|
| **Impact & Vision** | Highest | A single, named user persona whose life measurably improves |
| **Video Pitch & Storytelling** | High | 3-min arc: pain → demo → outcome. No slides-only. |
| **Technical Depth & Execution** | High | Gemma 4 is *load-bearing*, not decorative. Show function calling, multimodal, or fine-tuning. |
| **Reproducibility** | Medium | Public repo, one-command setup, documented architecture |

### What loses

- Generic chatbots ("AI study buddy," "AI doctor," "climate awareness app")
- Mocked UIs with no real model inference
- Cloud-only solutions that ignore the offline/low-bandwidth thesis
- Treating Gemma 4 as an interchangeable backend behind a wrapper

### The meta-insight

The competition's DNA is: **"What becomes possible when strong AI runs locally, privately, and in context?"** Every winning project must answer that question with a *working prototype*, not a pitch deck.

---

## 1 · The Winning Project: **"SvasthyaSathi"** (स्वास्थ्यसाथी)

### One-liner

An **offline-first, multilingual clinical intake & triage assistant** for Primary Health Centres (PHCs) in rural India that runs entirely on a tablet — no cloud, no connectivity required.

### Why this wins

| Dimension | Strength |
|---|---|
| **Impact** | India has ~160,000 PHCs, most staffed by a single doctor seeing 80-120 patients/day. A 3-minute structured intake saves ~40 min/day and catches missed symptoms. |
| **Gemma 4 fit** | Uses multimodal (photo of prescription/wound), function calling (structured triage protocol), edge deployment (26B MoE quantized to 4-bit runs on a ₹25K Android tablet with 8 GB RAM). |
| **Differentiation** | Not "AI doctor." It's a *clinical workflow accelerator* that outputs structured SOAP notes for the human doctor. The doctor remains in the loop. |
| **Offline-first** | Zero internet dependency. Syncs when connectivity returns. |
| **Narrative** | Deeply relatable: a nurse at a PHC in Jharkhand opens the app, speaks in Hindi, photographs a skin lesion, and gets a structured intake form ready before the doctor walks in. |

---

## 2 · Architecture (The Technical Spine)

```
┌──────────────────────────────────────────────────────────┐
│                    TABLET (Android)                      │
│                                                          │
│  ┌─────────────┐   ┌──────────────────────────────────┐  │
│  │  Flutter UI  │──▶│  Local Inference Engine           │  │
│  │  (Dart)      │   │  ┌────────────────────────────┐  │  │
│  │              │   │  │ Gemma 4 26B-A4B (Q4_K_M)   │  │  │
│  │ • Voice in   │   │  │ via llama.cpp / MediaPipe   │  │  │
│  │ • Camera     │   │  │                            │  │  │
│  │ • Form view  │   │  │ Active params: ~4B         │  │  │
│  │ • SOAP out   │   │  │ VRAM: ~6 GB                │  │  │
│  └──────┬───────┘   │  └────────────────────────────┘  │  │
│         │           │                                    │  │
│         │           │  ┌────────────────────────────┐  │  │
│         │           │  │ Function-Calling Router     │  │  │
│         │           │  │ • triage_classify()         │  │  │
│         │           │  │ • symptom_extract()         │  │  │
│         │           │  │ • drug_interaction_check()  │  │  │
│         │           │  │ • soap_note_generate()      │  │  │
│         │           │  │ • image_describe()          │  │  │
│         │           │  └────────────────────────────┘  │  │
│         │           └──────────────────────────────────┘  │
│         │                                                │
│  ┌──────▼───────┐   ┌──────────────────────────────────┐  │
│  │ Local SQLite  │   │  Whisper-tiny (voice → text)    │  │
│  │ + Vector DB   │   │  + IndicTrans (multilingual)    │  │
│  │ (patient log) │   └──────────────────────────────────┘  │
│  └──────────────┘                                        │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Sync Module: When WiFi available → push to           ││
│  │ district HMIS server (FHIR-compatible JSON)          ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

### Model Selection Rationale

| Model | Role | Why |
|---|---|---|
| **Gemma 4 26B-A4B-it (Q4_K_M)** | Core reasoning, triage, SOAP generation | MoE activates only 4B params → fast on consumer hardware. 256K context handles long patient histories. Native function calling = structured outputs without fragile parsing. |
| **Gemma 4 E4B** | Fallback for ultra-low-end tablets | 4B effective params, fits in 3 GB. Quality drop is acceptable for intake-only mode. |
| **Whisper-tiny.en + IndicTrans2** | Voice pipeline | Nurse speaks Hindi/Odia → STT → translate → Gemma processes in English → response translated back. Runs locally. |

---

## 3 · The Five Function-Calling Tools (Gemma 4's Killer Feature)

This is where the project demonstrates *why Gemma 4 specifically* and not any generic LLM.

### Tool Definitions (passed to Gemma 4's native function calling)

```python
tools = [
    {
        "name": "symptom_extract",
        "description": "Extract structured symptoms from free-text patient complaint",
        "parameters": {
            "type": "object",
            "properties": {
                "chief_complaint": {"type": "string"},
                "duration_days": {"type": "integer"},
                "severity": {"type": "string", "enum": ["mild", "moderate", "severe"]},
                "associated_symptoms": {"type": "array", "items": {"type": "string"}},
                "vital_signs": {
                    "type": "object",
                    "properties": {
                        "temperature_f": {"type": "number"},
                        "bp_systolic": {"type": "integer"},
                        "bp_diastolic": {"type": "integer"},
                        "pulse": {"type": "integer"}
                    }
                }
            },
            "required": ["chief_complaint", "severity"]
        }
    },
    {
        "name": "triage_classify",
        "description": "Classify patient into triage category using ICPC-2 codes",
        "parameters": {
            "type": "object",
            "properties": {
                "triage_level": {"type": "string", "enum": ["green", "yellow", "orange", "red"]},
                "icpc2_code": {"type": "string"},
                "reasoning": {"type": "string"},
                "referral_needed": {"type": "boolean"},
                "referral_specialty": {"type": "string"}
            },
            "required": ["triage_level", "icpc2_code", "reasoning"]
        }
    },
    {
        "name": "drug_interaction_check",
        "description": "Check interactions between patient's current medications and proposed treatment",
        "parameters": {
            "type": "object",
            "properties": {
                "current_medications": {"type": "array", "items": {"type": "string"}},
                "proposed_medication": {"type": "string"},
                "interactions_found": {"type": "array", "items": {
                    "type": "object",
                    "properties": {
                        "drug_pair": {"type": "string"},
                        "severity": {"type": "string"},
                        "recommendation": {"type": "string"}
                    }
                }}
            }
        }
    },
    {
        "name": "soap_note_generate",
        "description": "Generate a structured SOAP note from the clinical encounter",
        "parameters": {
            "type": "object",
            "properties": {
                "subjective": {"type": "string"},
                "objective": {"type": "string"},
                "assessment": {"type": "string"},
                "plan": {"type": "string"},
                "follow_up_days": {"type": "integer"}
            },
            "required": ["subjective", "objective", "assessment", "plan"]
        }
    },
    {
        "name": "image_describe",
        "description": "Describe clinical features visible in a patient photograph (wound, rash, eye, etc.)",
        "parameters": {
            "type": "object",
            "properties": {
                "body_region": {"type": "string"},
                "observed_features": {"type": "array", "items": {"type": "string"}},
                "suggested_differentials": {"type": "array", "items": {"type": "string"}},
                "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
                "disclaimer": {"type": "string", "default": "Visual description only. Not a diagnosis."}
            }
        }
    }
]
```

### Why this matters for judging

The judges see: Gemma 4 isn't just generating text — it's **routing through a clinical protocol** using native function calling, outputting structured JSON that feeds directly into the UI and the patient record. That's a real agentic workflow, not a chatbot wrapper.

---

## 4 · Implementation Roadmap (14-Day Sprint)

### Week 1: Core Engine

| Day | Deliverable | Detail |
|---|---|---|
| 1 | Environment setup | Kaggle notebook with Gemma 4 26B-A4B loaded via `transformers` + `bitsandbytes` 4-bit quant. Validate function calling works. |
| 2 | Tool definitions + routing | Implement all 5 tools. Build the system prompt that instructs Gemma when to call which tool. Test with 20 synthetic patient cases. |
| 3 | Multimodal pipeline | Test image input (skin lesion photos from ISIC dataset, wound photos from open datasets). Validate `image_describe` tool produces structured output. |
| 4 | Voice pipeline | Integrate Whisper-tiny for STT. Add IndicTrans2 for Hindi/Odia → English and back. Test end-to-end: spoken Hindi complaint → structured symptom extraction. |
| 5 | Local database | SQLite schema for patient encounters. Vector store (ChromaDB embedded) for similar-case retrieval from past visits. |
| 6 | SOAP note generation | End-to-end: complaint → triage → SOAP note. Evaluate against 50 gold-standard SOAP notes (written by a doctor). Measure ROUGE-L and clinical accuracy. |
| 7 | Edge deployment test | Export quantized model via llama.cpp GGUF format. Run on Android tablet emulator. Benchmark: latency per query, memory footprint, battery drain/hour. |

### Week 2: Polish + Submission Package

| Day | Deliverable | Detail |
|---|---|---|
| 8 | Flutter UI | Clean, high-contrast UI optimized for outdoor/bright-light use. Large buttons. Voice-first interaction pattern. |
| 9 | Safety layer | Implement confidence thresholds. If triage = red → hard-coded alert: "Refer immediately. Do not wait." Add disclaimer on every screen. Hallucination guard: cross-check drug interactions against a local SQLite copy of the WHO Essential Medicines List. |
| 10 | Evaluation suite | Build a 100-case benchmark: 50 common conditions + 30 edge cases + 20 emergency scenarios. Measure triage accuracy, SOAP quality, latency. Publish results table. |
| 11 | Video script + recording | 3-minute video: (1) Problem — show a crowded PHC waiting room, (2) Demo — real device recording of the full workflow, (3) Impact — projected time savings with data. |
| 12 | Technical writeup | Architecture diagram, model card, benchmark results, failure modes, ethical considerations, future roadmap. |
| 13 | Public GitHub repo | Clean README, one-command Docker setup, MIT license, documented API, example notebooks. |
| 14 | Final submission | Kaggle writeup, video upload, repo link, demo link, cover image, media gallery. |

---

## 5 · The Evaluation Benchmark (What Separates GM-Level from Average)

Most submissions will skip rigorous evaluation. A grandmaster-level project *quantifies* its claims.

### Benchmark: SvasthyaSathi-Eval-100

```
100 synthetic clinical vignettes:
├── 50 common presentations (fever, cough, diarrhea, ANC visit, diabetes follow-up)
├── 30 edge cases (atypical MI in women, pediatric dehydration, TB-HIV co-infection)
└── 20 emergencies (eclampsia, snake bite, acute abdomen, anaphylaxis)

Metrics:
├── Triage Accuracy: % cases assigned correct triage level vs. physician gold standard
├── Symptom F1: precision/recall of extracted symptoms vs. annotated ground truth
├── SOAP Quality: ROUGE-L + physician blind rating (1-5 scale) on 20 random notes
├── Referral Sensitivity: % of true emergencies correctly flagged for referral (target: >95%)
├── Latency: p50 and p95 inference time per encounter on target hardware
├── Safety: 0 false negatives on red-triage cases (hard constraint)
└── Multilingual: Symptom extraction accuracy in Hindi vs. English (delta <5%)
```

### Expected Results Table (for writeup)

| Metric | Target | Rationale |
|---|---|---|
| Triage accuracy | ≥85% | Comparable to nurse triage in literature |
| Symptom F1 | ≥0.80 | Clinically useful threshold |
| Referral sensitivity | ≥95% | Safety-critical — must not miss emergencies |
| SOAP physician rating | ≥3.5/5 | "Would use as a starting draft" |
| p50 latency (26B Q4) | <8 sec | Acceptable for intake workflow |
| Hindi vs English delta | <5% | Proves multilingual viability |

---

## 6 · Technical Deep Dives (Differentiators)

### 6A · Quantization Strategy

```bash
# Convert HF model to GGUF for edge deployment
python convert_hf_to_gguf.py \
    google/gemma-4-26B-A4B-it \
    --outtype q4_k_m \
    --outfile gemma4-26b-a4b-q4km.gguf

# Expected file size: ~15 GB
# Active memory during inference: ~6 GB (only 4B params active)
# Compatible with: llama.cpp, Ollama, MediaPipe LLM Inference API
```

Why Q4_K_M: It's the sweet spot between quality and size for the MoE architecture. Since only 4B params are active per token, quantization artifacts are distributed across 128 experts — each expert's quality degradation is minimal.

### 6B · System Prompt Engineering

```
You are SvasthyaSathi, a clinical intake assistant deployed at a Primary Health
Centre. You help nurses conduct structured patient intake.

RULES:
1. You are NOT a doctor. You NEVER diagnose. You structure information for the doctor.
2. For every patient interaction, you MUST call symptom_extract first, then triage_classify.
3. If triage_level is "red", immediately output: "⚠️ EMERGENCY: Refer to higher centre immediately."
4. When a photo is provided, call image_describe. Always include the disclaimer.
5. After intake is complete, call soap_note_generate to create the clinical note.
6. If the patient mentions current medications, call drug_interaction_check before the doctor prescribes.
7. Respond in the same language the nurse uses.
8. Keep responses under 100 words unless generating a SOAP note.
9. If uncertain, say "I'm not sure — please confirm with the doctor."
```

### 6C · Retrieval-Augmented Safety Net

Embed the WHO Essential Medicines List + Indian National List of Essential Medicines (NLEM) + ICPC-2 classification into a local ChromaDB instance (~50 MB). When `drug_interaction_check` is called, cross-reference against this local knowledge base — no hallucinated interactions.

### 6D · Offline Sync Protocol

```
Patient encounter → SQLite (local)
                  → FHIR R4 JSON bundle (queued)
                  → When WiFi detected: POST to district HMIS
                  → Conflict resolution: last-write-wins with audit log
                  → All PHI encrypted at rest (AES-256)
```

---

## 7 · The Video (3-Minute Structure)

The video is *judging-weighted*. Most people underinvest here.

| Timestamp | Content | Visual |
|---|---|---|
| 0:00–0:30 | **The pain**: "In rural India, one doctor sees 100+ patients a day. There's no time for structured notes, no system to catch drug interactions, no way to triage effectively." | B-roll of crowded PHC (stock or original) |
| 0:30–0:45 | **The thesis**: "What if a ₹25,000 tablet could give every PHC the intake workflow of a well-staffed hospital — with no internet required?" | SvasthyaSathi logo reveal |
| 0:45–2:15 | **The demo**: Live screen recording of the full flow: nurse speaks in Hindi → symptoms extracted → photo of skin lesion analyzed → triage assigned → SOAP note generated → patient record saved. | Split-screen: tablet + terminal showing Gemma 4 inference logs |
| 2:15–2:45 | **The numbers**: Benchmark results table. "85% triage accuracy. 95%+ emergency sensitivity. Under 8 seconds per query. Runs offline." | Clean data visualization |
| 2:45–3:00 | **The future**: "Open-sourced under Apache 2.0. Adaptable to any PHC in any country. Built with Gemma 4." | GitHub repo QR code |

---

## 8 · Repository Structure

```
svasthya-sathi/
├── README.md                          # Project overview, setup, demo GIF
├── LICENSE                            # Apache 2.0
├── docker-compose.yml                 # One-command local setup
├── Makefile                           # make setup / make run / make eval / make demo
│
├── docs/
│   ├── ARCHITECTURE.md                # Full system design with diagrams
│   ├── MODEL_CARD.md                  # Gemma 4 usage, quantization, benchmarks
│   ├── ETHICS.md                      # Limitations, risks, safeguards
│   └── EVALUATION_REPORT.md           # Full benchmark results
│
├── src/
│   ├── inference/
│   │   ├── gemma_engine.py            # Model loading, generation, function-call parsing
│   │   ├── tool_definitions.py        # All 5 tools as Python dataclasses
│   │   ├── tool_executor.py           # Dispatch function calls to handlers
│   │   └── prompts.py                 # System prompt, few-shot examples
│   │
│   ├── voice/
│   │   ├── stt.py                     # Whisper-tiny wrapper
│   │   └── translate.py               # IndicTrans2 Hindi/Odia ↔ English
│   │
│   ├── multimodal/
│   │   └── image_pipeline.py          # Photo preprocessing + Gemma 4 vision input
│   │
│   ├── knowledge/
│   │   ├── build_vectordb.py          # Index WHO EML + NLEM + ICPC-2
│   │   └── retriever.py              # ChromaDB query wrapper
│   │
│   ├── storage/
│   │   ├── models.py                  # SQLAlchemy models for patient encounters
│   │   ├── sync.py                    # Offline queue + FHIR export
│   │   └── encryption.py             # AES-256 at-rest encryption
│   │
│   └── app/
│       ├── main.py                    # FastAPI backend (or Flutter bridge)
│       └── ui/                        # Flutter UI source (if mobile)
│
├── eval/
│   ├── vignettes/                     # 100 clinical vignettes (JSON)
│   ├── gold_standard/                 # Physician-annotated ground truth
│   ├── run_eval.py                    # Automated evaluation script
│   └── results/                       # Generated benchmark tables + plots
│
├── notebooks/
│   ├── 01_model_exploration.ipynb     # Gemma 4 capabilities walkthrough
│   ├── 02_function_calling_demo.ipynb # Native tool use demonstration
│   ├── 03_multimodal_clinical.ipynb   # Image analysis pipeline
│   ├── 04_quantization_benchmark.ipynb# Q4 vs Q8 vs FP16 comparison
│   └── 05_full_pipeline_demo.ipynb    # End-to-end intake workflow
│
├── data/
│   ├── who_eml.json                   # WHO Essential Medicines List
│   ├── nlem_india.json                # National List of Essential Medicines
│   ├── icpc2_codes.json               # ICPC-2 classification
│   └── sample_images/                 # Example clinical photos (open-license)
│
├── video/
│   ├── script.md                      # Video narration script
│   └── assets/                        # Thumbnails, overlays
│
├── requirements.txt
└── pyproject.toml
```

---

## 9 · Kaggle Writeup Structure

The writeup is a first-class deliverable. Structure it as a narrative, not a README.

### Section 1: The Problem (200 words)
One specific scenario. One nurse. One PHC. Numbers: patients/day, time per patient, error rates. Make the reader feel the bottleneck.

### Section 2: The Solution (300 words)
What SvasthyaSathi does in one paragraph. Then: how it uses Gemma 4 (function calling, multimodal, edge deployment). Architecture diagram.

### Section 3: Why Gemma 4 (200 words)
Not "because the hackathon requires it." Instead: MoE architecture enables 4B active params on a tablet. Native function calling eliminates fragile output parsing. Multimodal input handles clinical photos without a separate vision model. 256K context handles longitudinal patient records.

### Section 4: Technical Depth (400 words)
Quantization strategy. Tool definitions. Voice pipeline. Safety layers. Offline sync. This is where you prove engineering competence.

### Section 5: Results (200 words)
Benchmark table. Latency numbers. Failure analysis (what went wrong, what you'd improve).

### Section 6: Impact & Future (150 words)
Projected time savings. Scalability to 160K PHCs. Open-source roadmap. Partnership opportunities with NHA (National Health Authority).

---

## 10 · Common Pitfalls & How to Avoid Them

| Pitfall | Why it kills your submission | Countermeasure |
|---|---|---|
| "AI Doctor" framing | Judges see liability risk, lack of nuance | Frame as *workflow accelerator*. Doctor always in the loop. |
| Cloud-dependent architecture | Contradicts the competition's core thesis | Entire inference stack runs on-device. Cloud is optional sync. |
| No real evaluation | Claims without evidence are ignored | Publish the 100-case benchmark with physician gold standard. |
| Generic chatbot UI | Screams "weekend project" | Purpose-built clinical interface. Large buttons, high contrast, voice-first. |
| Using Gemma 4 as a black box | Doesn't demonstrate technical depth | Show function calling, quantization choices, multimodal pipeline, prompt engineering. |
| Ignoring safety | Healthcare + AI + no safety = instant disqualification | Confidence thresholds, hard-coded emergency alerts, disclaimers, no diagnosis claims. |
| Bad video | Judges watch hundreds; boring = skip | Professional pacing. Real demo, not slides. Show the device, show the output. |

---

## 11 · Alternative Project Ideas (If Health Isn't Your Domain)

Each follows the same blueprint structure: specific user, specific workflow, Gemma 4 as load-bearing.

### Education Track: "PathShala" — Offline Adaptive Worksheet Generator
A teacher at a rural school photographs a textbook page → Gemma 4 (multimodal) reads it → generates 3 difficulty levels of worksheets in the local language → prints via Bluetooth thermal printer. No internet. Function calling routes to `generate_mcq()`, `generate_fill_blank()`, `generate_short_answer()`, `translate_worksheet()`.

### Global Resilience Track: "RahatMap" — Offline Disaster Coordination Tool
After a flood, relief workers use a tablet to photograph damage → Gemma 4 classifies severity and generates structured FEMA-style damage reports → queues for upload when connectivity returns. Function calling: `classify_damage()`, `estimate_needs()`, `generate_report()`, `prioritize_areas()`.

### Digital Equity Track: "DastawezSahay" — Government Form Assistant
Citizens photograph a government form they don't understand → Gemma 4 explains each field in simple Hindi/regional language → guides them through filling it out step by step. Function calling: `identify_form()`, `explain_field()`, `validate_entry()`, `summarize_submission()`.

### Safety Track: "VishwasMeter" — Grounded Answer Verification
A local-first fact-checking tool: paste or speak a health claim → Gemma 4 searches a local knowledge base (WHO, ICMR guidelines) → returns a confidence-scored verdict with source citations. Function calling: `parse_claim()`, `retrieve_evidence()`, `score_confidence()`, `generate_verdict()`.

---

## 12 · Tech Stack Summary

| Layer | Technology | Why |
|---|---|---|
| Core LLM | Gemma 4 26B-A4B-it (Q4_K_M GGUF) | Best intelligence-per-watt for edge. MoE = fast. |
| Fallback LLM | Gemma 4 E4B-it | Ultra-low-end hardware support |
| Inference runtime | llama.cpp / MediaPipe LLM Inference | Cross-platform, optimized for ARM |
| Voice STT | Whisper-tiny | 39M params, runs on anything |
| Translation | IndicTrans2 | Best open Indic language model |
| Vector DB | ChromaDB (embedded mode) | No server needed, SQLite backend |
| App storage | SQLite + SQLCipher | Encrypted at rest |
| Backend API | FastAPI | Lightweight, async, easy to demo |
| Mobile UI | Flutter | Cross-platform, single codebase |
| Containerization | Docker | One-command reproducibility |
| Evaluation | pytest + custom harness | Automated benchmark suite |

---

## 13 · Quick-Start Commands

```bash
# Clone and setup
git clone https://github.com/yourname/svasthya-sathi.git
cd svasthya-sathi
make setup           # installs deps, downloads model, builds vector DB

# Run the demo
make demo            # starts FastAPI + opens browser UI

# Run evaluation
make eval            # runs 100-case benchmark, outputs results/report.md

# Run on Kaggle
# Upload notebook 05_full_pipeline_demo.ipynb → attach Gemma 4 26B model → run all
```

---

## 14 · Final Checklist (Submission Package)

- [ ] Kaggle writeup published (narrative structure, not bullet points)
- [ ] 3-minute video uploaded (real demo, not slides)
- [ ] Public GitHub repository (clean README, one-command setup)
- [ ] Live demo or demo recording (full workflow captured)
- [ ] Cover image + media gallery (screenshots, architecture diagram)
- [ ] Benchmark results table in writeup
- [ ] Model card with ethical considerations
- [ ] Apache 2.0 license
- [ ] Identity verification completed on Kaggle
- [ ] All linked assets are public (not private repos, not unlisted videos)

---