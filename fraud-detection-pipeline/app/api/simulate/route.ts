import { NextRequest } from "next/server";
import { TransactionGenerator } from "@/lib/transactionGenerator";
import { scoreTransaction } from "@/lib/fraudScoring";
import { explainFraud } from "@/lib/fraudExplainer";
import type { DashboardStats, FraudResult, SimEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

/** GET → SSE stream of scored transactions. Query param `speed` = 1|2|5
 * transactions per second. The client closes the connection to stop. */
export async function GET(request: NextRequest) {
  const speedParam = Number(request.nextUrl.searchParams.get("speed") ?? "1");
  const speed = [1, 2, 5].includes(speedParam) ? speedParam : 1;
  const intervalMs = 1000 / speed;

  const generator = new TransactionGenerator();
  const encoder = new TextEncoder();

  const stats: DashboardStats = {
    total_processed: 0,
    flagged: 0,
    blocked: 0,
    flag_rate: 0,
    avg_risk_score: 0,
    amount_at_risk: 0,
  };
  let riskSum = 0;

  let timer: ReturnType<typeof setInterval> | null = null;
  let closed = false;
  let busy = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: SimEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          closed = true;
          if (timer) clearInterval(timer);
        }
      };

      const tick = async () => {
        if (closed || busy) return; // don't stack slow LLM explanations
        busy = true;
        try {
          const tx = generator.generateTransaction();
          const scored = scoreTransaction(tx, generator.historyFor(tx.customer_id));

          const result: FraudResult = {
            ...scored,
            explanation: scored.is_flagged
              ? await explainFraud(tx, scored.signals)
              : "",
          };

          stats.total_processed += 1;
          riskSum += result.risk_score;
          if (result.is_flagged) {
            stats.flagged += 1;
            stats.amount_at_risk += tx.amount;
          }
          if (result.recommended_action === "block") stats.blocked += 1;
          stats.flag_rate = stats.flagged / stats.total_processed;
          stats.avg_risk_score = riskSum / stats.total_processed;

          send({ kind: "transaction", transaction: tx, result });
          if (stats.total_processed % 5 === 0) {
            send({ kind: "stats", stats: { ...stats } });
          }
        } finally {
          busy = false;
        }
      };

      timer = setInterval(() => void tick(), intervalMs);
      void tick();
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
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
