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
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const intensity = d.count / maxCount;
            const isEmpty = d.count === 0;

            return (
              <div key={d.day} className="flex flex-col items-center gap-1">
                <span className="text-[11px] text-zinc-500 font-medium">{d.label}</span>

                {/* bar */}
                <div className="relative w-full h-20 bg-white/[0.04] rounded-md overflow-hidden flex items-end">
                  {!isEmpty && (
                    <div
                      className="w-full rounded bg-gradient-to-t from-accent-from/70 to-accent-to/70 transition-all"
                      style={{ height: `${Math.max(intensity * 100, 10)}%` }}
                    />
                  )}
                </div>

                {/* count */}
                <span className={`text-xs font-semibold ${isEmpty ? "text-zinc-700" : "text-zinc-200"}`}>
                  {d.count > 0 ? d.count : "–"}
                </span>

                {/* win rate */}
                {d.count > 0 && (
                  <span className="text-[11px] font-medium text-muted-foreground">
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
      </div>
    </section>
  );
}
