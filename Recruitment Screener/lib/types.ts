export interface CriterionScore {
  name: string;
  score: number; // 0-100
  rationale: string;
}

export interface ScreeningResult {
  overall_score: number; // 0-100
  verdict: string; // e.g. "Strong match"
  summary: string; // 2-4 sentences
  criteria: CriterionScore[];
  strengths: string[];
  gaps: string[];
}

export const CRITERIA_DIMENSIONS = [
  "Technical skills",
  "Experience & seniority",
  "Education & certifications",
  "Domain / industry experience",
  "Responsibilities & scope alignment",
] as const;

export interface ScoreRequestBody {
  jobDescription: string;
  resumeText: string;
  model?: string;
  ollamaUrl?: string;
}

/** Response shape of POST /api/score — the screening result plus the
 * resolved input texts (PDF-extracted or pasted), which the client needs
 * for the follow-up question-bank and bias-check calls. */
export interface ScoreResponse extends ScreeningResult {
  inputs: {
    jobDescription: string;
    resumeText: string;
  };
}

// ─── Week 2 — Interview Question Bank ────────────────────────────────────────

export interface InterviewQuestion {
  question: string;
  rationale: string; // why this question, tied to the scoring report
  what_to_look_for: string; // what a good answer looks like
}

export interface QuestionBank {
  technical: InterviewQuestion[];
  behavioural: InterviewQuestion[];
  culture: InterviewQuestion[];
}

export interface QuestionsRequestBody {
  report: ScreeningResult;
  jobDescription: string;
  resumeText: string;
  model?: string;
  ollamaUrl?: string;
}

// ─── Week 2 — Bias Flag Layer ────────────────────────────────────────────────

export type BiasSeverity = "low" | "medium" | "high";

export type BiasFlagType =
  | "age"
  | "gender_coded_language"
  | "educational_prestige"
  | "name_ethnicity_inference"
  | "employment_gap_penalty"
  | "other";

export interface BiasFlag {
  type: BiasFlagType;
  severity: BiasSeverity;
  detail: string;
  recommendation: string;
}

export interface BiasReport {
  flags: BiasFlag[];
  overall_risk: BiasSeverity;
}

export interface BiasCheckRequestBody {
  report: ScreeningResult;
  jobDescription: string;
  resumeText: string;
  model?: string;
  ollamaUrl?: string;
}
