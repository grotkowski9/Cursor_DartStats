import { describe, expect, it } from "vitest";
import { parseN01Payload, type N01Match } from "@/lib/n01-parser";
import {
  computeMatchStats,
  computePlayerStats,
  dartWord,
  filterByRange,
  normalizeName,
} from "@/lib/stats";
import sample from "./fixtures/n01-sample.json";

async function goldenMatch(playerIndex: 0 | 1 = 1): Promise<N01Match> {
  return parseN01Payload(sample as Record<string, unknown>, {
    tmid: String(sample.tmid),
    ttype: "tournament",
    snapshotPath: "x",
    htmlSnapshotPath: null,
    shareToken: "tokentokentoken1",
    playerIndex,
  });
}

describe("stats", () => {
  it("computeMatchStats returns me/opp boxes for chosen side", async () => {
    const match = await goldenMatch(1);
    const stats = computeMatchStats(match);
    expect(stats.playerIndex).toBe(1);
    expect(stats.me.name).toContain("ALPHA");
    expect(stats.opp.name).toContain("BETA");
    expect(stats.me.average).toBeGreaterThan(0);
    expect(stats.legs.length).toBe(match.legs.length);
  });

  it("flipping playerIndex swaps me/opp", async () => {
    const a = computeMatchStats(await goldenMatch(1));
    const b = computeMatchStats(await goldenMatch(0));
    expect(a.me.name).toBe(b.opp.name);
    expect(a.opp.name).toBe(b.me.name);
  });

  it("computePlayerStats skips matches with null playerIndex", async () => {
    const match = await goldenMatch(1);
    const orphan = { ...match, playerIndex: null as 0 | 1 | null };
    const stats = computePlayerStats([orphan, match]);
    expect(stats.matches).toBe(1);
  });

  it("filterByRange all keeps matches", async () => {
    const match = await goldenMatch(1);
    expect(filterByRange([match], "all")).toHaveLength(1);
  });

  it("normalizeName strips city parentheses", () => {
    expect(normalizeName("Piotr Grotkowski (Katowice)")).toMatch(/Grotkowski/i);
    expect(normalizeName("Piotr Grotkowski (Katowice)")).not.toMatch(/Katowice/);
  });

  it("dartWord Polish pluralization", () => {
    expect(dartWord(1)).toBe("lotka");
    expect(dartWord(2)).toBe("lotki");
    expect(dartWord(5)).toBe("lotek");
  });
});
