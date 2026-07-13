"use client";

import Link from "next/link";
import { History } from "lucide-react";
import type { RecentMatch } from "@/lib/stats";

type Props = {
  items: RecentMatch[];
  matchPathPrefix?: string;
};

export function ProfileRecentMatches({ items, matchPathPrefix = "/m/" }: Props) {
  if (items.length === 0) return null;

  const wins = items.filter((i) => i.won === true).length;
  const losses = items.filter((i) => i.won === false).length;

  return (
    <section>
      <div className="glass-tile p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest">
            <History className="h-3.5 w-3.5 text-accent-from" />
            Ostatnie 5 meczów
          </h2>
          <span className="text-[10px] text-muted-foreground">
            {wins}W · {losses}L
          </span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {items.map((it) => (
            <li key={it.shareToken}>
              <Link
                href={`${matchPathPrefix}${it.shareToken}`}
                className="grid grid-cols-[28px_1fr_auto_auto] items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs transition-colors hover:border-accent-from/40 hover:bg-accent-from/5"
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold ${
                    it.won === null
                      ? "bg-white/5 text-muted-foreground"
                      : it.won
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {it.won === null ? "–" : it.won ? "W" : "L"}
                </span>
                <span className="truncate font-medium text-foreground">{it.oppName}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {it.legsMe}–{it.legsOpp}
                </span>
                <span className="font-semibold tabular-nums text-accent-from">
                  {it.average.toFixed(2)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
