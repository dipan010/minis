import type { RiskEvent } from "./types";
import { callOllamaStructured, type OllamaCallOptions } from "./ollama";

const NEWS_SCHEMA = {
  type: "object",
  properties: {
    events: {
      type: "array",
      minItems: 8,
      maxItems: 12,
      items: {
        type: "object",
        properties: {
          months_ago: { type: "number", minimum: 0, maximum: 6 },
          title: { type: "string" },
          summary: { type: "string" },
          category: {
            type: "string",
            enum: [
              "environmental",
              "social",
              "governance",
              "geopolitical",
              "operational",
              "regulatory",
            ],
          },
          severity: { type: "integer", minimum: 1, maximum: 5 },
          source: { type: "string" },
          affected_suppliers: { type: "array", items: { type: "string" } },
        },
        required: ["months_ago", "title", "summary", "category", "severity", "source"],
      },
    },
  },
  required: ["events"],
};

interface RawEvent {
  months_ago: number;
  title: string;
  summary: string;
  category: RiskEvent["category"];
  severity: number;
  source: string;
  affected_suppliers?: string[];
}

/** Generate 8-12 synthetic-but-plausible news events about the company's
 * supply chain via Ollama. All events are fictional — this simulates what a
 * real platform would ingest from news scrapers. */
export async function simulateNews(
  company: string,
  industry?: string,
  region?: string,
  options?: OllamaCallOptions
): Promise<RiskEvent[]> {
  const prompt = `You are a news-feed simulator for a supply chain intelligence platform. Generate 8-12 plausible but ENTIRELY FICTIONAL news events about the supply chain of the company "${company}"${industry ? ` (industry: ${industry})` : ""}${region ? ` (primary region: ${region})` : ""}.

REQUIREMENTS:
- Spread events across the last 6 months ("months_ago" between 0 and 6, use decimals like 2.5 for mid-month).
- Cover a realistic mix of categories: environmental violations or incidents, labor disputes / social issues, governance problems, regulatory changes, operational supply disruptions, and geopolitical exposure. At least 4 different categories must appear.
- Mix severities: mostly 2-3, one or two 4-5 events, at least one minor 1.
- "title" reads like a real news headline; "summary" is 2-3 sentences of factual-toned reporting.
- "source" is a plausible outlet attribution: "Reuters", "Bloomberg", "Financial Times", "Nikkei Asia", "industry trade press", "local news wire", etc.
- Where relevant, name 1-3 fictional affected suppliers in "affected_suppliers" (plausible supplier company names, not real firms).
- Events must be plausible for the company's industry and region but must NOT recount real reported incidents.`;

  const result = await callOllamaStructured<{ events: RawEvent[] }>(
    prompt,
    NEWS_SCHEMA,
    { temperature: 0.7, ...options }
  );

  const now = Date.now();
  return result.events.map((e, i) => {
    const date = new Date(now - e.months_ago * 30.4 * 24 * 3600 * 1000);
    return {
      id: `evt-${i + 1}`,
      date: date.toISOString().slice(0, 10),
      title: e.title,
      summary: e.summary,
      category: e.category,
      severity: Math.min(5, Math.max(1, Math.round(e.severity))),
      source: e.source,
      affected_suppliers: e.affected_suppliers?.length ? e.affected_suppliers : undefined,
    };
  });
}
