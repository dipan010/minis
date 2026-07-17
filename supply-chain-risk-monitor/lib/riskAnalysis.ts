import type { RiskEvent, SupplyChainReport } from "./types";
import { callOllamaStructured, type OllamaCallOptions } from "./ollama";

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    esg: {
      type: "object",
      properties: {
        environmental: { type: "integer", minimum: 0, maximum: 100 },
        social: { type: "integer", minimum: 0, maximum: 100 },
        governance: { type: "integer", minimum: 0, maximum: 100 },
        overall: { type: "integer", minimum: 0, maximum: 100 },
      },
      required: ["environmental", "social", "governance", "overall"],
    },
    top_risks: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
    recommendations: { type: "array", minItems: 5, maxItems: 5, items: { type: "string" } },
    risk_trend: { type: "string", enum: ["improving", "stable", "deteriorating"] },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
  },
  required: ["esg", "top_risks", "recommendations", "risk_trend", "confidence"],
};

type AnalysisOutput = Pick<
  SupplyChainReport,
  "esg" | "top_risks" | "recommendations" | "risk_trend" | "confidence"
>;

/** Second Ollama pass: act as a supply chain risk analyst over the simulated
 * news events and produce ESG scores, top risks, recommendations, and trend. */
export async function analyzeRisk(
  company: string,
  newsEvents: RiskEvent[],
  options?: OllamaCallOptions
): Promise<SupplyChainReport> {
  const eventDigest = newsEvents
    .map(
      (e) =>
        `- [${e.date}] (${e.category}, severity ${e.severity}/5, ${e.source}) ${e.title} — ${e.summary}${e.affected_suppliers ? ` Affected suppliers: ${e.affected_suppliers.join(", ")}.` : ""}`
    )
    .join("\n");

  const prompt = `You are a senior supply chain risk analyst preparing an executive briefing on "${company}". Below are the risk events surfaced by news monitoring over the last 6 months. Analyze them and produce:

- esg: ESG scores 0-100 for environmental, social, governance, plus an overall score. 100 = excellent/no concerns, 50 = notable issues, below 40 = serious problems. Ground each score in the events: repeated or severe events in a pillar should clearly depress that pillar's score. overall is a holistic judgment, not an average.
- top_risks: exactly 3 one-sentence statements of the most material risks, ordered most severe first.
- recommendations: exactly 5 specific, actionable recommendations for the company's procurement/risk team (supplier audits, diversification, contractual clauses, monitoring, remediation).
- risk_trend: "improving" | "stable" | "deteriorating" — judge from whether severe events cluster in recent months versus earlier.
- confidence: 0-100 for how confident this assessment is given the volume and consistency of the events.

RISK EVENTS:
${eventDigest}`;

  const analysis = await callOllamaStructured<AnalysisOutput>(prompt, ANALYSIS_SCHEMA, {
    temperature: 0.2,
    ...options,
  });

  return {
    company,
    esg: analysis.esg,
    risk_events: newsEvents,
    top_risks: analysis.top_risks,
    recommendations: analysis.recommendations,
    risk_trend: analysis.risk_trend,
    confidence: analysis.confidence,
  };
}
