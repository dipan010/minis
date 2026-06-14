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
