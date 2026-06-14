import type { ScreeningResult } from "./types";
import { CRITERIA_DIMENSIONS } from "./types";

export const DEFAULT_OLLAMA_URL = "http://localhost:11434";
export const DEFAULT_MODEL = "llama3.1:8b";

export const SCORE_SCHEMA = {
  type: "object",
  properties: {
    overall_score: {
      type: "integer",
      minimum: 0,
      maximum: 100,
    },
    verdict: {
      type: "string",
    },
    summary: {
      type: "string",
    },
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          score: { type: "integer", minimum: 0, maximum: 100 },
          rationale: { type: "string" },
        },
        required: ["name", "score", "rationale"],
      },
    },
    strengths: {
      type: "array",
      items: { type: "string" },
    },
    gaps: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "overall_score",
    "verdict",
    "summary",
    "criteria",
    "strengths",
    "gaps",
  ],
};

function buildPrompt(jobDescription: string, resumeText: string): string {
  const dimensionList = CRITERIA_DIMENSIONS.map(
    (d, i) => `  ${i + 1}. ${d}`
  ).join("\n");

  return `You are an experienced technical recruiter with deep engineering knowledge. Your task is to evaluate a candidate's resume against a job description and produce a structured JSON assessment.

SCORING RULES:
- Score strictly on evidence present in the resume. Do not assume unstated skills, infer experience, or give benefit of the doubt for missing information.
- Each score is an integer from 0 to 100.
- overall_score is a holistic assessment, NOT a simple average of criterion scores.

CRITERIA:
Evaluate the candidate on exactly these 5 dimensions, in this exact order, using these exact names in the criteria array:
${dimensionList}

For each dimension provide:
- score (0-100 integer)
- rationale (1-2 sentences referencing specific details from the resume and/or job description)

OUTPUT FIELDS:
- overall_score: holistic integer 0-100 reflecting the candidate's fit for the role
- verdict: a short phrase (e.g. "Strong match", "Partial match", "Weak match")
- summary: 2-4 sentences describing the candidate's overall fit
- criteria: array of exactly 5 objects in the order listed above
- strengths: 2-4 bullet strings highlighting the candidate's strongest relevant qualities
- gaps: 2-4 bullet strings identifying the most significant missing requirements or weaknesses

---

JOB DESCRIPTION:
"""
${jobDescription}
"""

RESUME:
"""
${resumeText}
"""`;
}

export async function scoreMatch(
  jobDescription: string,
  resumeText: string,
  options?: { ollamaUrl?: string; model?: string }
): Promise<ScreeningResult> {
  const ollamaUrl = options?.ollamaUrl ?? DEFAULT_OLLAMA_URL;
  const model = options?.model ?? DEFAULT_MODEL;

  let response: Response;
  try {
    response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: buildPrompt(jobDescription, resumeText),
        stream: false,
        format: SCORE_SCHEMA,
        options: { temperature: 0.1 },
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
      throw new Error(
        `Could not reach Ollama at ${ollamaUrl}. Make sure Ollama is running (hint: run \`ollama serve\`). Original error: ${message}`
      );
    }
    throw new Error(`Network error contacting Ollama: ${message}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    throw new Error(
      `Ollama returned HTTP ${response.status}: ${body}`
    );
  }

  const data = await response.json();

  let result: ScreeningResult;
  try {
    result = JSON.parse(data.response) as ScreeningResult;
  } catch {
    throw new Error(
      `Failed to parse Ollama response as JSON. Raw response: ${data.response}`
    );
  }

  return result;
}
