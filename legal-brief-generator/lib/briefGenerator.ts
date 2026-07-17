import type { CaseInput, LegalBrief } from "./types";
import { AREA_LABELS, JURISDICTION_LABELS, STANDARD_DISCLAIMER } from "./types";
import { callOllamaStructured, type OllamaCallOptions } from "./ollama";

const CASE_REFERENCE_SCHEMA = {
  type: "object",
  properties: {
    case_name: { type: "string" },
    citation: { type: "string" },
    relevance: { type: "string" },
    is_synthetic: { type: "boolean" },
  },
  required: ["case_name", "citation", "relevance", "is_synthetic"],
};

const ARGUMENT_SCHEMA = {
  type: "object",
  properties: {
    heading: { type: "string" },
    thesis: { type: "string" },
    supporting_points: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } },
    case_references: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: CASE_REFERENCE_SCHEMA,
    },
    counterargument: { type: "string" },
    rebuttal: { type: "string" },
  },
  required: [
    "heading",
    "thesis",
    "supporting_points",
    "case_references",
    "counterargument",
    "rebuttal",
  ],
};

export const BRIEF_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    executive_summary: { type: "string" },
    statement_of_facts: { type: "string" },
    issues_presented: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } },
    arguments: { type: "array", minItems: 3, maxItems: 4, items: ARGUMENT_SCHEMA },
    counterarguments_summary: { type: "string" },
    recommended_strategy: { type: "string" },
    risk_assessment: {
      type: "object",
      properties: {
        strength: { type: "string", enum: ["strong", "moderate", "weak"] },
        key_vulnerabilities: {
          type: "array",
          minItems: 2,
          maxItems: 4,
          items: { type: "string" },
        },
        confidence: { type: "integer", minimum: 0, maximum: 100 },
      },
      required: ["strength", "key_vulnerabilities", "confidence"],
    },
  },
  required: [
    "title",
    "executive_summary",
    "statement_of_facts",
    "issues_presented",
    "arguments",
    "counterarguments_summary",
    "recommended_strategy",
    "risk_assessment",
  ],
};

function buildPrompt(input: CaseInput): string {
  return `You are a senior litigation attorney preparing a legal brief. Your role is to organize the facts into a structured legal argument. IMPORTANT: Any case law references you provide are illustrative and may be synthetic. Always mark them as such (is_synthetic: true unless you are certain the case is real and correctly cited — when in doubt, mark true). This is for educational and demonstration purposes only.

CASE DETAILS:
- Title: ${input.title}
- Jurisdiction: ${JURISDICTION_LABELS[input.jurisdiction]}
- Area of law: ${AREA_LABELS[input.area_of_law]}
- Our client's position: ${input.client_position}
- Desired outcome: ${input.desired_outcome}
${input.key_issues?.length ? `- Key issues flagged by the client: ${input.key_issues.join("; ")}` : ""}

FACTS:
"""
${input.facts}
"""

DRAFTING INSTRUCTIONS:
- title: a formal brief title (e.g. "Brief in Support of Plaintiff's Motion for ...").
- executive_summary: 4-6 sentences a partner could read cold.
- statement_of_facts: rewrite the facts as a neutral-toned but favorable narrative, 1-2 paragraphs.
- issues_presented: 2-5 questions of law, each phrased as a single "Whether ..." sentence.
- arguments: 3-4 main arguments advancing the client's position. For each:
  * heading: Roman-numeral-free argument heading in brief style (e.g. "The License Terms Were Unambiguous and Enforceable").
  * thesis: 1-2 sentence statement of the argument.
  * supporting_points: 2-5 concrete points applying law to THESE facts.
  * case_references: 1-3 references with case_name, citation in proper format for the jurisdiction, and a one-sentence relevance. Mark is_synthetic true for any reference you cannot guarantee is real.
  * counterargument: the strongest response opposing counsel would make.
  * rebuttal: how we answer that response.
- counterarguments_summary: one paragraph synthesizing the opposition's overall theory of the case.
- recommended_strategy: one paragraph of practical strategy (motions to file, discovery priorities, settlement posture).
- risk_assessment: strength ("strong"|"moderate"|"weak"), 2-4 key_vulnerabilities specific to these facts, and a confidence integer 0-100.`;
}

export async function generateBrief(
  input: CaseInput,
  options?: OllamaCallOptions
): Promise<LegalBrief> {
  const generated = await callOllamaStructured<Omit<LegalBrief, "jurisdiction" | "disclaimer">>(
    buildPrompt(input),
    BRIEF_SCHEMA,
    { temperature: 0.3, timeoutMs: 180_000, ...options }
  );

  return {
    ...generated,
    jurisdiction: JURISDICTION_LABELS[input.jurisdiction],
    disclaimer: STANDARD_DISCLAIMER,
  };
}
