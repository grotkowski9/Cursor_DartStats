import { NextResponse } from "next/server";
import { requireAuthCustomerApi } from "@/lib/auth";
import { getMyMatches } from "@/lib/matches";
import { toClientMatches } from "@/lib/match-client";
import { computePlayerStats } from "@/lib/stats";
import {
  computeMaxWinStreak,
  getWeightCohortInsight,
} from "@/lib/insights";

export const dynamic = "force-dynamic";

/**
 * Single profile bootstrap: full matches (legs+visits) + insights.
 * Replaces dual fetch of /api/matches/full + /api/customer/insights.
 */
export async function GET() {
  const auth = await requireAuthCustomerApi();
  if (!auth.ok) return auth.response;

  try {
    const matches = await getMyMatches(auth.customer.customerId);
    const stats = computePlayerStats(matches);
    const maxWinStreak = computeMaxWinStreak(matches);
    const weightCohort = await getWeightCohortInsight({
      customerId: auth.customer.customerId,
      bucket: auth.customer.dartWeightBucket,
      myAverage: stats.matches > 0 ? stats.average : null,
    });

    return NextResponse.json({
      matches: toClientMatches(matches),
      maxWinStreak,
      weightCohort,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Błąd pobierania profilu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
