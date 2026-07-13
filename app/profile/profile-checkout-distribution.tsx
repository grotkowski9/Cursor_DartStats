"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { N01Match } from "@/lib/n01-parser";
import { computeCheckoutDistribution, type CheckoutBucket } from "@/lib/stats";

interface Props {
  matches?: N01Match[];
  checkoutBuckets?: CheckoutBucket[];
}

export default function ProfileCheckoutDistribution({
  matches = [],
  checkoutBuckets: bucketsProp,
}: Props) {
  const buckets = useMemo(
    () => bucketsProp ?? computeCheckoutDistribution(matches),
    [bucketsProp, matches],
  );

  const maxAttempts = Math.max(...buckets.map((b) => b.attempts), 1);
  const hasData = buckets.some((b) => b.attempts > 0);

  if (!hasData) return null;

  return (
    <section>
      <div className="glass-tile p-5">
        <div className="mb-4">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest">
            <BarChart3 className="h-3.5 w-3.5 text-accent-to" />
            Histogram zamknięć
          </h2>
        </div>
        <div className="space-y-2">
        {buckets.map((b) => {
          const barWidth = (b.attempts / maxAttempts) * 100;

          return (
            <div key={b.range} className="grid grid-cols-[56px_1fr_80px] items-center gap-3">
              {/* range label */}
              <span className="text-xs text-zinc-400 text-right font-mono">{b.range}</span>

              {/* bar */}
              <div className="relative h-5 bg-white/[0.04] rounded overflow-hidden">
                {b.attempts > 0 && (
                  <div
                    className="absolute left-0 top-0 h-full rounded transition-all bg-gradient-to-r from-accent-from/70 to-accent-to/70"
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
                  <span className="text-xs font-bold text-foreground">
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
        </div>
      </div>
    </section>
  );
}
