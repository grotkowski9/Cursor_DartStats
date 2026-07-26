"use client";

import { formatWeightBucketLabel } from "@/lib/about-options";
import type { WeightCohortInsight } from "@/lib/insights";

type Props = {
  weightCohort: WeightCohortInsight | null;
};

export function ProfileInsights({ weightCohort }: Props) {
  const cohort = weightCohort;
  const showCohort = cohort?.visible && cohort.cohortAverage != null;

  if (!showCohort || !cohort) return null;

  return (
    <section className="grid gap-3 sm:grid-cols-2">
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
    </section>
  );
}
