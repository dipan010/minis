# Clinical Note Scribe

Paste a doctor-patient conversation transcript → get a structured **SOAP
note** (Subjective, Objective, Assessment, Plan) with ICD-10 code
suggestions, quality flags for missing information, and follow-up details.
Inspired by Tali.ai and Kyoto University Hospital's AI scribe.

> ## ⚕️ Disclaimers — read first
>
> - This is a **portfolio demonstration project, NOT a medical device.**
> - **Not validated for clinical use.** Output must be reviewed and approved
>   by a licensed clinician before any use in medical records.
> - **ICD-10 suggestions are AI-generated and may be incorrect.**
> - All sample transcripts are **fictional**; no real patients exist here.
> - **Do not enter real patient data.** The app does not comply with HIPAA —
>   there is no encryption at rest, no access control, and no audit trail.

**Note:** this project does **not** do audio transcription (no
Whisper/speech-to-text). Input is a text transcript; audio would be a
future enhancement.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 (clean clinical theme, system fonts) |
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

1. Load one of four samples — **Routine Check-up**, **Acute Complaint**
   (chest pain, differential-heavy), **Chronic Management** (diabetes
   follow-up with patient context), **Pediatric Visit** (parent-reported,
   complex subjective) — or paste your own fictional transcript.
2. Optionally expand **Patient context** to add age, sex, known conditions,
   and current medications (tag inputs).
3. **Generate SOAP Note** (single LLM call, up to 2 minutes on CPU).
4. Review the note: four color-coded sections (S blue, O green, A amber,
   P purple), an amber **quality flags** banner when information is missing
   or ambiguous, and a summary card with word counts. **Copy to Clipboard**
   or **Export as Markdown**.

---

## Architecture

### `lib/types.ts`
The full `SOAPNote` shape (chief complaint, HPI, ROS, symptoms; vitals,
exam findings, labs; primary/differential diagnoses, ICD-10 suggestions
with confidence, reasoning; treatment, medications, follow-up, referrals,
education), plus `QualityFlag` and the `ScribeResult` envelope with word
counts.

### `lib/soapGenerator.ts`
One comprehensive Ollama call. The system prompt casts the model as an
experienced medical scribe with strict extraction rules: **only what the
transcript states** — empty arrays are the correct output for undiscussed
categories, and invented vitals/doses are explicitly forbidden. The JSON
schema mirrors `SOAPNote` exactly and adds `generation_flags` (the model's
own gap-spotting) and a summary. Post-processing then adds deterministic
flags the model may miss (no vitals, no exam findings, no follow-up
timeframe) and computes transcript/note word counts. Temperature 0.1.

### `lib/sampleTranscripts.ts`
Four fictional dialogues (~300–500 words each); samples 3 and 4 include
`patient_context`.

### `app/api/scribe/route.ts`
POST `TranscriptInput` → `ScribeResult`, 2-minute generation timeout.

### Components
- **`SOAPSection.tsx`** — colored left-border section with the S/O/A/P
  letter block.
- **`ICD10Table.tsx`** — code table with per-code confidence bars
  (green ≥75, amber ≥50, red below).
- **`MedicationTable.tsx`** — name/dosage/frequency/duration table.
- **`QualityFlag.tsx`** — expandable amber banner (red if any flag is
  `critical`) listing typed flags with their section.

---

## Caveats

- An 8B local model **will make clinical errors** — wrong differentials,
  wrong or outdated ICD-10 codes, missed red flags. That is precisely why
  every screen carries the review-required disclaimer.
- Extraction fidelity depends on transcript quality; heavily colloquial
  dialogue degrades the Objective section most.
- Word counts are approximate (whitespace tokenization).
- Portfolio demonstration only.
