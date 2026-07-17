import { NextRequest, NextResponse } from "next/server";
import { generateSOAP } from "@/lib/soapGenerator";
import type { TranscriptInput } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  let body: TranscriptInput & { model?: string; ollamaUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  if (!body.transcript?.trim() || body.transcript.trim().length < 100) {
    return NextResponse.json(
      { error: "A transcript of at least ~100 characters is required." },
      { status: 400 }
    );
  }

  try {
    const result = await generateSOAP(
      { transcript: body.transcript, patient_context: body.patient_context },
      { model: body.model, ollamaUrl: body.ollamaUrl, timeoutMs: 120_000 }
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
