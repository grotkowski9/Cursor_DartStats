"use client";

import { useEffect, useState } from "react";
import { formatWeightBucketLabel } from "@/lib/about-options";
import type { WeightCohortInsight } from "@/lib/insights";

type InsightsPayload = {
  maxWinStreak: number;
  weightCohort: WeightCohortInsight | null;
};

export function ProfileInsights() {
  const [data, setData] = useState<InsightsPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/customer/insights");
        if (!res.ok) return;
        const json = (await res.json()) as InsightsPayload;
        if (!cancelled) setData(json);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  const cohort = data.weightCohort;
  const showCohort = cohort?.visible && cohort.cohortAverage != null;

  if (data.maxWinStreak <= 0 && !showCohort) return null;

  return (
    <section className="grid gap-3 sm:grid-cols-2">
      {data.maxWinStreak > 0 ? (
        <div className="glass-tile p-4" data-tour="insight-streak">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Top passa W
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-accent-gradient">
            {data.maxWinStreak}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Najdłuższa seria wygranych meczów z rzędu
          </p>
        </div>
      ) : null}

      {showCohort && cohort ? (
        <div className="glass-tile p-4" data-tour="insight-weight">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Avg vs waga {formatWeightBucketLabel(cohort.bucket)}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            <span className="text-accent-gradient">
              {cohort.myAverage != null ? cohort.myAverage.toFixed(1) : "—"}
            </span>
            <span className="mx-1 text-muted-foreground">/</span>
            <span className="text-foreground/80">{cohort.cohortAverage!.toFixed(1)}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ty vs średnia {cohort.peerCount} graczy z tą samą wagą lotek
          </p>
        </div>
      ) : null}
    </section>
  );
}
