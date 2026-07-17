import { NextRequest, NextResponse } from "next/server";
import { checkBias } from "@/lib/biasCheck";
import type { BiasCheckRequestBody } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: BiasCheckRequestBody;
  try {
    body = (await request.json()) as BiasCheckRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON." },
      { status: 400 }
    );
  }

  const { report, jobDescription, resumeText, model, ollamaUrl } = body;

  if (!report || typeof report.overall_score !== "number") {
    return NextResponse.json(
      { error: "A scoring report is required. Provide the /api/score result as `report`." },
      { status: 400 }
    );
  }
  if (!jobDescription?.trim() || !resumeText?.trim()) {
    return NextResponse.json(
      { error: "Both jobDescription and resumeText are required for context." },
      { status: 400 }
    );
  }

  try {
    const biasReport = await checkBias(report, jobDescription, resumeText, {
      model,
      ollamaUrl,
    });
    return NextResponse.json(biasReport);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
