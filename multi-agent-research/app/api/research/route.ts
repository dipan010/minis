import { NextRequest } from "next/server";
import { orchestrate } from "@/lib/orchestrator";
import type { ResearchQuery, StreamEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 600;

/** POST → Server-Sent Events stream. Each agent message is one SSE `data:`
 * event; the final event carries the complete report + review. */
export async function POST(request: NextRequest) {
  let body: ResearchQuery & { model?: string; ollamaUrl?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  if (!body.question?.trim()) {
    return Response.json({ error: "A research question is required." }, { status: 400 });
  }

  const query: ResearchQuery = {
    question: body.question.trim(),
    depth: body.depth ?? "standard",
    format: body.format ?? "report",
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const { report, review } = await orchestrate(
          query,
          (message) => send({ kind: "message", message }),
          { model: body.model, ollamaUrl: body.ollamaUrl }
        );
        send({ kind: "report", report, review });
      } catch (err) {
        send({ kind: "error", error: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
