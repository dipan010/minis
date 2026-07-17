"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = { fontSize: 10, fill: "#7C8BA1" };
const GRID = "rgba(124,139,161,0.12)";
const TOOLTIP_STYLE = {
  background: "#0E1219",
  border: "1px solid #1E2836",
  borderRadius: 8,
  fontSize: 12,
} as const;

interface LiveChartProps {
  kind: "bar" | "line";
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  color: string;
  yLabel?: string;
}

/** Thin recharts wrapper for the dashboard's live-updating charts — parent
 * state updates drive re-renders. */
export default function LiveChart({ kind, data, xKey, yKey, color }: LiveChartProps) {
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {kind === "bar" ? (
          <BarChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -26 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey={xKey} tick={AXIS} stroke={GRID} />
            <YAxis allowDecimals={false} tick={AXIS} stroke={GRID} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(124,139,161,0.08)" }} />
            <Bar dataKey={yKey} fill={color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -26 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey={xKey} tick={AXIS} stroke={GRID} />
            <YAxis tick={AXIS} stroke={GRID} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
