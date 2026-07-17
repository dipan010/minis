# AI Tax Form Extractor

Upload a tax form as an **image or PDF** — a US **W-2**, **1099-NEC**,
**1099-INT**, or an Indian **Form 16** — and get every structured field
extracted into an **editable form**, each with a per-field confidence score.
Inspired by Intuit TurboTax's document import.

Images are OCR'd by a local **llava:13b** vision model; the recovered text is
then classified and field-extracted by **llama3.1:8b** using JSON
schema–constrained output. Everything runs on your machine via Ollama — no
document ever leaves your network.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 |
| Vision OCR | Ollama — `llava:13b` |
| Classification & extraction | Ollama — `llama3.1:8b` |
| Image preprocessing | `sharp` (resize, flatten, normalize) |
| PDF text extraction | `pdf-parse@1.1.1` |

---

## Prerequisites

- **Node.js 18.18+**
- **Ollama** running locally (`ollama serve`)
- Both models pulled:
  ```bash
  ollama pull llama3.1:8b
  ollama pull llava:13b   # ~8 GB — only needed for image uploads
  ```

PDFs and the three sample buttons work with just `llama3.1:8b` (samples need
no Ollama at all).

---

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

1. **Drag-and-drop** (or click to browse) a tax form image or PDF into the
   upload zone on the left.
2. Or click **Sample W-2 / Sample 1099 / Sample Form 16** to load a
   pre-filled synthetic extraction instantly — no Ollama required. A
   placeholder "scan" preview renders below the buttons.
3. The right panel shows the **detected form type**, any **warnings**, and
   all extracted fields grouped into sections (Employer/Payer Info,
   Employee/Recipient Info, Income, Taxes).
4. Every field is **editable**. A confidence meter + badge sits beside each
   value: **green > 80**, **amber 50–80**, **red < 50**. Sub-50 fields get a
   red highlight and a "needs manual review" note.
5. **Raw text** toggles the underlying OCR/PDF text; hover a field input to
   see its original OCR value.
6. **Export as JSON** downloads the structured data with confidences and
   warnings.

---

## Architecture

### `lib/types.ts`
The domain model. `TaxFormType` is the four supported forms;
`ExtractedField` carries `fieldName`, `value`, `confidence` (0–100) and an
optional `bbox`; `ExtractionResult` is what the API returns (`formType`,
`fields`, `rawText`, `warnings`). `FORM_SCHEMAS` is the single source of
truth for what fields each form type has — each `FieldSpec` has a stable
`key`, a display `label`, and a UI `category`. The extraction JSON schema,
the editable form layout, and the section grouping are all derived from it.

### `lib/extraction.ts`
The whole LLM pipeline. `ollamaGenerate()` is the low-level call with an
`AbortController` timeout on every request (5 min for vision OCR, which is
the slowest step on CPU) and descriptive errors for Ollama-down and
model-not-pulled cases. `extractFromImage()` sends the base64 image to
`llava:13b` with a strict "you are an OCR engine, output only transcribed
text" prompt. `extractFromPDF()` uses `pdf-parse`. `classifyFormType()` asks
`llama3.1:8b` to pick one of the four form types via an enum-constrained
schema. `extractFields()` builds a JSON schema *dynamically* from
`FORM_SCHEMAS[formType]` — every expected field key becomes a required
`{ value, confidence }` object — so the model cannot omit or rename fields.
`runExtractionPipeline()` chains classify → extract and synthesizes
warnings (thin text, missing fields, low-confidence fields).

### `lib/sampleData.ts`
Three synthetic sample forms (`W2`, `1099_NEC`, `FORM_16`) with pre-filled
`ExtractionResult`s so the demo works without Ollama. Confidence values are
deliberately varied to exercise all three badge colors and the manual-review
highlight (e.g. the W-2 EIN is 43% because the fake raw text contains an OCR
artifact). `SAMPLE_IMAGES` are placeholder text-on-white "scans" built as
inline SVG data URIs.

### `app/api/extract/route.ts`
POST handler accepting `FormData` with a `file`. Pipeline: validate type and
size (15 MB cap) → images are preprocessed with `sharp` (max width 1200,
transparency flattened onto white, contrast normalized, PNG) and OCR'd with
llava; PDFs go through `pdf-parse` → `runExtractionPipeline()` → the
`ExtractionResult` as JSON. Scanned PDFs that yield no text get a 422 with a
hint to upload as an image instead.

### `app/page.tsx`
Split layout: left = drag-and-drop upload zone, sample buttons, and document
preview; right = results. Sample buttons load client-side deep copies of the
sample results instantly. Field edits update local state only; export builds
the JSON download from the current (edited) values.

### `components/FieldRow.tsx`
One field: label, editable mono-font input (original OCR value in a hover
tooltip), `ConfidenceMeter`, and a colored badge. Confidence < 50 adds a red
left border, tinted background, and "needs manual review".

### `components/ConfidenceMeter.tsx`
Small horizontal bar + percentage, colored by threshold. Exports
`confidenceColor`/`confidenceLabel` so the badge and row share one set of
thresholds.

---

## Caveats

- **Not for actual tax filing.** This is a portfolio demonstration. Values,
  confidence scores, and form classification are all LLM output and can be
  wrong. Verify against the source document.
- **llava accuracy varies a lot** with scan quality, rotation, and dense
  small print. Real tax forms are hard OCR targets for a local 13B vision
  model; expect missing boxes on cluttered scans.
- **Confidence scores are estimates** the model assigns to itself — they are
  calibrated by prompt instructions, not statistics.
- **Scanned (image-only) PDFs** yield no text via `pdf-parse`. Export the
  page as PNG/JPG and upload that so it goes through the vision path.
- **Vision OCR is slow on CPU** — llava:13b can take several minutes per
  image. The API times out at 5 minutes.
- **pdf-parse import path:** imported as `pdf-parse/lib/pdf-parse.js` to skip
  the package root's debug self-test, which breaks in Next.js server builds.
- All sample data is fictional; no real names, employers, or tax IDs.
