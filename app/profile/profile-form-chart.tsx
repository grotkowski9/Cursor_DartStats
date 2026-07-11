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
import { computeFormSeries, type FormPoint } from "@/lib/stats";

type Props = {
  matches: N01Match[];
};

function WinDot({
  cx,
  cy,
  payload,
}: {
  cx?: number;
  cy?: number;
  payload?: FormPoint;
}) {
  if (cx === undefined || cy === undefined || !payload) return null;
  const color =
    payload.won === true ? "#10b981" : payload.won === false ? "#ef4444" : "#6b7280";
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="none" />;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: FormPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const resultColor =
    d.won === true ? "text-emerald-400" : d.won === false ? "text-red-400" : "text-muted-foreground";
  const resultText = d.won === true ? "Win" : d.won === false ? "Loss" : "—";
  return (
    <div className="rounded-xl border border-white/10 bg-card/90 px-3 py-2 text-xs backdrop-blur-xl">
      <p className="mb-1 font-semibold text-muted-foreground">{d.dateLabel}</p>
      <p className="tabular-nums text-foreground">
        Avg <span className="font-bold text-accent-from">{d.average.toFixed(2)}</span>
      </p>
      {d.first9 !== null && (
        <p className="tabular-nums text-foreground">
          First 9 <span className="font-semibold">{d.first9.toFixed(2)}</span>
        </p>
      )}
      <p className={`font-semibold ${resultColor}`}>{resultText}</p>
    </div>
  );
}

export function ProfileFormChart({ matches }: Props) {
  const data = useMemo(() => computeFormSeries(matches), [matches]);

  if (data.length < 2) return null;

  const avgValues = data.map((d) => d.average);
  const overallAvg = avgValues.reduce((s, v) => s + v, 0) / avgValues.length;
  const yMin = Math.max(0, Math.floor(Math.min(...avgValues) / 5) * 5 - 5);
  const yMax = Math.min(180, Math.ceil(Math.max(...avgValues) / 5) * 5 + 10);

  return (
    <section>
      <div className="glass-tile p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest">
          Wykres formy
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickCount={5}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={overallAvg}
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="4 4"
              label={{
                value: `avg ${overallAvg.toFixed(1)}`,
                fill: "rgba(255,255,255,0.3)",
                fontSize: 9,
                position: "insideTopLeft",
              }}
            />
            {/* First 9 — faint secondary line */}
            <Line
              dataKey="first9"
              stroke="rgba(139,107,255,0.4)"
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              connectNulls={false}
            />
            {/* Main average line */}
            <Line
              dataKey="average"
              stroke="#5ea0ff"
              strokeWidth={2}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              dot={(props: any) => (
                <WinDot key={`dot-${props.payload?.shareToken}`} cx={props.cx} cy={props.cy} payload={props.payload} />
              )}
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-2 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            Win
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
            Loss
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-5 border-t-2 border-[#5ea0ff]" />
            3-dart avg
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-5 border-t-2 border-dashed border-[#8b6bff]/60" />
            First 9
          </span>
        </div>
      </div>
    </section>
  );
}
