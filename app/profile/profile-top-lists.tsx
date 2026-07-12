"use client";

import { BarChart3 } from "lucide-react";
import type { TopThrow } from "@/lib/stats";

type Props = {
  throws: TopThrow[];
  checkouts: TopThrow[];
};

export function ProfileTopLists({ throws, checkouts }: Props) {
  return (
    <>
      {throws.length > 0 && <TopList title="Top 10 najczęstszych podejść" items={throws} kind="throw" />}
      {checkouts.length > 0 && (
        <TopList title="Top 10 najczęstszych zamknięć" items={checkouts} kind="checkout" />
      )}
    </>
  );
}

function TopList({
  title,
  items,
  kind,
}: {
  title: string;
  items: TopThrow[];
  kind: "throw" | "checkout";
}) {
  const max = items[0]?.count ?? 1;
  const iconColor = kind === "checkout" ? "text-accent-to" : "text-accent-from";

  return (
    <section>
      <div className="glass-tile p-5">
        <div className="mb-4">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest">
            <BarChart3 className={`h-3.5 w-3.5 ${iconColor}`} />
            {title}
          </h2>
        </div>
        <ol className="flex flex-col gap-1.5">
          {items.map((t, i) => {
            const pct = (t.count / max) * 100;
            const signal = t.value === 180;
            const hi = t.value >= 140;
            const bigCheckout = kind === "checkout" && t.value >= 100;
            return (
              <li
                key={t.value}
                className="grid grid-cols-[24px_46px_1fr_36px] items-center gap-2 text-xs"
              >
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`text-right font-bold tabular-nums ${
                    signal || bigCheckout
                      ? "text-signal"
                      : hi
                        ? "text-accent-to"
                        : "text-foreground"
                  }`}
                >
                  {t.value}
                </span>
                <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-from/70 to-accent-to/70"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                  ×{t.count}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
