import type { AgentMessage, ResearchFinding, ResearchPlan } from "../types";
import { callOllamaStructured, type OllamaCallOptions } from "../ollama";

const FINDING_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    key_facts: { type: "array", minItems: 3, maxItems: 6, items: { type: "string" } },
    relevance: { type: "integer", minimum: 0, maximum: 100 },
  },
  required: ["summary", "key_facts", "relevance"],
};

export class ResearcherAgent {
  constructor(
    private options: OllamaCallOptions,
    private emit: (msg: Omit<AgentMessage, "timestamp">) => void
  ) {}

  /** Investigate each sub-question sequentially. There is no web access —
   * findings come from the model's training knowledge and are labeled
   * accordingly. */
  async research(plan: ResearchPlan): Promise<ResearchFinding[]> {
    const findings: ResearchFinding[] = [];

    for (const [i, subQuestion] of plan.sub_questions.entries()) {
      this.emit({
        agent: "researcher",
        type: "thinking",
        content: `(${i + 1}/${plan.sub_questions.length}) Investigating: ${subQuestion}`,
      });

      const raw = await callOllamaStructured<{
        summary: string;
        key_facts: string[];
        relevance: number;
      }>(
        `You are a domain expert researcher contributing to: "${plan.question}".

Investigate this sub-question using your training knowledge: "${subQuestion}"

Produce:
- summary: a dense 3-5 sentence synthesis of what is known.
- key_facts: 3-6 specific facts, figures, or mechanisms (be concrete; approximate figures are fine if labeled as approximate).
- relevance: 0-100 for how directly this answers the main question.

Be factual to the best of your knowledge; do not fabricate precise statistics or named studies.`,
        FINDING_SCHEMA,
        { temperature: 0.3, ...this.options }
      );

      const finding: ResearchFinding = {
        query: subQuestion,
        summary: raw.summary,
        key_facts: raw.key_facts,
        source_note: "AI-generated finding from model training knowledge, not from a real source",
        relevance: raw.relevance,
      };
      findings.push(finding);

      this.emit({
        agent: "researcher",
        type: "result",
        content: `Finding ${i + 1}: ${raw.summary.slice(0, 180)}${raw.summary.length > 180 ? "…" : ""} (relevance ${raw.relevance}/100)`,
        metadata: { index: i, relevance: raw.relevance },
      });
    }

    return findings;
  }
}
