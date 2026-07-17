import { NextRequest, NextResponse } from "next/server";
import { generateBrief } from "@/lib/briefGenerator";
import type { CaseInput } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  let body: CaseInput & { model?: string; ollamaUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "A case title is required." }, { status: 400 });
  }
  if (!body.facts?.trim() || body.facts.trim().length < 50) {
    return NextResponse.json(
      { error: "Facts are required (at least a short paragraph)." },
      { status: 400 }
    );
  }
  if (!body.desired_outcome?.trim()) {
    return NextResponse.json({ error: "A desired outcome is required." }, { status: 400 });
  }

  try {
    const brief = await generateBrief(body, {
      model: body.model,
      ollamaUrl: body.ollamaUrl,
      timeoutMs: 180_000, // complex generation — allow up to 3 minutes
    });
    return NextResponse.json(brief);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
