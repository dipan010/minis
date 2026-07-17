import { NextRequest, NextResponse } from "next/server";
import { scoreTransaction } from "@/lib/fraudScoring";
import { explainFraud } from "@/lib/fraudExplainer";
import type { FraudResult, Transaction } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/** POST a single transaction JSON for manual analysis (no history context). */
export async function POST(request: NextRequest) {
  let tx: Transaction;
  try {
    tx = (await request.json()) as Transaction;
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  if (!tx?.customer_id || typeof tx.amount !== "number" || !tx.timestamp) {
    return NextResponse.json(
      { error: "A Transaction object with customer_id, amount, and timestamp is required." },
      { status: 400 }
    );
  }

  const scored = scoreTransaction(tx, []);
  const result: FraudResult = {
    ...scored,
    explanation: scored.is_flagged ? await explainFraud(tx, scored.signals) : "",
  };

  return NextResponse.json(result);
}
