import type { N01Match } from "@/lib/n01-parser";
import { computeMatchStats } from "@/lib/stats";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Min peers with same dart weight before showing cohort avg (1.1.10.23.2). */
export const WEIGHT_COHORT_MIN_N = 5;

/** Longest consecutive match wins (chronological). */
export function computeMaxWinStreak(matches: N01Match[]): number {
  const ordered = matches
    .slice()
    .sort((a, b) => a.startTime - b.startTime)
    .map((m) => computeMatchStats(m).won);

  let best = 0;
  let cur = 0;
  for (const won of ordered) {
    if (won === true) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

export type WeightCohortInsight = {
  bucket: string;
  peerCount: number;
  myAverage: number | null;
  cohortAverage: number | null;
  visible: boolean;
};

export async function getWeightCohortInsight(input: {
  customerId: string;
  bucket: string | null;
  myAverage: number | null;
}): Promise<WeightCohortInsight | null> {
  if (!input.bucket) return null;

  const supabase = getSupabaseAdmin();
  const { data: peers, error } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("dart_weight_bucket", input.bucket)
    .eq("profile_stats_visible", true);

  if (error) throw new Error(`weight cohort: ${error.message}`);

  const peerIds = (peers ?? []).map((p) => p.customer_id as string);
  const peerCount = peerIds.length;

  if (peerCount < WEIGHT_COHORT_MIN_N) {
    return {
      bucket: input.bucket,
      peerCount,
      myAverage: input.myAverage,
      cohortAverage: null,
      visible: false,
    };
  }

  const { data: matchRows, error: matchErr } = await supabase
    .from("matches")
    .select("customer_id, player_average")
    .in("customer_id", peerIds);

  if (matchErr) throw new Error(`weight cohort matches: ${matchErr.message}`);

  const sums = new Map<string, { total: number; n: number }>();
  for (const row of matchRows ?? []) {
    const avg = Number(row.player_average);
    if (!Number.isFinite(avg)) continue;
    const id = row.customer_id as string;
    const prev = sums.get(id) ?? { total: 0, n: 0 };
    prev.total += avg;
    prev.n += 1;
    sums.set(id, prev);
  }

  const avgs: number[] = [];
  for (const { total, n } of sums.values()) {
    if (n > 0) avgs.push(total / n);
  }

  if (avgs.length < WEIGHT_COHORT_MIN_N) {
    return {
      bucket: input.bucket,
      peerCount: avgs.length,
      myAverage: input.myAverage,
      cohortAverage: null,
      visible: false,
    };
  }

  const cohortAverage =
    Math.round((avgs.reduce((s, x) => s + x, 0) / avgs.length) * 100) / 100;

  return {
    bucket: input.bucket,
    peerCount: avgs.length,
    myAverage: input.myAverage,
    cohortAverage,
    visible: true,
  };
}
