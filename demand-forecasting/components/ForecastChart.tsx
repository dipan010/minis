"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastPoint } from "@/lib/types";

interface ForecastChartProps {
  points: ForecastPoint[];
}

/** Composed chart: solid actual line, dashed forecast line, shaded 80%
 * confidence band, red anomaly dots. */
export default function ForecastChart({ points }: ForecastChartProps) {
  const data = points.map((p) => ({
    ...p,
    // recharts area between bounds: render band as [lower, upper] via stacked trick
    band: [p.lower_bound, p.upper_bound] as [number, number],
    anomaly: p.is_anomaly ? p.actual : undefined,
    // split actual vs predicted-only so the forecast renders dashed
    predictedFuture: p.actual === undefined ? p.predicted : undefined,
    predictedHistory: p.actual !== undefined ? p.predicted : undefined,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,42,65,0.08)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#64748B" }}
            stroke="rgba(27,42,65,0.2)"
            minTickGap={40}
          />
          <YAxis tick={{ fontSize: 10, fill: "#64748B" }} stroke="rgba(27,42,65,0.2)" />
          <Tooltip
            contentStyle={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: unknown, name: string) => {
              if (name === "band") return null;
              const labels: Record<string, string> = {
                actual: "Actual",
                predictedHistory: "Fitted",
                predictedFuture: "Forecast",
                anomaly: "Anomaly",
              };
              return [Array.isArray(value) ? value.join("–") : String(value), labels[name] ?? name];
            }}
          />
          <Area
            dataKey="band"
            stroke="none"
            fill="#1D4ED8"
            fillOpacity={0.08}
            isAnimationActive={false}
          />
          <Line
            dataKey="actual"
            stroke="#1D4ED8"
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="predictedHistory"
            stroke="#94A3B8"
            strokeWidth={1}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="predictedFuture"
            stroke="#1D4ED8"
            strokeWidth={1.8}
            strokeDasharray="6 4"
            dot={false}
            isAnimationActive={false}
          />
          <Scatter dataKey="anomaly" fill="#B91C1C" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
