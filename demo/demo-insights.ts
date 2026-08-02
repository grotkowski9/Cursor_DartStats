import type { WeightCohortInsight } from "@/lib/insights";
import { DEMO_PERSONA } from "./demo-persona";

/**
 * Kohorta wagowa profilu demo — fallback gdy w bazie <5 peers z tą wagą.
 * cohortAverage = średnia match-average przeciwników w meczach demo (npm run snapshot:demo).
 * Regeneruj snapshot po zmianie meczów demo.
 */
export const DEMO_WEIGHT_COHORT_BASE = {
  bucket: DEMO_PERSONA.dartWeightBucket,
  peerCount: 8,
  cohortAverage: 71.76,
  visible: true,
} as const;

export function buildDemoWeightCohort(myAverage: number): WeightCohortInsight {
  return {
    ...DEMO_WEIGHT_COHORT_BASE,
    myAverage,
  };
}

/**
 * Średnia match-average przeciwników w meczach demo (do aktualizacji cohortAverage w seed).
 */
export function computeDemoOpponentMatchAverage(
  matches: { playerIndex: number | null; players: { average?: number }[] }[],
): number | null {
  let sum = 0;
  let n = 0;
  for (const m of matches) {
    if (m.playerIndex === null) continue;
    const oppIdx = m.playerIndex === 0 ? 1 : 0;
    const avg = m.players[oppIdx]?.average;
    if (typeof avg === "number" && Number.isFinite(avg)) {
      sum += avg;
      n += 1;
    }
  }
  if (n === 0) return null;
  return Math.round((sum / n) * 100) / 100;
}
