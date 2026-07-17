import { NextRequest, NextResponse } from "next/server";
import { simulateNews } from "@/lib/newsSimulator";
import { analyzeRisk } from "@/lib/riskAnalysis";
import type { CompanyInput } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

// Two sequential Ollama calls (news simulation + risk analysis) — cap the
// whole pipeline at 2 minutes per call via the lib timeouts, and the route
// overall via an outer race.
const PIPELINE_TIMEOUT_MS = 240_000;

export async function POST(request: NextRequest) {
  let body: CompanyInput & { model?: string; ollamaUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const company = body.name?.trim();
  if (!company) {
    return NextResponse.json({ error: "A company name is required." }, { status: 400 });
  }

  const options = { model: body.model, ollamaUrl: body.ollamaUrl };

  try {
    const report = await Promise.race([
      (async () => {
        const events = await simulateNews(company, body.industry, body.region, options);
        return analyzeRisk(company, events, options);
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Analysis pipeline timed out after 4 minutes.")),
          PIPELINE_TIMEOUT_MS
        )
      ),
    ]);
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
