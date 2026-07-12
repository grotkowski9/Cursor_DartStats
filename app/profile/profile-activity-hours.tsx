"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";
import { N01Match } from "@/lib/n01-parser";
import { computeHourStats } from "@/lib/stats";

interface Props {
  matches: N01Match[];
}

export default function ProfileActivityHours({ matches }: Props) {
  const hours = useMemo(() => computeHourStats(matches), [matches]);

  const maxCount = Math.max(...hours.map((h) => h.count), 1);

  if (hours.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="glass-tile p-5">
        <div className="mb-4">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest">
            <Clock className="h-3.5 w-3.5 text-accent-from" />
            Aktywność — godziny
          </h2>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(hours.length, 12)}, 1fr)` }}>
          {hours.map((h) => {
            const intensity = h.count / maxCount;

            return (
              <div key={h.hour} className="flex flex-col items-center gap-1">
                <span className="text-[11px] text-zinc-500 font-medium">{h.label}</span>

                {/* bar */}
                <div className="relative w-full h-20 bg-white/[0.04] rounded-md overflow-hidden flex items-end">
                  <div
                    className="w-full rounded bg-gradient-to-t from-accent-from/70 to-accent-to/70 transition-all"
                    style={{ height: `${Math.max(intensity * 100, 10)}%` }}
                  />
                </div>

                {/* count */}
                <span className="text-xs font-semibold text-zinc-200">
                  {h.count}
                </span>

                {/* win rate */}
                {h.count > 0 && (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {Math.round(h.winRate * 100)}%
                  </span>
                )}

                {/* avg */}
                {h.avg > 0 && (
                  <span className="text-[10px] text-zinc-500">{h.avg.toFixed(1)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
