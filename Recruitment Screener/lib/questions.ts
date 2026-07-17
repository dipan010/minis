import type { QuestionBank, ScreeningResult } from "./types";
import { callOllamaStructured, type OllamaCallOptions } from "./ollama";

const QUESTION_ITEM_SCHEMA = {
  type: "object",
  properties: {
    question: { type: "string" },
    rationale: { type: "string" },
    what_to_look_for: { type: "string" },
  },
  required: ["question", "rationale", "what_to_look_for"],
};

export const QUESTION_BANK_SCHEMA = {
  type: "object",
  properties: {
    technical: {
      type: "array",
      items: QUESTION_ITEM_SCHEMA,
      minItems: 4,
      maxItems: 4,
    },
    behavioural: {
      type: "array",
      items: QUESTION_ITEM_SCHEMA,
      minItems: 4,
      maxItems: 4,
    },
    culture: {
      type: "array",
      items: QUESTION_ITEM_SCHEMA,
      minItems: 4,
      maxItems: 4,
    },
  },
  required: ["technical", "behavioural", "culture"],
};

function buildQuestionsPrompt(
  report: ScreeningResult,
  jobDescription: string,
  resumeText: string
): string {
  return `You are a senior technical interviewer designing a tailored interview kit for a specific candidate. You have the job description, the candidate's resume, and a structured screening report that already scored the candidate against the role.

Generate EXACTLY 12 interview questions in three categories of 4 questions each:

1. "technical" — 4 questions that probe the SPECIFIC skill gaps identified in the screening report below. Each question should target a concrete gap or unverified claim, not generic trivia.
2. "behavioural" — 4 STAR-format questions (Situation, Task, Action, Result) tied to the role's actual responsibilities from the job description. Phrase them as "Tell me about a time…" style prompts.
3. "culture" — 4 culture-fit questions grounded in the company values and working style that can be inferred from the job description (collaboration style, pace, ownership, customer focus, etc.).

For every question provide:
- question: the exact wording the interviewer should ask
- rationale: 1-2 sentences on WHY this question matters for THIS candidate (reference the specific gap, resume claim, or JD requirement it probes)
- what_to_look_for: 1-2 sentences describing what a strong answer looks like, so a non-expert interviewer can evaluate the response

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

export async function generateQuestions(
  report: ScreeningResult,
  jobDescription: string,
  resumeText: string,
  options?: OllamaCallOptions
): Promise<QuestionBank> {
  return callOllamaStructured<QuestionBank>(
    buildQuestionsPrompt(report, jobDescription, resumeText),
    QUESTION_BANK_SCHEMA,
    { temperature: 0.4, ...options }
  );
}
