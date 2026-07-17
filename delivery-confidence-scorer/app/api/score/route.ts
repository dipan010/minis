import { NextRequest, NextResponse } from "next/server";
import { scoreDelivery } from "@/lib/scoring";
import type { DeliveryInput } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 150;

export async function POST(request: NextRequest) {
  let body: { input?: DeliveryInput; model?: string; ollamaUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const input = body.input;
  if (!input?.address?.city || !input?.address?.zip) {
    return NextResponse.json(
      { error: "A destination address with at least city and zip is required." },
      { status: 400 }
    );
  }
  if (!input.order || input.order.weight_kg <= 0) {
    return NextResponse.json(
      { error: "Order metadata with a positive weight_kg is required." },
      { status: 400 }
    );
  }

  try {
    const score = await scoreDelivery(input, {
      model: body.model,
      ollamaUrl: body.ollamaUrl,
    });
    return NextResponse.json(score);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
