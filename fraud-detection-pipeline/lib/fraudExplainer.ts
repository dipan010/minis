import type { FraudSignal, Transaction } from "./types";

export const DEFAULT_OLLAMA_URL = "http://localhost:11434";
export const DEFAULT_MODEL = "llama3.1:8b";

/** LLM explanation for a FLAGGED transaction only (risk_score > 50) — the
 * statistical layer handles everything else, keeping LLM calls rare.
 * Falls back to a deterministic explanation if Ollama is unreachable so the
 * simulation keeps running. */
export async function explainFraud(
  tx: Transaction,
  signals: FraudSignal[],
  options?: { ollamaUrl?: string; model?: string }
): Promise<string> {
  const fallback = `Flagged on ${signals.length} signal(s): ${signals
    .map((s) => `${s.type} (${s.score})`)
    .join(", ")}. ${signals.map((s) => s.detail).join(" ")}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(`${options?.ollamaUrl ?? DEFAULT_OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: options?.model ?? DEFAULT_MODEL,
        prompt: `You are a fraud operations assistant. Write a concise 2-3 sentence explanation for a fraud analyst about why this card transaction was flagged. Be specific, reference the signals, and end with what the analyst should verify first. No preamble.

TRANSACTION: ${tx.amount.toFixed(2)} ${tx.currency} at "${tx.merchant}" (${tx.category}, ${tx.channel}) in ${tx.location.city}, ${tx.location.country} at ${tx.timestamp} — customer ${tx.customer_id}, card ending ${tx.card_last4}.

SIGNALS:
${signals.map((s) => `- ${s.type} (score ${s.score}): ${s.detail}`).join("\n")}`,
        stream: false,
        options: { temperature: 0.2 },
      }),
    });

    if (!response.ok) return fallback;
    const data = await response.json();
    const text = (data.response as string | undefined)?.trim();
    return text || fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
