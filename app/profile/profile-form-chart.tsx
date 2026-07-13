"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { N01Match } from "@/lib/n01-parser";
import { computeFormSeries, computePlayerStats, type FormPoint } from "@/lib/stats";

type Props = {
  matches?: N01Match[];
  formSeries?: FormPoint[];
  overallAverage?: number;
};

type ChartPoint = FormPoint & { index: number };

function formatTooltipDate(startTime: number): string {
  const d = new Date(startTime * 1000);
  const date = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${date} ${time}`;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-card/90 px-3 py-2 text-xs backdrop-blur-xl">
      <p className="mb-1 font-semibold text-foreground">{formatTooltipDate(d.startTime)}</p>
      <p className="mb-1 text-muted-foreground">vs {d.oppName}</p>
      <p className="tabular-nums text-foreground">
        Avg <span className="font-bold text-accent-from">{d.average.toFixed(2)}</span>
      </p>
      {d.first9 !== null && (
        <p className="tabular-nums text-foreground">
          First 9 <span className="font-semibold">{d.first9.toFixed(2)}</span>
        </p>
      )}
      {d.won !== null && (
        <p className={`mt-1 font-semibold ${d.won ? "text-emerald-300" : "text-red-300"}`}>
          {d.won ? "Wygrana" : "Przegrana"}
        </p>
      )}
    </div>
  );
}

export function ProfileFormChart({ matches, formSeries: formSeriesProp, overallAverage }: Props) {
  const data = useMemo(
    () => formSeriesProp ?? (matches ? computeFormSeries(matches) : []),
    [formSeriesProp, matches],
  );
  const chartData = useMemo(
    () => data.map((point, index) => ({ ...point, index })),
    [data],
  );
  const playerStats = useMemo(
    () =>
      overallAverage !== undefined
        ? { average: overallAverage }
        : matches
          ? computePlayerStats(matches)
          : { average: 0 },
    [overallAverage, matches],
  );

  if (chartData.length < 2) return null;

  const avgValues = chartData.map((d) => d.average);
  const overallAvg = playerStats.average;
  const yMin = Math.max(0, Math.floor(Math.min(...avgValues) / 5) * 5 - 5);
  const yMax = Math.min(180, Math.ceil(Math.max(...avgValues) / 5) * 5 + 10);
  const tickStep = Math.max(1, Math.floor(chartData.length / 6));

  return (
    <section>
      <div className="glass-tile p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest">
          Wykres formy
        </h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 8, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="index"
              type="number"
              domain={[0, chartData.length - 1]}
              ticks={chartData
                .filter((_, i) => i === 0 || i === chartData.length - 1 || i % tickStep === 0)
                .map((d) => d.index)}
              tickFormatter={(idx) => chartData[Number(idx)]?.dateLabel ?? ""}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickCount={5}
            />
            <Tooltip content={<CustomTooltip />} shared={false} />
            <ReferenceLine
              y={overallAvg}
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="4 4"
            />
            <Line
              dataKey="first9"
              stroke="rgba(139,107,255,0.4)"
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="average"
              stroke="#5ea0ff"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#5ea0ff", stroke: "#fff", strokeWidth: 1 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-5 border-t-2 border-[#5ea0ff]" />
            3-dart avg
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-5 border-t-2 border-dashed border-[#8b6bff]/60" />
            First 9
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-5 border-t-2 border-dashed border-white/20" />
            Śr. ogólna: {overallAvg.toFixed(1)}
          </span>
        </div>
      </div>
    </section>
  );
}
