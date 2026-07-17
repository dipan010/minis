import type { ExtractedField, ExtractionResult, TaxFormType } from "./types";
import { FORM_SCHEMAS } from "./types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

export const DEFAULT_OLLAMA_URL = "http://localhost:11434";
export const VISION_MODEL = "llava:13b";
export const TEXT_MODEL = "llama3.1:8b";

interface OllamaGenerateOptions {
  ollamaUrl?: string;
  model: string;
  prompt: string;
  images?: string[]; // base64 (no data: prefix)
  format?: object;
  temperature?: number;
  timeoutMs?: number;
}

/** Low-level call to Ollama's /api/generate with an AbortController timeout —
 * vision models can take minutes on CPU, so every call is bounded. */
async function ollamaGenerate(opts: OllamaGenerateOptions): Promise<string> {
  const ollamaUrl = opts.ollamaUrl ?? DEFAULT_OLLAMA_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120_000);

  let response: Response;
  try {
    response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: opts.model,
        prompt: opts.prompt,
        images: opts.images,
        stream: false,
        format: opts.format,
        options: { temperature: opts.temperature ?? 0.1 },
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `Ollama call to ${opts.model} timed out after ${(opts.timeoutMs ?? 120_000) / 1000}s. Vision models are slow on CPU — try a smaller image or a machine with a GPU.`
      );
    }
    if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
      throw new Error(
        `Could not reach Ollama at ${ollamaUrl}. Make sure Ollama is running (hint: run \`ollama serve\`).`
      );
    }
    throw new Error(`Network error contacting Ollama: ${message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    if (response.status === 404 && body.includes("not found")) {
      throw new Error(
        `Model "${opts.model}" is not available in Ollama. Pull it first: ollama pull ${opts.model}`
      );
    }
    throw new Error(`Ollama returned HTTP ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.response as string;
}

/** OCR an image with the llava vision model and return the raw transcribed text. */
export async function extractFromImage(
  base64: string,
  options?: { ollamaUrl?: string; visionModel?: string }
): Promise<string> {
  return ollamaGenerate({
    ollamaUrl: options?.ollamaUrl,
    model: options?.visionModel ?? VISION_MODEL,
    prompt:
      "You are an OCR engine. Transcribe ALL text visible in this tax form image, preserving the layout as best you can with line breaks. Include every label, box number, name, ID number, and dollar/rupee amount exactly as printed. Do not summarize, do not explain — output only the transcribed text.",
    images: [base64],
    temperature: 0,
    timeoutMs: 300_000, // vision OCR is the slowest step
  });
}

/** Extract text from a PDF buffer via pdf-parse. */
export async function extractFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text as string;
}

const CLASSIFY_SCHEMA = {
  type: "object",
  properties: {
    form_type: { type: "string", enum: ["W2", "1099_NEC", "1099_INT", "FORM_16"] },
    reasoning: { type: "string" },
  },
  required: ["form_type", "reasoning"],
};

/** Identify which supported tax form the text came from. */
export async function classifyFormType(
  text: string,
  options?: { ollamaUrl?: string; textModel?: string }
): Promise<TaxFormType> {
  const response = await ollamaGenerate({
    ollamaUrl: options?.ollamaUrl,
    model: options?.textModel ?? TEXT_MODEL,
    prompt: `Classify which tax form the following OCR/PDF text was extracted from.

Options:
- "W2": US Form W-2 Wage and Tax Statement (employer/employee, wages, federal income tax withheld, boxes 1-20)
- "1099_NEC": US Form 1099-NEC Nonemployee Compensation (payer/recipient, box 1 nonemployee compensation)
- "1099_INT": US Form 1099-INT Interest Income (payer, box 1 interest income, box 8 tax-exempt interest)
- "FORM_16": India Form 16 Certificate under section 203 of the Income-tax Act (TAN, PAN, gross salary, TDS)

TEXT:
"""
${text.slice(0, 6000)}
"""`,
    format: CLASSIFY_SCHEMA,
    timeoutMs: 90_000,
  });

  const parsed = JSON.parse(response) as { form_type: TaxFormType };
  if (!FORM_SCHEMAS[parsed.form_type]) {
    throw new Error(`Classifier returned unknown form type: ${parsed.form_type}`);
  }
  return parsed.form_type;
}

/** Build the per-form-type extraction JSON schema: every expected field key
 * maps to { value, confidence }. */
function buildExtractionSchema(formType: TaxFormType): object {
  const properties: Record<string, object> = {};
  for (const spec of FORM_SCHEMAS[formType]) {
    properties[spec.key] = {
      type: "object",
      properties: {
        value: { type: "string" },
        confidence: { type: "integer", minimum: 0, maximum: 100 },
      },
      required: ["value", "confidence"],
    };
  }
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
  };
}

/** Extract all expected fields for a form type with per-field confidence. */
export async function extractFields(
  text: string,
  formType: TaxFormType,
  options?: { ollamaUrl?: string; textModel?: string }
): Promise<ExtractedField[]> {
  const specs = FORM_SCHEMAS[formType];
  const fieldList = specs.map((s) => `- ${s.key}: ${s.label}`).join("\n");

  const response = await ollamaGenerate({
    ollamaUrl: options?.ollamaUrl,
    model: options?.textModel ?? TEXT_MODEL,
    prompt: `You are a tax document data-extraction engine. From the ${formType} form text below, extract each of these fields:

${fieldList}

RULES:
- "value" is the exact value as printed (keep currency formatting/digits; use an empty string "" if the field is not present in the text).
- "confidence" is an integer 0-100 for how certain you are the value is correct: 90+ = clearly labeled and unambiguous, 50-80 = present but formatting/label ambiguous, below 50 = guessed or missing.
- A missing field gets value "" and confidence 0.
- Never invent values that are not in the text.

FORM TEXT:
"""
${text.slice(0, 8000)}
"""`,
    format: buildExtractionSchema(formType),
    timeoutMs: 120_000,
  });

  const parsed = JSON.parse(response) as Record<
    string,
    { value: string; confidence: number }
  >;

  return specs.map((spec) => ({
    fieldName: spec.key,
    value: parsed[spec.key]?.value ?? "",
    confidence: Math.min(100, Math.max(0, Math.round(parsed[spec.key]?.confidence ?? 0))),
  }));
}

/** Full pipeline: raw text → classify → extract → assemble result with warnings. */
export async function runExtractionPipeline(
  rawText: string,
  options?: { ollamaUrl?: string; textModel?: string }
): Promise<ExtractionResult> {
  const warnings: string[] = [];

  if (rawText.trim().length < 40) {
    warnings.push(
      "Very little text was recovered from the document — extraction quality will be poor."
    );
  }

  const formType = await classifyFormType(rawText, options);
  const fields = await extractFields(rawText, formType, options);

  const missing = fields.filter((f) => !f.value.trim());
  if (missing.length > 0) {
    warnings.push(
      `${missing.length} field(s) could not be found in the document: ${missing
        .map((f) => f.fieldName)
        .join(", ")}.`
    );
  }
  const lowConfidence = fields.filter((f) => f.value.trim() && f.confidence < 50);
  if (lowConfidence.length > 0) {
    warnings.push(
      `${lowConfidence.length} extracted field(s) have confidence below 50 and need manual review.`
    );
  }

  return { formType, fields, rawText, warnings };
}
