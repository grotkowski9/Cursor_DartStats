/**
 * Seed 3 test matches from SEED_URLS (idempotent — skips duplicates).
 * Requires .env.local with Supabase keys and applied migration customer_name_fields.
 *
 * Usage: npm run seed
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { SEED_URLS } from "../lib/constants";
import { ingestAndSave } from "../lib/matches";

async function main() {
  console.log("Seeding matches from SEED_URLS…\n");

  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for (const url of SEED_URLS) {
    process.stdout.write(`→ ${url}\n  `);
    try {
      const result = await ingestAndSave({ url });
      if (result.status === "saved") {
        console.log(`✓ saved: ${result.match.title}`);
        saved += 1;
      } else if (result.status === "duplicate") {
        console.log(`○ already in DB (share: ${result.shareToken})`);
        skipped += 1;
      } else if (result.status === "needs_identity_confirmation") {
        console.log(`! needs identity — run import from /profile and pick player`);
        failed += 1;
      } else {
        console.log(`? ${result.status}`);
        failed += 1;
      }
    } catch (e) {
      console.log(`✗ ${e instanceof Error ? e.message : String(e)}`);
      failed += 1;
    }
    console.log();
  }

  console.log(`Done: ${saved} saved, ${skipped} skipped, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
