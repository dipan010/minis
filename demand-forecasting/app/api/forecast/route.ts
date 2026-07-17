import { NextRequest, NextResponse } from "next/server";
import { mean, std } from "mathjs";
import {
  aggregateDaily,
  calculateInventory,
  detectSeasonality,
  detectTrend,
  forecast,
  parseCSV,
} from "@/lib/forecasting";
import { generateInsights } from "@/lib/insightGenerator";
import type { ForecastReport } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  let csvText = "";
  let horizon = 30;
  let leadTime = 7;

  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const fd = await request.formData();
      const file = fd.get("file");
      if (file instanceof File && file.size > 0) {
        csvText = await file.text();
      } else {
        csvText = (fd.get("csvText") as string | null) ?? "";
      }
      horizon = Number(fd.get("horizon") ?? 30);
      leadTime = Number(fd.get("leadTime") ?? 7);
    } else {
      const body = await request.json();
      csvText = body.csvText ?? "";
      horizon = Number(body.horizon ?? 30);
      leadTime = Number(body.leadTime ?? 7);
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!csvText.trim()) {
    return NextResponse.json(
      { error: "Provide CSV data as a file upload or csvText." },
      { status: 400 }
    );
  }
  horizon = Math.min(90, Math.max(7, Math.round(horizon) || 30));
  leadTime = Math.min(60, Math.max(1, Math.round(leadTime) || 7));

  try {
    const records = parseCSV(csvText);
    const { dates, values } = aggregateDaily(records);

    const { points, anomalies } = forecast(values, dates, horizon);
    const seasonality = detectSeasonality(values, dates);
    const inventory = calculateInventory(points, leadTime);
    const { direction } = detectTrend(values);

    const avg = Number(mean(values));
    const volatility = avg === 0 ? 0 : Number((Number(std(values, "unbiased")) / avg).toFixed(2));

    const products = [...new Set(records.map((r) => r.product))];
    const partial: Omit<ForecastReport, "insights"> = {
      product: products.length === 1 ? products[0] : `${products.length} products (aggregated)`,
      historical_summary: {
        total_records: records.length,
        date_range: `${dates[0]} → ${dates[dates.length - 1]}`,
        avg_daily: Number(avg.toFixed(1)),
        trend: direction,
        volatility,
      },
      forecast: points,
      seasonality,
      anomalies,
      inventory_recommendations: inventory,
    };

    const insights = await generateInsights(partial);
    const report: ForecastReport = { ...partial, insights };
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
