/**
 * Import matches from Lovable CSV export (semicolon-separated).
 * Fetches full leg/visit data directly from N01; does NOT copy any Lovable data.
 *
 * Usage:
 *   npx tsx scripts/import-csv-matches.ts [path-to.csv]
 *   npx tsx scripts/import-csv-matches.ts [path-to.csv] --overwrite   ← re-fetch all from N01
 */
import { readFileSync } from "fs";
import { config } from "dotenv";

config({ path: ".env.local" });

import { SEED_CUSTOMER_ID } from "../lib/constants";
import { ingestAndSave } from "../lib/matches";

const DEFAULT_CSV =
  "/Users/grotkowskipiotr/Downloads/matches-export-2026-07-11_19-01-26.csv";

type CsvRow = {
  tmid: string;
  ttype: string;
  meIndex: 0 | 1;
};

function parseSemicolonCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ";") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(field);
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      field = "";
      if (ch === "\r") i++;
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function toN01Url(ttype: string, tmid: string): string {
  const kind = ttype === "tournament" ? "tournament" : "league";
  return `https://n01darts.com/n01/${kind}/n01_view.html?tmid=${tmid}`;
}

function parseRows(csvPath: string): CsvRow[] {
  const raw = readFileSync(csvPath, "utf8");
  const table = parseSemicolonCsv(raw);
  const header = table[0];
  const tmidIdx = header.indexOf("tmid");
  const ttypeIdx = header.indexOf("ttype");
  const meIdx = header.indexOf("me_index");
  if (tmidIdx < 0 || ttypeIdx < 0 || meIdx < 0) {
    throw new Error("CSV missing required columns: tmid, ttype, me_index");
  }

  const out: CsvRow[] = [];
  const seen = new Set<string>();

  for (const line of table.slice(1)) {
    const tmid = line[tmidIdx]?.trim();
    const ttype = line[ttypeIdx]?.trim();
    const meRaw = line[meIdx]?.trim();
    if (!tmid || !ttype) continue;
    if (seen.has(tmid)) continue;
    seen.add(tmid);

    const meIndex = meRaw === "1" ? 1 : 0;
    out.push({ tmid, ttype, meIndex });
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const overwrite = args.includes("--overwrite");
  const csvPath = args.find((a) => !a.startsWith("--")) ?? DEFAULT_CSV;

  const rows = parseRows(csvPath);
  console.log(`CSV: ${rows.length} unique matches`);
  console.log(`Mode: ${overwrite ? "OVERWRITE (re-fetch all from N01)" : "skip duplicates"}\n`);

  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const { tmid, ttype, meIndex } = rows[i];
    const url = toN01Url(ttype, tmid);
    process.stdout.write(`[${i + 1}/${rows.length}] ${tmid} … `);

    try {
      const result = await ingestAndSave({
        url,
        playerIndex: meIndex,
        overwrite,
        customerId: SEED_CUSTOMER_ID,
      });
      if (result.status === "saved") {
        console.log("✓");
        saved += 1;
      } else if (result.status === "duplicate") {
        console.log("○ skip");
        skipped += 1;
      } else {
        console.log(`! ${result.status}`);
        failed += 1;
      }
    } catch (e) {
      console.log(`✗ ${e instanceof Error ? e.message : String(e)}`);
      failed += 1;
    }

    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\nDone: ${saved} saved/overwritten, ${skipped} skipped, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
