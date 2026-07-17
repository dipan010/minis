"use client";

import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RiskEvent } from "@/lib/types";
import { CATEGORY_COLORS, RISK_CATEGORIES } from "@/lib/types";

interface RiskTimelineProps {
  events: RiskEvent[];
}

interface Point {
  ts: number;
  severity: number;
  title: string;
  date: string;
  category: RiskEvent["category"];
}

/** Scatter chart plotting risk events by date (x) and severity (y),
 * color-coded by category. */
export default function RiskTimeline({ events }: RiskTimelineProps) {
  const byCategory = RISK_CATEGORIES.map((category) => ({
    category,
    points: events
      .filter((e) => e.category === category)
      .map<Point>((e) => ({
        ts: new Date(e.date).getTime(),
        severity: e.severity,
        title: e.title,
        date: e.date,
        category: e.category,
      })),
  })).filter((g) => g.points.length > 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 16, bottom: 4, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(24,34,51,0.08)" />
          <XAxis
            dataKey="ts"
            type="number"
            domain={["dataMin - 604800000", "dataMax + 604800000"]}
            tickFormatter={(ts: number) =>
              new Date(ts).toLocaleDateString(undefined, { month: "short" })
            }
            tick={{ fontSize: 11, fill: "#61708A" }}
            stroke="rgba(24,34,51,0.2)"
          />
          <YAxis
            dataKey="severity"
            type="number"
            domain={[0, 5.5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 11, fill: "#61708A" }}
            stroke="rgba(24,34,51,0.2)"
            label={{
              value: "severity",
              angle: -90,
              position: "insideLeft",
              offset: 26,
              style: { fontSize: 11, fill: "#61708A" },
            }}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ payload }) => {
              const p = payload?.[0]?.payload as Point | undefined;
              if (!p) return null;
              return (
                <div className="bg-card border border-line rounded-lg shadow-md px-3 py-2 max-w-xs">
                  <p className="text-xs font-medium text-ink leading-snug">{p.title}</p>
                  <p className="text-[11px] text-ink-soft mt-1">
                    {p.date} · {p.category} · severity {p.severity}/5
                  </p>
                </div>
              );
            }}
          />
          {byCategory.map((group) => (
            <Scatter
              key={group.category}
              name={group.category}
              data={group.points}
              fill={CATEGORY_COLORS[group.category]}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
