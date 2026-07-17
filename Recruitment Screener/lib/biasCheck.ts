import type { BiasReport, ScreeningResult } from "./types";
import { callOllamaStructured, type OllamaCallOptions } from "./ollama";

export const BIAS_REPORT_SCHEMA = {
  type: "object",
  properties: {
    flags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "age",
              "gender_coded_language",
              "educational_prestige",
              "name_ethnicity_inference",
              "employment_gap_penalty",
              "other",
            ],
          },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          detail: { type: "string" },
          recommendation: { type: "string" },
        },
        required: ["type", "severity", "detail", "recommendation"],
      },
    },
    overall_risk: { type: "string", enum: ["low", "medium", "high"] },
  },
  required: ["flags", "overall_risk"],
};

function buildBiasPrompt(
  report: ScreeningResult,
  jobDescription: string,
  resumeText: string
): string {
  return `You are a fairness auditor reviewing an AI-generated candidate screening report for potential hiring bias. You are NOT re-scoring the candidate — you are checking whether the assessment itself shows bias signals.

Review the screening report (and the source documents for context) for these specific bias categories:

1. "age" — age indicators influencing the assessment (graduation years, "digital native", "overqualified", career length used against the candidate)
2. "gender_coded_language" — gendered or gender-coded language in the rationale, verdict, or summary (e.g. "aggressive", "nurturing", "rockstar", "ninja")
3. "educational_prestige" — weight given to institution prestige rather than demonstrated skills or the JD's actual requirements
4. "name_ethnicity_inference" — any sign the candidate's name, or inferred ethnicity/nationality, coloured the assessment
5. "employment_gap_penalty" — career gaps penalized without job-relevant justification
6. "other" — any other fairness concern (parental status, location, accent/language proxies, etc.)

RULES:
- Only raise a flag when there is concrete evidence in the report's text. Quote or paraphrase the offending passage in "detail".
- For each flag give a practical "recommendation" the recruiter can act on (e.g. re-run scoring with names redacted, ignore a criterion, verify a claim in interview).
- severity: "low" = worth awareness, "medium" = likely influenced a score, "high" = materially unfair assessment.
- overall_risk reflects the worst credible flag: no flags or trivial ones = "low".
- An empty flags array with overall_risk "low" is the CORRECT output for a clean report. Do not invent flags.

---

SCREENING REPORT (JSON):
"""
${JSON.stringify(report, null, 2)}
"""

JOB DESCRIPTION:
"""
${jobDescription}
"""

RESUME:
"""
${resumeText}
"""`;
}

export async function checkBias(
  report: ScreeningResult,
  jobDescription: string,
  resumeText: string,
  options?: OllamaCallOptions
): Promise<BiasReport> {
  return callOllamaStructured<BiasReport>(
    buildBiasPrompt(report, jobDescription, resumeText),
    BIAS_REPORT_SCHEMA,
    { temperature: 0.1, ...options }
  );
}
