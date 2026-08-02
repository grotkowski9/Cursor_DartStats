/**
 * Generuje demo/demo-profile-snapshot.json z meczów w Supabase (DEMO_CUSTOMER_ID).
 * Uruchamiane po repolish:demo lub osobno: npm run snapshot:demo
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });

import { DEMO_CUSTOMER_ID } from "../lib/constants";
import { getCustomerById } from "../lib/customer";
import {
  buildDemoWeightCohort,
  computeDemoOpponentMatchAverage,
} from "../demo/demo-insights";
import { DEMO_PERSONA } from "../demo/demo-persona";
import { buildDemoProfileSnapshot, withDemoInsights } from "../lib/demo-snapshot";
import { getWeightCohortInsight } from "../lib/insights";
import { getMyMatches } from "../lib/matches";

export async function writeDemoProfileSnapshot(): Promise<number> {
  const matches = await getMyMatches(DEMO_CUSTOMER_ID);
  if (!matches.length) {
    throw new Error("Brak meczów demo w bazie — najpierw seed/repolish.");
  }

  matches.sort((a, b) => a.shareToken.localeCompare(b.shareToken));
  let snapshot = buildDemoProfileSnapshot(matches);

  const customer = await getCustomerById(DEMO_CUSTOMER_ID);
  const myAverage =
    snapshot.byRange.all.playerStats.matches > 0
      ? snapshot.byRange.all.playerStats.average
      : null;

  const bucket = customer?.dartWeightBucket ?? DEMO_PERSONA.dartWeightBucket;
  let weightCohort = myAverage != null
    ? await getWeightCohortInsight({
        customerId: DEMO_CUSTOMER_ID,
        bucket,
        myAverage,
      })
    : null;

  if (!weightCohort?.visible || weightCohort.cohortAverage == null) {
    const oppAvg = computeDemoOpponentMatchAverage(snapshot.matches);
    weightCohort = buildDemoWeightCohort(myAverage!);
    if (oppAvg != null) {
      weightCohort = { ...weightCohort, cohortAverage: oppAvg };
    }
  }

  snapshot = withDemoInsights(snapshot, weightCohort);

  const outPath = join(process.cwd(), "demo", "demo-profile-snapshot.json");
  writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`✓ Snapshot demo → ${outPath} (${snapshot.matchCount} meczów)`);
  return snapshot.matchCount;
}

async function main() {
  await writeDemoProfileSnapshot();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
