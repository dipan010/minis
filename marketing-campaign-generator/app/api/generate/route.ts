import { NextRequest, NextResponse } from "next/server";
import { generateCampaign } from "@/lib/campaignGenerator";
import type { CampaignBrief } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 600;

const PIPELINE_TIMEOUT_MS = 280_000; // 4 sequential Ollama calls

export async function POST(request: NextRequest) {
  let body: { brief?: CampaignBrief; model?: string; ollamaUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const brief = body.brief;
  if (!brief?.product_name?.trim() || !brief.product_description?.trim()) {
    return NextResponse.json(
      { error: "A brief with product_name and product_description is required." },
      { status: 400 }
    );
  }
  if (!brief.segment?.name?.trim()) {
    return NextResponse.json(
      { error: "A customer segment with at least a name is required." },
      { status: 400 }
    );
  }

  try {
    const campaign = await Promise.race([
      generateCampaign(brief, { model: body.model, ollamaUrl: body.ollamaUrl }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error("Campaign generation timed out (4 sequential LLM calls, ~5 min cap).")
            ),
          PIPELINE_TIMEOUT_MS
        )
      ),
    ]);
    return NextResponse.json(campaign);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
