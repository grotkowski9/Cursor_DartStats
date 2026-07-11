"use client";

import { useMemo } from "react";
import { N01Match } from "@/lib/n01-parser";
import { computeDayStats } from "@/lib/stats";

interface Props {
  matches: N01Match[];
}

export default function ProfileActivity({ matches }: Props) {
  const days = useMemo(() => computeDayStats(matches), [matches]);

  const maxCount = Math.max(...days.map((d) => d.count), 1);
  const played = days.filter((d) => d.count > 0);

  if (played.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Aktywność — dni tygodnia
      </h2>
      <div className="bg-zinc-900 rounded-xl p-4">
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const intensity = d.count / maxCount;
            const isEmpty = d.count === 0;

            let barColor = "bg-zinc-700";
            if (!isEmpty) {
              if (d.winRate >= 0.65) barColor = "bg-emerald-500";
              else if (d.winRate >= 0.45) barColor = "bg-yellow-500";
              else barColor = "bg-red-500";
            }

            return (
              <div key={d.day} className="flex flex-col items-center gap-1">
                <span className="text-[11px] text-zinc-500 font-medium">{d.label}</span>

                {/* bar */}
                <div className="relative w-full h-20 bg-zinc-800 rounded-md overflow-hidden flex items-end">
                  {!isEmpty && (
                    <div
                      className={`w-full transition-all ${barColor}`}
                      style={{ height: `${Math.max(intensity * 100, 10)}%`, opacity: 0.85 }}
                    />
                  )}
                </div>

                {/* count */}
                <span className={`text-xs font-semibold ${isEmpty ? "text-zinc-700" : "text-zinc-200"}`}>
                  {d.count > 0 ? d.count : "–"}
                </span>

                {/* win rate */}
                {d.count > 0 && (
                  <span className={`text-[11px] font-medium ${d.winRate >= 0.5 ? "text-emerald-400" : "text-red-400"}`}>
                    {Math.round(d.winRate * 100)}%
                  </span>
                )}

                {/* avg */}
                {d.avg > 0 && (
                  <span className="text-[10px] text-zinc-500">{d.avg.toFixed(1)}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-zinc-800">
          <span className="text-[11px] text-zinc-500">Kolor paska = win rate:</span>
          <span className="flex items-center gap-1 text-[11px] text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> ≥65%
          </span>
          <span className="flex items-center gap-1 text-[11px] text-yellow-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500 inline-block" /> 45–64%
          </span>
          <span className="flex items-center gap-1 text-[11px] text-red-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> &lt;45%
          </span>
        </div>
      </div>
    </section>
  );
}
