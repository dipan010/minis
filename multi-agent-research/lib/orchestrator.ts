import type {
  AgentMessage,
  ResearchQuery,
  ResearchReport,
  ReviewResult,
} from "./types";
import type { OllamaCallOptions } from "./ollama";
import { PlannerAgent } from "./agents/planner";
import { ResearcherAgent } from "./agents/researcher";
import { WriterAgent } from "./agents/writer";
import { ReviewerAgent } from "./agents/reviewer";

export interface OrchestrationResult {
  report: ResearchReport;
  review: ReviewResult;
}

/** Runs the agent pipeline Planner → Researcher → Writer → Reviewer
 * (→ optional rewrite on "deep" depth when the review score is < 70),
 * streaming every AgentMessage through the onMessage callback. */
export async function orchestrate(
  query: ResearchQuery,
  onMessage: (msg: AgentMessage) => void,
  options: OllamaCallOptions = {}
): Promise<OrchestrationResult> {
  const started = Date.now();
  let steps = 0;

  const emit = (msg: Omit<AgentMessage, "timestamp">) => {
    steps += 1;
    onMessage({ ...msg, timestamp: new Date().toISOString() });
  };

  const planner = new PlannerAgent(options, emit);
  const researcher = new ResearcherAgent(options, emit);
  const writer = new WriterAgent(options, emit);
  const reviewer = new ReviewerAgent(options, emit);

  const plan = await planner.plan(query);
  const findings = await researcher.research(plan);
  let draft = await writer.write(query, plan, findings);
  let review = await reviewer.review(draft);

  let agentsUsed = 4;
  if (query.depth === "deep" && review.score < 70 && review.flagged_section_indices.length > 0) {
    emit({
      agent: "reviewer",
      type: "action",
      content: `Score below 70 on deep mode — sending ${review.flagged_section_indices.length} section(s) back to the writer.`,
    });
    draft = await writer.reviseSections(draft, review.feedback, review.flagged_section_indices);
    review = await reviewer.review(draft);
    agentsUsed = 5; // writer engaged a second time
  }

  const report: ResearchReport = {
    ...draft,
    metadata: {
      question: query.question,
      depth: query.depth,
      agents_used: agentsUsed,
      total_steps: steps,
      generation_time_ms: Date.now() - started,
    },
  };

  return {
    report,
    review: { score: review.score, feedback: review.feedback },
  };
}
