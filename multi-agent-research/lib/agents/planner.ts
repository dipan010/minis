import type { AgentMessage, ResearchPlan, ResearchQuery } from "../types";
import { callOllamaStructured, type OllamaCallOptions } from "../ollama";

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    sub_questions: { type: "array", minItems: 3, maxItems: 6, items: { type: "string" } },
    search_queries: { type: "array", minItems: 3, maxItems: 8, items: { type: "string" } },
    structure: { type: "array", minItems: 3, maxItems: 7, items: { type: "string" } },
  },
  required: ["sub_questions", "search_queries", "structure"],
};

const DEPTH_SUBQUESTIONS = { quick: "3", standard: "4-5", deep: "5-6" } as const;

export class PlannerAgent {
  constructor(
    private options: OllamaCallOptions,
    private emit: (msg: Omit<AgentMessage, "timestamp">) => void
  ) {}

  async plan(query: ResearchQuery): Promise<ResearchPlan> {
    this.emit({
      agent: "planner",
      type: "thinking",
      content: `Decomposing the research question at "${query.depth}" depth…`,
    });

    const prompt = `You are a senior research director planning a ${query.format}. Decompose the research question into a concrete plan.

QUESTION: "${query.question}"
DEPTH: ${query.depth} — produce ${DEPTH_SUBQUESTIONS[query.depth]} sub-questions.
FORMAT: ${query.format}${query.format === "comparison" ? " (structure must compare alternatives side by side)" : ""}

Produce:
- sub_questions: the distinct questions that together answer the main question, ordered logically.
- search_queries: one or two short search-engine-style queries per sub-question.
- structure: proposed section headings for the final ${query.format} (an introduction-like opening and a closing section included).`;

    this.emit({ agent: "planner", type: "action", content: "Calling model to draft the research plan…" });

    const raw = await callOllamaStructured<Omit<ResearchPlan, "question" | "estimated_sections">>(
      prompt,
      PLAN_SCHEMA,
      { temperature: 0.3, ...this.options }
    );

    const plan: ResearchPlan = {
      question: query.question,
      ...raw,
      estimated_sections: raw.structure.length,
    };

    this.emit({
      agent: "planner",
      type: "result",
      content: `Plan ready: ${plan.sub_questions.length} sub-questions, ${plan.structure.length} sections.\n${plan.sub_questions.map((q, i) => `  ${i + 1}. ${q}`).join("\n")}`,
      metadata: { plan },
    });

    return plan;
  }
}
