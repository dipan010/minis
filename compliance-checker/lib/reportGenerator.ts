import type { ComplianceResult, GapAnalysis, Requirement } from "./types";
import { CRITICALITY_ORDER } from "./types";
import { callOllamaStructured, type OllamaCallOptions } from "./ollama";

const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    executive_summary: { type: "string" },
    recommendations: { type: "array", minItems: 3, maxItems: 7, items: { type: "string" } },
  },
  required: ["executive_summary", "recommendations"],
};

/** Assemble the GapAnalysis: score math + prioritized gaps locally, then one
 * Ollama call for the executive summary and recommendations (with a
 * deterministic fallback so the report always completes). */
export async function generateReport(
  policyTitle: string,
  regulationTitle: string,
  requirements: Requirement[],
  results: ComplianceResult[],
  options?: OllamaCallOptions
): Promise<GapAnalysis> {
  const summary = { compliant: 0, partial: 0, gap: 0, not_applicable: 0 };
  for (const r of results) summary[r.status] += 1;

  const applicable = results.length - summary.not_applicable;
  const overall_score =
    applicable === 0
      ? 100
      : Math.round(((summary.compliant + summary.partial * 0.5) / applicable) * 100);

  const reqById = new Map(requirements.map((r) => [r.id, r]));
  const priority_gaps = results
    .filter((r) => r.status === "gap" || r.status === "partial")
    .sort((a, b) => {
      const ra = reqById.get(a.requirement_id);
      const rb = reqById.get(b.requirement_id);
      const critDiff =
        CRITICALITY_ORDER[ra?.criticality ?? "optional"] -
        CRITICALITY_ORDER[rb?.criticality ?? "optional"];
      if (critDiff !== 0) return critDiff;
      // gaps before partials within the same criticality
      return (a.status === "gap" ? 0 : 1) - (b.status === "gap" ? 0 : 1);
    })
    .slice(0, 5);

  const gapDigest = priority_gaps
    .map((g) => {
      const req = reqById.get(g.requirement_id);
      return `- ${g.requirement_id} (${req?.criticality}, ${req?.category}) [${g.status}]: ${req?.text} — ${g.detail}`;
    })
    .join("\n");

  let executive_summary = `The policy "${policyTitle}" scores ${overall_score}/100 against "${regulationTitle}": ${summary.compliant} requirement(s) compliant, ${summary.partial} partial, ${summary.gap} gap(s), ${summary.not_applicable} not applicable. Priority remediation should focus on the mandatory gaps listed below.`;
  let recommendations = priority_gaps.map(
    (g) => g.remediation ?? `Address ${g.requirement_id}.`
  );
  if (recommendations.length === 0) {
    recommendations = ["No gaps identified — maintain the current policy and re-assess on the next regulation revision."];
  }

  try {
    const generated = await callOllamaStructured<{
      executive_summary: string;
      recommendations: string[];
    }>(
      `You are a compliance consultant writing the summary of a gap analysis.

CONTEXT:
- Policy assessed: "${policyTitle}"
- Against regulation/standard: "${regulationTitle}"
- Overall score: ${overall_score}/100 (compliant=1, partial=0.5, over ${applicable} applicable requirements)
- Status counts: ${summary.compliant} compliant, ${summary.partial} partial, ${summary.gap} gaps, ${summary.not_applicable} N/A
- Top priority gaps:
${gapDigest || "(none)"}

Write:
- executive_summary: one paragraph (4-6 sentences) a compliance officer could paste into a report — state the overall posture, the strongest areas, and the most material gaps.
- recommendations: 3-7 prioritized, concrete action items (mandatory gaps first).`,
      SUMMARY_SCHEMA,
      { temperature: 0.2, timeoutMs: 120_000, ...options }
    );
    executive_summary = generated.executive_summary;
    recommendations = generated.recommendations;
  } catch {
    // fall back to the deterministic summary built above
  }

  return {
    policy_title: policyTitle,
    regulation_title: regulationTitle,
    overall_score,
    status_summary: summary,
    requirements,
    results,
    priority_gaps,
    executive_summary,
    recommendations,
    generated_at: new Date().toISOString(),
  };
}
