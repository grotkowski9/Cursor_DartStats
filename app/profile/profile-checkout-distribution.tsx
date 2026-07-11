"use client";

import { useMemo } from "react";
import { N01Match } from "@/lib/n01-parser";
import { computeCheckoutDistribution } from "@/lib/stats";

interface Props {
  matches: N01Match[];
}

export default function ProfileCheckoutDistribution({ matches }: Props) {
  const buckets = useMemo(() => computeCheckoutDistribution(matches), [matches]);

  const maxAttempts = Math.max(...buckets.map((b) => b.attempts), 1);
  const hasData = buckets.some((b) => b.attempts > 0);

  if (!hasData) return null;

  return (
    <section>
      <h2 className="text-base font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Histogram zamknięć
      </h2>
      <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
        {buckets.map((b) => {
          const barWidth = (b.attempts / maxAttempts) * 100;
          const rateColor =
            b.rate >= 0.5
              ? "bg-emerald-500"
              : b.rate >= 0.25
              ? "bg-yellow-500"
              : b.attempts > 0
              ? "bg-red-500"
              : "bg-zinc-700";
          const rateText =
            b.rate >= 0.5
              ? "text-emerald-400"
              : b.rate >= 0.25
              ? "text-yellow-400"
              : b.attempts > 0
              ? "text-red-400"
              : "text-zinc-600";

          return (
            <div key={b.range} className="grid grid-cols-[56px_1fr_80px] items-center gap-3">
              {/* range label */}
              <span className="text-xs text-zinc-400 text-right font-mono">{b.range}</span>

              {/* bar */}
              <div className="relative h-5 bg-zinc-800 rounded overflow-hidden">
                {b.attempts > 0 && (
                  <div
                    className={`absolute left-0 top-0 h-full rounded transition-all ${rateColor} opacity-80`}
                    style={{ width: `${barWidth}%` }}
                  />
                )}
                {/* attempts count overlay */}
                {b.attempts > 0 && (
                  <span className="absolute inset-0 flex items-center pl-2 text-[11px] font-semibold text-white mix-blend-normal">
                    {b.attempts} prób
                  </span>
                )}
                {b.attempts === 0 && (
                  <span className="absolute inset-0 flex items-center pl-2 text-[11px] text-zinc-600">–</span>
                )}
              </div>

              {/* rate */}
              <div className="text-right">
                {b.attempts > 0 ? (
                  <span className={`text-xs font-bold ${rateText}`}>
                    {Math.round(b.rate * 100)}%{" "}
                    <span className="text-[11px] text-zinc-500 font-normal">
                      ({b.hits}/{b.attempts})
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-zinc-700">–</span>
                )}
              </div>
            </div>
          );
        })}

        {/* legend */}
        <div className="flex items-center gap-4 pt-3 mt-1 border-t border-zinc-800">
          <span className="text-[11px] text-zinc-500">Skuteczność zamknięcia:</span>
          <span className="flex items-center gap-1 text-[11px] text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> ≥50%
          </span>
          <span className="flex items-center gap-1 text-[11px] text-yellow-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500 inline-block" /> 25–49%
          </span>
          <span className="flex items-center gap-1 text-[11px] text-red-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> &lt;25%
          </span>
        </div>
      </div>
    </section>
  );
}
