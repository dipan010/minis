export type ResearchDepth = "quick" | "standard" | "deep";
export type ResearchFormat = "report" | "briefing" | "comparison";

export interface ResearchQuery {
  question: string;
  depth: ResearchDepth;
  format: ResearchFormat;
}

export type AgentRole = "planner" | "researcher" | "writer" | "reviewer";

export type AgentMessageType = "thinking" | "action" | "result" | "error";

export interface AgentMessage {
  agent: AgentRole;
  type: AgentMessageType;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ResearchPlan {
  question: string;
  sub_questions: string[];
  search_queries: string[];
  structure: string[]; // proposed section headings
  estimated_sections: number;
}

export interface ResearchFinding {
  query: string;
  summary: string;
  key_facts: string[];
  source_note: string;
  relevance: number; // 0-100
}

export interface ReportSection {
  heading: string;
  content: string;
  findings: string[];
}

export interface ResearchReport {
  title: string;
  abstract: string;
  sections: ReportSection[];
  conclusion: string;
  limitations: string[];
  simulated_references: { id: number; text: string }[];
  metadata: {
    question: string;
    depth: ResearchDepth;
    agents_used: number;
    total_steps: number;
    generation_time_ms: number;
  };
}

export interface ReviewResult {
  score: number; // 0-100
  feedback: string[];
  revised_sections?: { index: number; content: string }[];
}

/** SSE event envelope streamed to the client. */
export type StreamEvent =
  | { kind: "message"; message: AgentMessage }
  | { kind: "report"; report: ResearchReport; review: ReviewResult }
  | { kind: "error"; error: string };

export const AGENT_META: Record<AgentRole, { label: string; color: string; icon: string }> = {
  planner: { label: "Planner", color: "var(--planner)", icon: "◆" },
  researcher: { label: "Researcher", color: "var(--researcher)", icon: "◉" },
  writer: { label: "Writer", color: "var(--writer)", icon: "✎" },
  reviewer: { label: "Reviewer", color: "var(--reviewer)", icon: "☑" },
};

/** Rough total-step estimates per depth, used by the progress indicator. */
export const DEPTH_STEP_ESTIMATE: Record<ResearchDepth, number> = {
  quick: 9,
  standard: 12,
  deep: 16,
};
