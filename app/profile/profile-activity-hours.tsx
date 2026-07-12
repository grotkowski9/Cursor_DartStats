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
        <div className="space-y-2">
          {hours.map((h) => {
            const barWidth = (h.count / maxCount) * 100;

            return (
              <div key={h.hour} className="grid grid-cols-[52px_1fr_88px] items-center gap-2 sm:gap-3">
                <span className="text-right text-xs font-mono text-zinc-400">{h.label}</span>

                <div className="relative h-5 overflow-hidden rounded bg-white/[0.04]">
                  <div
                    className="absolute left-0 top-0 h-full rounded bg-gradient-to-r from-accent-from/70 to-accent-to/70 transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                  <span className="absolute inset-0 flex items-center pl-2 text-[11px] font-semibold text-white">
                    {h.count} {h.count === 1 ? "mecz" : "meczów"}
                  </span>
                </div>

                <div className="text-right text-xs">
                  <span className="font-bold text-foreground">
                    {Math.round(h.winRate * 100)}%
                  </span>
                  {h.avg > 0 && (
                    <span className="block text-[11px] text-zinc-500">{h.avg.toFixed(1)} avg</span>
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
