import type { ForecastReport } from "./types";
import { callOllamaStructured, type OllamaCallOptions } from "./ollama";

const INSIGHTS_SCHEMA = {
  type: "object",
  properties: {
    insights: { type: "array", minItems: 5, maxItems: 5, items: { type: "string" } },
  },
  required: ["insights"],
};

/** LLM pass: translate the statistical results into 5 business-language
 * insights. Falls back to deterministic insights if Ollama is unreachable
 * so the forecast still returns. */
export async function generateInsights(
  report: Omit<ForecastReport, "insights">,
  options?: OllamaCallOptions
): Promise<string[]> {
  const h = report.historical_summary;
  const inv = report.inventory_recommendations;
  const futurePoints = report.forecast.filter((p) => p.actual === undefined);
  const avgForecast =
    futurePoints.reduce((s, p) => s + p.predicted, 0) / Math.max(1, futurePoints.length);

  const fallback = [
    `Demand trend is ${h.trend} with an average of ${h.avg_daily.toFixed(1)} units/day over ${h.date_range}.`,
    `The ${futurePoints.length}-day forecast averages ${avgForecast.toFixed(1)} units/day.`,
    report.seasonality.length
      ? `Strongest seasonality is ${report.seasonality[0].period} (strength ${report.seasonality[0].strength}), peaking on ${report.seasonality[0].peak_periods.join(", ")}.`
      : "No significant seasonality was detected at weekly, monthly, or quarterly lags.",
    report.anomalies.length
      ? `${report.anomalies.length} anomalies detected — review the ${report.anomalies.filter((a) => a.severity !== "mild").length} moderate/severe ones for supply or promotion causes.`
      : "No demand anomalies exceeded the 2σ threshold.",
    `Set the reorder point at ${inv.reorder_point} units with ${inv.safety_stock} units of safety stock (stockout risk: ${inv.stockout_risk}).`,
  ];

  try {
    const result = await callOllamaStructured<{ insights: string[] }>(
      `You are a demand planning analyst. Given these forecast results, provide exactly 5 actionable insights for the inventory manager. Each 1-2 sentences, concrete, referencing the numbers. Cover: trend, forecast level, seasonality, anomalies, and inventory action.

DATA:
- Product: ${report.product}
- History: ${h.total_records} records over ${h.date_range}; avg ${h.avg_daily.toFixed(1)}/day; trend ${h.trend}; volatility (CV) ${h.volatility}
- Forecast: next ${futurePoints.length} days avg ${avgForecast.toFixed(1)}/day
- Seasonality: ${report.seasonality.length ? report.seasonality.map((s) => `${s.period} strength ${s.strength} peaks ${s.peak_periods.join("/")}`).join("; ") : "none detected"}
- Anomalies: ${report.anomalies.length} total (${report.anomalies.filter((a) => a.severity === "severe").length} severe); examples: ${report.anomalies.slice(0, 3).map((a) => `${a.date} ${a.deviation_pct}%`).join(", ") || "none"}
- Inventory: reorder point ${inv.reorder_point}, safety stock ${inv.safety_stock}, order qty ${inv.suggested_order_quantity}, stockout risk ${inv.stockout_risk}`,
      INSIGHTS_SCHEMA,
      { temperature: 0.3, timeoutMs: 90_000, ...options }
    );
    return result.insights;
  } catch {
    return fallback;
  }
}
