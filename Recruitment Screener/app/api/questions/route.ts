import { NextRequest, NextResponse } from "next/server";
import { generateQuestions } from "@/lib/questions";
import type { QuestionsRequestBody } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: QuestionsRequestBody;
  try {
    body = (await request.json()) as QuestionsRequestBody;
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
    const questions = await generateQuestions(report, jobDescription, resumeText, {
      model,
      ollamaUrl,
    });
    return NextResponse.json(questions);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
