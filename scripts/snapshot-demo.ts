/**
 * Generuje demo/demo-profile-snapshot.json z meczów w Supabase (DEMO_CUSTOMER_ID).
 * Uruchamiane po repolish:demo lub osobno: npm run snapshot:demo
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });

import { DEMO_CUSTOMER_ID } from "../lib/constants";
import { buildDemoProfileSnapshot } from "../lib/demo-snapshot";
import { getMyMatches } from "../lib/matches";

export async function writeDemoProfileSnapshot(): Promise<number> {
  const matches = await getMyMatches(DEMO_CUSTOMER_ID);
  if (!matches.length) {
    throw new Error("Brak meczów demo w bazie — najpierw seed/repolish.");
  }

  matches.sort((a, b) => a.shareToken.localeCompare(b.shareToken));
  const snapshot = buildDemoProfileSnapshot(matches);
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
