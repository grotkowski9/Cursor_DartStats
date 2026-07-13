/**
 * Seed demo matches into Supabase (DEMO_CUSTOMER_ID).
 * URLs podawaj wyłącznie w CLI — nie zapisujemy ich w repo.
 *
 *   npm run seed:demo -- --clear https://n01darts.com/... https://n01darts.com/...
 *   npm run seed:demo -- --repolish   (przelicz istniejące mecze demo w bazie)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { DEMO_CUSTOMER_ID } from "../lib/constants";
import { applyDemoDates } from "../lib/demo-dates";
import { fetchDemoMatchFromUrl, polishDemoDataset } from "../lib/demo-import";
import { getMyMatches, saveMatch } from "../lib/matches";
import { getSupabaseAdmin } from "../lib/supabase/admin";
import { writeDemoProfileSnapshot } from "./snapshot-demo";

async function clearDemoMatches(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("matches").delete().eq("customer_id", DEMO_CUSTOMER_ID);
  if (error) throw new Error(`clearDemoMatches: ${error.message}`);
}

async function savePolished(matches: Awaited<ReturnType<typeof getMyMatches>>) {
  const polished = polishDemoDataset(applyDemoDates(matches));
  for (const match of polished) {
    await saveMatch(match, DEMO_CUSTOMER_ID);
  }
  console.log(`\n✓ Zapisano ${polished.length} meczów demo (${DEMO_CUSTOMER_ID}).`);
  await writeDemoProfileSnapshot();
}

async function main() {
  const args = process.argv.slice(2);
  const clear = args.includes("--clear");
  const repolish = args.includes("--repolish");
  const urls = args.filter((a) => a.startsWith("http"));

  if (clear) {
    await clearDemoMatches();
    console.log("✓ Usunięto dotychczasowe mecze demo z bazy.");
  }

  if (repolish) {
    const existing = await getMyMatches(DEMO_CUSTOMER_ID);
    if (!existing.length) {
      console.error("Brak meczów demo w bazie.");
      process.exit(1);
    }
    existing.sort((a, b) => a.shareToken.localeCompare(b.shareToken));
    await savePolished(existing);
    return;
  }

  if (urls.length === 0) {
    if (!clear) {
      console.error("Podaj URL-e N01 jako argumenty (po opcjonalnym --clear).");
      process.exit(1);
    }
    return;
  }

  const fetched = [];
  for (let i = 0; i < urls.length; i++) {
    process.stdout.write(`[${i + 1}/${urls.length}] pobieranie… `);
    fetched.push(await fetchDemoMatchFromUrl(urls[i], i));
    console.log("OK");
  }

  await savePolished(fetched);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
