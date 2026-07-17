import type { DeliveryInput, DeliveryScore } from "./types";

export const DEFAULT_OLLAMA_URL = "http://localhost:11434";
export const DEFAULT_MODEL = "llama3.1:8b";

export const SCORE_SCHEMA = {
  type: "object",
  properties: {
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
    risk_factors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["address", "weather", "package", "timing", "history"],
          },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          detail: { type: "string" },
          mitigation: { type: "string" },
        },
        required: ["category", "severity", "detail", "mitigation"],
      },
    },
    recommendations: { type: "array", items: { type: "string" } },
    estimated_attempts: { type: "number", minimum: 1, maximum: 5 },
    suggested_actions: { type: "array", items: { type: "string" } },
  },
  required: [
    "confidence",
    "risk_level",
    "risk_factors",
    "recommendations",
    "estimated_attempts",
    "suggested_actions",
  ],
};

function successRate(input: DeliveryInput): string {
  if (!input.history || input.history.previous_deliveries === 0) return "unknown";
  const rate = (input.history.successful / input.history.previous_deliveries) * 100;
  return `${rate.toFixed(0)}%`;
}

function buildPrompt(input: DeliveryInput): string {
  return `You are a senior logistics risk analyst for a parcel carrier, performing PRE-SHIPMENT delivery confidence scoring. Given the shipment below, predict the likelihood of first-attempt-successful delivery and enumerate the concrete risk factors.

APPLY THESE HEURISTICS (in addition to your own judgment):
- PO box destination + declared value over $500 → HIGH address risk (many PO boxes cannot accept couriered/high-value parcels).
- Residential address + no signature required + value over $200 → MEDIUM address risk (porch theft exposure).
- Express or overnight service to a rural-pattern ZIP (sparse ZIP prefixes, small towns) → timing risk (carrier network thins out).
- Delivery history success rate below 80% → history risk proportional to how low it is; avg_attempts above 1.5 also raises it.
- Fragile + weight over 10 kg → package risk (heavy fragile items suffer the most handling damage).
- Very tight delivery windows (same-day span) → timing risk.
- No delivery history at all is a mild unknown, not a penalty.

OUTPUT RULES:
- confidence: integer 0-100 = probability of successful delivery within the window without exceptions. Well-profiled safe suburban/commercial deliveries land 85-95; multiple compounding high risks push below 50.
- risk_level: "low" (80+), "medium" (60-79), "high" (40-59), "critical" (<40) — keep it consistent with confidence.
- risk_factors: one entry per REAL risk found, each in exactly one category ("address"|"weather"|"package"|"timing"|"history") with severity, a 1-2 sentence detail specific to THIS shipment, and a practical mitigation. Do not fabricate weather events — only note weather as seasonal/route exposure when relevant.
- recommendations: 3-5 short recommendations for the shipper.
- estimated_attempts: expected number of delivery attempts (1.0-5.0).
- suggested_actions: 2-4 concrete pre-shipment actions (e.g. "require signature", "add shipment insurance", "reroute to pickup point").

SHIPMENT:
- Destination: ${input.address.street}, ${input.address.city}, ${input.address.state} ${input.address.zip}, ${input.address.country} (address type: ${input.address.type})
- Package: ${input.order.weight_kg} kg, declared value $${input.order.value_usd}, fragile: ${input.order.fragile}
- Service: ${input.order.carrier}, ${input.order.service_level}, signature required: ${input.order.requires_signature}
- Delivery window: ${input.order.delivery_window.start} to ${input.order.delivery_window.end}
- Delivery history at this address: ${
    input.history
      ? `${input.history.previous_deliveries} previous deliveries, ${input.history.successful} successful (${successRate(input)} success rate), average ${input.history.avg_attempts} attempts`
      : "none on record"
  }`;
}

export async function scoreDelivery(
  input: DeliveryInput,
  options?: { ollamaUrl?: string; model?: string }
): Promise<DeliveryScore> {
  const ollamaUrl = options?.ollamaUrl ?? DEFAULT_OLLAMA_URL;
  const model = options?.model ?? DEFAULT_MODEL;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  let response: Response;
  try {
    response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt: buildPrompt(input),
        stream: false,
        format: SCORE_SCHEMA,
        options: { temperature: 0.2 },
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Ollama call timed out after 120s.");
    }
    if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
      throw new Error(
        `Could not reach Ollama at ${ollamaUrl}. Make sure Ollama is running (hint: run \`ollama serve\`).`
      );
    }
    throw new Error(`Network error contacting Ollama: ${message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    throw new Error(`Ollama returned HTTP ${response.status}: ${body}`);
  }

  const data = await response.json();

  let score: DeliveryScore;
  try {
    score = JSON.parse(data.response) as DeliveryScore;
  } catch {
    throw new Error(
      `Failed to parse Ollama response as JSON. Raw response: ${data.response}`
    );
  }

  score.confidence = Math.min(100, Math.max(0, Math.round(score.confidence)));
  score.estimated_attempts = Math.min(5, Math.max(1, score.estimated_attempts));
  return score;
}
