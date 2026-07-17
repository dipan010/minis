import type {
  AgentMessage,
  ResearchFinding,
  ResearchPlan,
  ResearchQuery,
  ResearchReport,
} from "../types";
import { callOllamaStructured, type OllamaCallOptions } from "../ollama";

const REPORT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    abstract: { type: "string" },
    sections: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          content: { type: "string" },
          findings: { type: "array", items: { type: "string" } },
        },
        required: ["heading", "content", "findings"],
      },
    },
    conclusion: { type: "string" },
    limitations: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } },
    simulated_references: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: { type: "string" },
    },
  },
  required: ["title", "abstract", "sections", "conclusion", "limitations", "simulated_references"],
};

interface RawReport {
  title: string;
  abstract: string;
  sections: { heading: string; content: string; findings: string[] }[];
  conclusion: string;
  limitations: string[];
  simulated_references: string[];
}

export class WriterAgent {
  constructor(
    private options: OllamaCallOptions,
    private emit: (msg: Omit<AgentMessage, "timestamp">) => void
  ) {}

  async write(
    query: ResearchQuery,
    plan: ResearchPlan,
    findings: ResearchFinding[]
  ): Promise<Omit<ResearchReport, "metadata">> {
    this.emit({
      agent: "writer",
      type: "thinking",
      content: `Synthesizing ${findings.length} findings into a ${plan.structure.length}-section ${query.format}…`,
    });

    const findingsDigest = findings
      .map(
        (f, i) =>
          `FINDING ${i + 1} (re: ${f.query}, relevance ${f.relevance}):\n${f.summary}\nKey facts: ${f.key_facts.join("; ")}`
      )
      .join("\n\n");

    this.emit({ agent: "writer", type: "action", content: "Drafting the full document…" });

    const raw = await callOllamaStructured<RawReport>(
      `You are a senior research analyst and technical writer. Synthesize the findings below into a cohesive ${query.format} answering: "${query.question}"

PLANNED STRUCTURE (follow it, adapting headings slightly if needed):
${plan.structure.map((s, i) => `${i + 1}. ${s}`).join("\n")}

FINDINGS:
${findingsDigest}

REQUIREMENTS:
- title: a precise document title.
- abstract: 4-6 sentences summarizing question, approach, and conclusions.
- sections: one per planned heading. content is 1-3 substantial paragraphs weaving the findings together (no bullet lists inside content). findings lists which finding numbers ("Finding 1", "Finding 3") the section draws on.
- conclusion: a closing synthesis with the direct answer to the main question.
- limitations: 2-5 honest limitations (no web access, AI-generated findings, knowledge cutoff, depth of analysis).
- simulated_references: 3-8 illustrative reference strings in citation style. These are ILLUSTRATIVE/SIMULATED — phrase them as plausible source types (reports, journals) without fabricating exact real papers.`,
      REPORT_SCHEMA,
      { temperature: 0.4, timeoutMs: 240_000, ...this.options }
    );

    this.emit({
      agent: "writer",
      type: "result",
      content: `Draft complete: "${raw.title}" — ${raw.sections.length} sections, ${raw.simulated_references.length} simulated references.`,
    });

    return {
      title: raw.title,
      abstract: raw.abstract,
      sections: raw.sections,
      conclusion: raw.conclusion,
      limitations: raw.limitations,
      simulated_references: raw.simulated_references.map((text, i) => ({ id: i + 1, text })),
    };
  }

  /** Rewrite specific sections flagged by the reviewer (deep mode only). */
  async reviseSections(
    report: Omit<ResearchReport, "metadata">,
    feedback: string[],
    indices: number[]
  ): Promise<Omit<ResearchReport, "metadata">> {
    const revised = { ...report, sections: [...report.sections] };

    for (const index of indices) {
      const section = revised.sections[index];
      if (!section) continue;

      this.emit({
        agent: "writer",
        type: "action",
        content: `Rewriting flagged section ${index + 1}: "${section.heading}"…`,
      });

      const raw = await callOllamaStructured<{ content: string }>(
        `You are revising one section of a research report titled "${report.title}".

REVIEWER FEEDBACK:
${feedback.map((f) => `- ${f}`).join("\n")}

SECTION HEADING: ${section.heading}
CURRENT CONTENT:
"""
${section.content}
"""

Rewrite the section content addressing the feedback. Keep roughly the same length. Return only the revised content.`,
        {
          type: "object",
          properties: { content: { type: "string" } },
          required: ["content"],
        },
        { temperature: 0.4, ...this.options }
      );

      revised.sections[index] = { ...section, content: raw.content };
    }

    return revised;
  }
}
