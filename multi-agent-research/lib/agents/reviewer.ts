import type { AgentMessage, ResearchReport, ReviewResult } from "../types";
import { callOllamaStructured, type OllamaCallOptions } from "../ollama";

const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    feedback: { type: "array", minItems: 2, maxItems: 6, items: { type: "string" } },
    flagged_section_indices: {
      type: "array",
      maxItems: 3,
      items: { type: "integer", minimum: 0 },
    },
  },
  required: ["score", "feedback", "flagged_section_indices"],
};

export class ReviewerAgent {
  constructor(
    private options: OllamaCallOptions,
    private emit: (msg: Omit<AgentMessage, "timestamp">) => void
  ) {}

  async review(
    report: Omit<ResearchReport, "metadata">
  ): Promise<ReviewResult & { flagged_section_indices: number[] }> {
    this.emit({
      agent: "reviewer",
      type: "thinking",
      content: "Peer-reviewing the draft for logical consistency, unsupported claims, and structure…",
    });

    const digest = [
      `TITLE: ${report.title}`,
      `ABSTRACT: ${report.abstract}`,
      ...report.sections.map(
        (s, i) => `SECTION ${i} — ${s.heading}:\n${s.content}`
      ),
      `CONCLUSION: ${report.conclusion}`,
    ].join("\n\n");

    const raw = await callOllamaStructured<{
      score: number;
      feedback: string[];
      flagged_section_indices: number[];
    }>(
      `You are a rigorous peer reviewer. Assess this research report draft for:
- logical consistency between abstract, sections, and conclusion
- unsupported or overconfident claims
- structural issues (missing transitions, redundancy, sections that don't serve the question)
- clarity and precision of writing

Return:
- score: 0-100 overall quality (85+ publishable draft, 70-84 solid with fixable issues, below 70 needs rewriting).
- feedback: 2-6 specific, actionable feedback points referencing sections by number.
- flagged_section_indices: 0-based indices of up to 3 sections that most need rewriting (empty if none).

DRAFT:
${digest}`,
      REVIEW_SCHEMA,
      { temperature: 0.2, ...this.options }
    );

    this.emit({
      agent: "reviewer",
      type: "result",
      content: `Review score: ${raw.score}/100.\n${raw.feedback.map((f) => `  • ${f}`).join("\n")}`,
      metadata: { score: raw.score },
    });

    return {
      score: raw.score,
      feedback: raw.feedback,
      flagged_section_indices: raw.flagged_section_indices.filter(
        (i) => i >= 0 && i < report.sections.length
      ),
    };
  }
}
