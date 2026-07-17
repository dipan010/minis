import type { Requirement } from "./types";
import { callOllamaStructured, type OllamaCallOptions } from "./ollama";

const REQUIREMENTS_SCHEMA = {
  type: "object",
  properties: {
    requirements: {
      type: "array",
      minItems: 4,
      maxItems: 25,
      items: {
        type: "object",
        properties: {
          section: { type: "string" },
          text: { type: "string" },
          category: { type: "string" },
          criticality: { type: "string", enum: ["mandatory", "recommended", "optional"] },
        },
        required: ["section", "text", "category", "criticality"],
      },
    },
  },
  required: ["requirements"],
};

/** Parse regulation text into individual, checkable requirements. */
export async function extractRequirements(
  regulationText: string,
  options?: OllamaCallOptions
): Promise<Requirement[]> {
  const result = await callOllamaStructured<{
    requirements: Omit<Requirement, "id">[];
  }>(
    `You are a compliance analyst parsing a regulation/standard into individual, independently checkable requirements.

RULES:
- One requirement per distinct obligation. Split compound clauses ("must do X and Y") when X and Y are separately checkable.
- section: the article/clause reference as written (e.g. "Art. 5(1)(b)", "CC6.1") or a short locator if unnumbered.
- text: the requirement restated as a single clear obligation sentence ("The organization must ...").
- category: a short topical label (e.g. "data retention", "access control", "incident response").
- criticality: "mandatory" for shall/must/required language, "recommended" for should, "optional" for may/encouraged.
- Extract 4-25 requirements. Do not invent obligations that are not in the text.

REGULATION TEXT:
"""
${regulationText.slice(0, 12000)}
"""`,
    REQUIREMENTS_SCHEMA,
    { temperature: 0.1, timeoutMs: 150_000, ...options }
  );

  return result.requirements.map((r, i) => ({
    ...r,
    id: `REQ-${String(i + 1).padStart(2, "0")}`,
  }));
}
