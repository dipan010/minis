import Papa from "papaparse";
import { mean, std } from "mathjs";
import type {
  AnomalyEvent,
  ForecastPoint,
  InventoryRecommendation,
  SalesRecord,
  SeasonalComponent,
  SeasonPeriod,
} from "./types";

// ─── CSV parsing ─────────────────────────────────────────────────────────────

const DATE_KEYS = ["date", "day", "order_date", "month"];
const QTY_KEYS = ["quantity", "qty", "units", "unit_sales", "sales", "mrr", "volume"];
const REVENUE_KEYS = ["revenue", "amount", "total", "sales_usd", "mrr"];
const PRODUCT_KEYS = ["product", "sku", "item", "product_name"];
const REGION_KEYS = ["region", "store", "location"];

function findColumn(headers: string[], candidates: string[]): string | undefined {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const candidate of candidates) {
    const idx = lower.indexOf(candidate);
    if (idx !== -1) return headers[idx];
  }
  // fuzzy: header containing the candidate
  for (const candidate of candidates) {
    const idx = lower.findIndex((h) => h.includes(candidate));
    if (idx !== -1) return headers[idx];
  }
  return undefined;
}

function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim();
  // handle yyyy-mm, dd/mm/yyyy-ish, and ISO
  const parsed = new Date(trimmed.length === 7 ? `${trimmed}-01` : trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/** Auto-detecting CSV parser: needs at least a date column and a quantity
 * column; product/revenue/region are optional. */
export function parseCSV(text: string): SalesRecord[] {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(`CSV parse failed: ${parsed.errors[0].message}`);
  }

  const headers = parsed.meta.fields ?? [];
  const dateCol = findColumn(headers, DATE_KEYS);
  const qtyCol = findColumn(headers, QTY_KEYS);
  if (!dateCol || !qtyCol) {
    throw new Error(
      `CSV must contain a date column (${DATE_KEYS.join("/")}) and a quantity column (${QTY_KEYS.join("/")}). Found: ${headers.join(", ")}`
    );
  }
  const revenueCol = findColumn(headers, REVENUE_KEYS);
  const productCol = findColumn(headers, PRODUCT_KEYS);
  const regionCol = findColumn(headers, REGION_KEYS);

  const records: SalesRecord[] = [];
  for (const row of parsed.data) {
    const date = normalizeDate(row[dateCol] ?? "");
    const quantity = Number(String(row[qtyCol] ?? "").replace(/[,$]/g, ""));
    if (!date || !Number.isFinite(quantity)) continue;
    records.push({
      date,
      product: productCol ? row[productCol] || "All products" : "All products",
      quantity,
      revenue: revenueCol
        ? Number(String(row[revenueCol] ?? "0").replace(/[,$]/g, "")) || 0
        : 0,
      region: regionCol ? row[regionCol] || undefined : undefined,
    });
  }

  if (records.length < 14) {
    throw new Error(`Need at least 14 valid rows to forecast; parsed ${records.length}.`);
  }
  return records.sort((a, b) => a.date.localeCompare(b.date));
}

/** Aggregate records to one total-quantity point per date. */
export function aggregateDaily(records: SalesRecord[]): { dates: string[]; values: number[] } {
  const byDate = new Map<string, number>();
  for (const r of records) {
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.quantity);
  }
  const dates = [...byDate.keys()].sort();
  return { dates, values: dates.map((d) => byDate.get(d)!) };
}

// ─── Core statistics ─────────────────────────────────────────────────────────

export function movingAverage(data: number[], window: number): number[] {
  return data.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export function exponentialSmoothing(data: number[], alpha: number): number[] {
  const out: number[] = [];
  let level = data[0];
  for (const value of data) {
    level = alpha * value + (1 - alpha) * level;
    out.push(level);
  }
  return out;
}

export function detectTrend(data: number[]): { slope: number; direction: "growing" | "stable" | "declining" } {
  const n = data.length;
  const xMean = (n - 1) / 2;
  const yMean = Number(mean(data));
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (data[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  // relative slope over the whole window vs the mean level
  const relative = yMean === 0 ? 0 : (slope * n) / yMean;
  const direction = relative > 0.1 ? "growing" : relative < -0.1 ? "declining" : "stable";
  return { slope, direction };
}

function autocorrelation(data: number[], lag: number): number {
  const n = data.length;
  if (lag >= n - 2) return 0;
  const m = Number(mean(data));
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) den += (data[i] - m) ** 2;
  for (let i = 0; i < n - lag; i++) num += (data[i] - m) * (data[i + lag] - m);
  return den === 0 ? 0 : num / den;
}

const PERIOD_LAGS: { period: SeasonPeriod; lag: number; minPoints: number }[] = [
  { period: "weekly", lag: 7, minPoints: 21 },
  { period: "monthly", lag: 30, minPoints: 90 },
  { period: "quarterly", lag: 91, minPoints: 273 },
  { period: "yearly", lag: 365, minPoints: 730 },
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Autocorrelation-based seasonality detection at weekly/monthly/quarterly/
 * yearly lags, with peak-period labeling for significant components. */
export function detectSeasonality(data: number[], dates: string[]): SeasonalComponent[] {
  const components: SeasonalComponent[] = [];

  for (const { period, lag, minPoints } of PERIOD_LAGS) {
    if (data.length < minPoints) continue;
    const strength = autocorrelation(data, lag);
    if (strength < 0.25) continue;

    // find peak buckets
    const buckets = new Map<string, { sum: number; count: number }>();
    for (let i = 0; i < data.length; i++) {
      const d = new Date(dates[i]);
      let key: string;
      if (period === "weekly") key = WEEKDAYS[d.getUTCDay()];
      else if (period === "monthly") key = `Day ${d.getUTCDate()}`;
      else if (period === "quarterly") key = `Month ${(d.getUTCMonth() % 3) + 1} of quarter`;
      else key = MONTHS[d.getUTCMonth()];
      const b = buckets.get(key) ?? { sum: 0, count: 0 };
      b.sum += data[i];
      b.count += 1;
      buckets.set(key, b);
    }
    const peaks = [...buckets.entries()]
      .map(([k, b]) => ({ key: k, avg: b.sum / b.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, period === "weekly" ? 2 : 3)
      .map((p) => p.key);

    components.push({ period, strength: Number(strength.toFixed(2)), peak_periods: peaks });
  }

  return components.sort((a, b) => b.strength - a.strength);
}

/** Flag points where actual deviates >2σ from the smoothed prediction. */
export function detectAnomalies(
  data: number[],
  predicted: number[],
  dates: string[]
): AnomalyEvent[] {
  const residuals = data.map((v, i) => v - predicted[i]);
  const sigma = Number(std(residuals, "unbiased")) || 1;

  const anomalies: AnomalyEvent[] = [];
  for (let i = 0; i < data.length; i++) {
    const z = Math.abs(residuals[i]) / sigma;
    if (z <= 2) continue;
    const deviation = predicted[i] === 0 ? 0 : ((data[i] - predicted[i]) / predicted[i]) * 100;
    anomalies.push({
      date: dates[i],
      actual: Number(data[i].toFixed(1)),
      expected: Number(predicted[i].toFixed(1)),
      deviation_pct: Number(deviation.toFixed(1)),
      severity: z > 4 ? "severe" : z > 3 ? "moderate" : "mild",
      possible_cause:
        deviation > 0
          ? "Demand spike — promotion, holiday, or bulk order"
          : "Demand drop — stockout, closure, or supply disruption",
    });
  }
  return anomalies;
}

/** Multiplicative seasonal indices for a given cycle length. */
function seasonalIndices(data: number[], cycle: number): number[] {
  const base = movingAverage(data, Math.min(cycle, data.length));
  const buckets: number[][] = Array.from({ length: cycle }, () => []);
  for (let i = 0; i < data.length; i++) {
    if (base[i] > 0) buckets[i % cycle].push(data[i] / base[i]);
  }
  return buckets.map((b) => (b.length ? b.reduce((x, y) => x + y, 0) / b.length : 1));
}

/** Simple exponential smoothing + linear trend + optional weekly seasonal
 * adjustment, with 80% confidence bounds from residual σ (widening with
 * horizon). Returns history (with anomaly flags) + future points. */
export function forecast(
  data: number[],
  dates: string[],
  horizon: number
): { points: ForecastPoint[]; anomalies: AnomalyEvent[] } {
  const alpha = 0.3;
  const smoothed = exponentialSmoothing(data, alpha);
  const { slope } = detectTrend(data);

  const weekly = data.length >= 21 && autocorrelation(data, 7) >= 0.25;
  const indices = weekly ? seasonalIndices(data, 7) : null;

  const anomalies = detectAnomalies(data, smoothed, dates);
  const anomalyDates = new Set(anomalies.map((a) => a.date));

  const residuals = data.map((v, i) => v - smoothed[i]);
  const sigma = Number(std(residuals, "unbiased")) || 1;
  const z80 = 1.28;

  const points: ForecastPoint[] = data.map((actual, i) => ({
    date: dates[i],
    actual: Number(actual.toFixed(1)),
    predicted: Number(smoothed[i].toFixed(1)),
    lower_bound: Number((smoothed[i] - z80 * sigma).toFixed(1)),
    upper_bound: Number((smoothed[i] + z80 * sigma).toFixed(1)),
    is_anomaly: anomalyDates.has(dates[i]),
  }));

  const lastLevel = smoothed[smoothed.length - 1];
  const lastDate = new Date(dates[dates.length - 1]);
  const startIdx = data.length;

  for (let h = 1; h <= horizon; h++) {
    const d = new Date(lastDate.getTime() + h * 86400_000);
    const seasonal = indices ? indices[(startIdx + h - 1) % 7] : 1;
    const level = Math.max(0, (lastLevel + slope * h) * seasonal);
    const spread = z80 * sigma * Math.sqrt(1 + h / horizon); // widen with horizon
    points.push({
      date: d.toISOString().slice(0, 10),
      predicted: Number(level.toFixed(1)),
      lower_bound: Number(Math.max(0, level - spread).toFixed(1)),
      upper_bound: Number((level + spread).toFixed(1)),
      is_anomaly: false,
    });
  }

  return { points, anomalies };
}

/** Classic reorder-point inventory math over the forecast horizon. */
export function calculateInventory(
  forecastPoints: ForecastPoint[],
  leadTimeDays: number
): InventoryRecommendation {
  const future = forecastPoints.filter((p) => p.actual === undefined);
  if (future.length === 0) {
    return { reorder_point: 0, safety_stock: 0, suggested_order_quantity: 0, stockout_risk: "low" };
  }

  const avgDaily = Number(mean(future.map((p) => p.predicted)));
  const demandStd = Number(std(future.map((p) => p.predicted), "unbiased")) || avgDaily * 0.1;
  const z95 = 1.65;

  const safetyStock = Math.ceil(z95 * demandStd * Math.sqrt(leadTimeDays));
  const reorderPoint = Math.ceil(avgDaily * leadTimeDays + safetyStock);
  const orderQty = Math.ceil(avgDaily * Math.max(14, leadTimeDays * 2));

  const cv = avgDaily === 0 ? 0 : demandStd / avgDaily;
  const stockoutRisk = cv > 0.5 || leadTimeDays > 21 ? "high" : cv > 0.25 ? "medium" : "low";

  return {
    reorder_point: reorderPoint,
    safety_stock: safetyStock,
    suggested_order_quantity: orderQty,
    stockout_risk: stockoutRisk,
  };
}
