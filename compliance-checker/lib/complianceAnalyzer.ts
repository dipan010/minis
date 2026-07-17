import type { ComplianceResult, Requirement } from "./types";
import { callOllamaStructured, type OllamaCallOptions } from "./ollama";

const BATCH_SIZE = 5;

const BATCH_SCHEMA = {
  type: "object",
  properties: {
    assessments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          requirement_id: { type: "string" },
          status: {
            type: "string",
            enum: ["compliant", "partial", "gap", "not_applicable"],
          },
          confidence: { type: "integer", minimum: 0, maximum: 100 },
          policy_reference: { type: "string" },
          detail: { type: "string" },
          remediation: { type: "string" },
        },
        required: [
          "requirement_id",
          "status",
          "confidence",
          "policy_reference",
          "detail",
          "remediation",
        ],
      },
    },
  },
  required: ["assessments"],
};

/** Assess each requirement against the policy, batching 5 requirements per
 * Ollama call for efficiency. */
export async function analyzeCompliance(
  policyText: string,
  requirements: Requirement[],
  options?: OllamaCallOptions
): Promise<ComplianceResult[]> {
  const results: ComplianceResult[] = [];

  for (let start = 0; start < requirements.length; start += BATCH_SIZE) {
    const batch = requirements.slice(start, start + BATCH_SIZE);
    const batchDigest = batch
      .map((r) => `${r.id} [${r.criticality}, ${r.category}] (${r.section}): ${r.text}`)
      .join("\n");

    const raw = await callOllamaStructured<{ assessments: ComplianceResult[] }>(
      `You are a compliance auditor. Given the policy document below, assess whether each listed regulatory requirement is met.

For EACH requirement return:
- requirement_id: exactly as given.
- status: "compliant" (clearly and fully addressed), "partial" (addressed but incomplete — explain what's missing in detail), "gap" (not addressed at all), or "not_applicable" (the requirement cannot apply to this organization/policy scope).
- confidence: 0-100 in your assessment.
- policy_reference: quote or cite the specific policy section/sentence that addresses it, or "none" for gaps.
- detail: 1-2 sentences justifying the status.
- remediation: for partial/gap, the concrete policy change needed; for compliant/not_applicable, "none needed".

Judge strictly: vague policy language does not satisfy a specific obligation.

REQUIREMENTS:
${batchDigest}

POLICY DOCUMENT:
"""
${policyText.slice(0, 10000)}
"""`,
      BATCH_SCHEMA,
      { temperature: 0.1, timeoutMs: 150_000, ...options }
    );

    // keep only assessments matching this batch's IDs; fill any the model dropped
    const byId = new Map(raw.assessments.map((a) => [a.requirement_id, a]));
    for (const req of batch) {
      const assessment = byId.get(req.id);
      if (assessment) {
        results.push({
          ...assessment,
          confidence: Math.min(100, Math.max(0, Math.round(assessment.confidence))),
        });
      } else {
        results.push({
          requirement_id: req.id,
          status: "gap",
          confidence: 20,
          policy_reference: "none",
          detail: "The model did not return an assessment for this requirement; treated as an unverified gap.",
          remediation: "Re-run the analysis or assess this requirement manually.",
        });
      }
    }
  }

  return results;
}
