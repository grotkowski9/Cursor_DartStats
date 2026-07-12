/**
 * Build anonymized demo dataset from production DB (first 10 matches).
 * Usage: npm run build:demo
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });

import { DEMO_PERSONA, DEMO_MATCH_COUNT, demoShareToken } from "../demo/demo-persona";
import { getMyMatches } from "../lib/matches";
import type { N01Match, N01Player } from "../lib/n01-parser";

const OPPONENT_POOL = [
  "NOWAK Sławomir / Gliwice",
  "MAZUR Paweł / Tychy",
  "WIŚNIEWSKI Adam / Kobiór",
  "KURPAN Karol / Czerwionka",
  "FRANCUZ Piotr / Kobiór",
  "KAIN Dariusz / Tychy",
  "BRYCHLIK Mateusz / Piasek",
  "SZWARC Jan / Katowice",
  "LIS Tomasz / Chorzów",
  "WÓJCik Michał / Sosnowiec",
];

const TITLE_REPLACEMENTS: [RegExp, string][] = [
 [/GROTKOWSKI|Piotr\/ Katowice/gi, "Kowalski Antoni"],
 [/DARTOWNIA/gi, "Pub Zielona Tarcza"],
 [/PIĄTKOWY/gi, "SOBOTNI"],
];

function isMainPlayer(name: string): boolean {
  const n = name.toUpperCase();
  return (
    n.includes("GROTKOW") ||
    n.includes("GROTEL") ||
    n.includes("GROTEŁ") ||
    n.includes("PIOTR") && n.includes("KATOWICE")
  );
}

function anonymizeTitle(title: string): string {
  let out = title;
  for (const [re, rep] of TITLE_REPLACEMENTS) {
    out = out.replace(re, rep);
  }
  return out;
}

function anonymizePlayer(name: string, oppIndex: number): string {
  if (isMainPlayer(name)) return DEMO_PERSONA.n01Name;
  return OPPONENT_POOL[oppIndex % OPPONENT_POOL.length];
}

function tweakAverage(player: N01Player, delta: number): N01Player {
  const factor = 1 + delta / 100;
  return {
    ...player,
    average: Math.round(player.average * factor * 100) / 100,
    allScore: Math.round(player.allScore * factor),
  };
}

function anonymizeMatch(match: N01Match, index: number): N01Match {
  const oppIdx = index;
  const dayOffset = (index + 3) * 86400 * 7;

  let p0 = { ...match.players[0], name: anonymizePlayer(match.players[0].name, oppIdx) };
  let p1 = { ...match.players[1], name: anonymizePlayer(match.players[1].name, oppIdx + 1) };

  const delta = ((index % 5) - 2) * 0.8;
  if (p0.isMe) p0 = tweakAverage(p0, delta);
  if (p1.isMe) p1 = tweakAverage(p1, delta);

  if (match.playerIndex === 0) {
    p0 = { ...p0, isMe: true };
    p1 = { ...p1, isMe: false };
  } else if (match.playerIndex === 1) {
    p0 = { ...p0, isMe: false };
    p1 = { ...p1, isMe: true };
  }

  return {
    ...match,
    tmid: `demo_tmid_${String(index + 1).padStart(3, "0")}`,
    title: anonymizeTitle(match.title),
    startTime: match.startTime - dayOffset,
    updateTime: match.updateTime - dayOffset,
    players: [p0, p1],
    snapshotPath: `demo/snapshot_${index + 1}.json`,
    htmlSnapshotPath: null,
    shareToken: demoShareToken(index),
    rawPayload: undefined,
  };
}

async function main() {
  console.log("Building demo dataset…\n");
  const all = await getMyMatches();
  if (all.length < DEMO_MATCH_COUNT) {
    throw new Error(`Need at least ${DEMO_MATCH_COUNT} matches in DB, got ${all.length}`);
  }

  const picked = all
    .slice()
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, DEMO_MATCH_COUNT);

  const demo = picked.map((m, i) => anonymizeMatch(m, i));

  const outPath = join(process.cwd(), "demo", "demo-matches.json");
  writeFileSync(outPath, `${JSON.stringify(demo, null, 2)}\n`, "utf8");
  console.log(`✓ Wrote ${demo.length} matches → ${outPath}`);
  console.log(`  Persona: ${DEMO_PERSONA.firstName} „${DEMO_PERSONA.nickname}" ${DEMO_PERSONA.lastName}`);
  console.log(`  Tokens: ${demo.map((m) => m.shareToken).join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
