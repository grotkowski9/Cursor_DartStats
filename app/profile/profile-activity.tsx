"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
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
      <div className="glass-tile p-5">
        <div className="mb-4">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest">
            <BarChart3 className="h-3.5 w-3.5 text-accent-from" />
            Aktywność — dni tygodnia
          </h2>
        </div>
        <div className="space-y-2">
          {days.map((d) => {
            const barWidth = (d.count / maxCount) * 100;
            const isEmpty = d.count === 0;

            return (
              <div key={d.day} className="grid grid-cols-[36px_1fr_88px] items-center gap-2 sm:gap-3">
                <span className="text-xs font-medium text-zinc-400">{d.label}</span>

                <div className="relative h-5 overflow-hidden rounded bg-white/[0.04]">
                  {!isEmpty && (
                    <div
                      className="absolute left-0 top-0 h-full rounded bg-gradient-to-r from-accent-from/70 to-accent-to/70 transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  )}
                  {!isEmpty && (
                    <span className="absolute inset-0 flex items-center pl-2 text-[11px] font-semibold text-white">
                      {d.count} {d.count === 1 ? "mecz" : "meczów"}
                    </span>
                  )}
                  {isEmpty && (
                    <span className="absolute inset-0 flex items-center pl-2 text-[11px] text-zinc-600">
                      –
                    </span>
                  )}
                </div>

                <div className="text-right text-xs">
                  {!isEmpty ? (
                    <>
                      <span className="font-bold text-foreground">
                        {Math.round(d.winRate * 100)}%
                      </span>
                      {d.avg > 0 && (
                        <span className="block text-[11px] text-zinc-500">{d.avg.toFixed(1)} avg</span>
                      )}
                    </>
                  ) : (
                    <span className="text-zinc-700">–</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
