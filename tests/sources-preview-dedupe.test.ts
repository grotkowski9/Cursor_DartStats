import { describe, expect, it } from "vitest";
import { detectSourceUrl } from "@/lib/sources/detect-url";
import {
  applyExistingToMatches,
  dedupePreviewGroups,
  dedupePreviewMatches,
  mergePreviewGroups,
} from "@/lib/sources/preview";
import type { PreviewGroup, PreviewMatch } from "@/lib/sources/types";

function match(partial: Partial<PreviewMatch> & Pick<PreviewMatch, "externalId">): PreviewMatch {
  return {
    source: "n01",
    opponent: "Opp",
    myScore: 3,
    oppScore: 1,
    startTime: 1,
    startScore: 501,
    alreadyInDb: false,
    shareToken: null,
    selected: true,
    fetchRef: { source: "n01", tmid: partial.externalId, viewUrl: `https://n01darts.com/?tmid=${partial.externalId}` },
    playerIndex: 0,
    ...partial,
  };
}

function group(partial: Partial<PreviewGroup> & Pick<PreviewGroup, "groupKey" | "kind" | "matches">): PreviewGroup {
  return {
    source: "n01",
    title: partial.groupKey,
    sourceUrl: "https://n01darts.com/",
    identity: { status: "auto", participantId: "me", displayName: "Me" },
    ...partial,
  };
}

describe("mixed batch classification", () => {
  it("classifies match + tournament + PRD in one paste", () => {
    const lines = [
      "https://n01darts.com/n01/tournament/n01_view.html?tmid=t_lQMv_5737_lg_0_qcmp_bMBU_pDvv",
      "https://n01darts.com/n01/tournament/comp.php?id=t_lQMv_5737&lg=2-aOIY",
      "https://polskirankingdarta.pl/turnieje/mistrzostwa-zaglebia-dabrowskiego-20261010-cr4n4wtyavm8p64v",
    ];
    expect(lines.map((l) => detectSourceUrl(l).kind)).toEqual([
      "n01_match",
      "n01_tournament",
      "prd_tournament",
    ]);
  });
});

describe("batch dedupe", () => {
  it("same tmid as match URL + tournament is one intent", () => {
    const tmid = "t_lQMv_5737_lg_0_qcmp_bMBU_pDvv";
    const standalone = group({
      groupKey: `n01-match:${tmid}`,
      kind: "n01_match",
      matches: [match({ externalId: tmid })],
    });
    const tournament = group({
      groupKey: "n01-tdid:t_lQMv_5737",
      kind: "n01_tournament",
      matches: [match({ externalId: tmid }), match({ externalId: "t_other" })],
    });
    const merged = mergePreviewGroups([standalone, tournament]);
    const ids = merged.flatMap((g) => g.matches.map((m) => m.externalId));
    expect(ids.filter((id) => id === tmid)).toHaveLength(1);
    expect(ids).toContain("t_other");
    expect(merged.some((g) => g.kind === "n01_match")).toBe(false);
    expect(merged.find((g) => g.kind === "n01_tournament")?.matches).toHaveLength(2);
  });

  it("dedupes identical rows inside one list", () => {
    const a = match({ externalId: "t_1" });
    expect(dedupePreviewMatches([a, { ...a }])).toHaveLength(1);
  });

  it("does not merge N01 and PRD of coincidentally similar ids", () => {
    const groups = dedupePreviewGroups([
      group({
        groupKey: "n01-tdid:x",
        kind: "n01_tournament",
        matches: [match({ source: "n01", externalId: "abc" })],
      }),
      group({
        groupKey: "prd:x",
        source: "prd",
        kind: "prd_tournament",
        matches: [match({ source: "prd", externalId: "prd:abc" })],
      }),
    ]);
    expect(groups.flatMap((g) => g.matches)).toHaveLength(2);
  });
});

describe("incremental alreadyInDb", () => {
  it("second preview of the same tmid marks 0 new", () => {
    const rows = [
      match({ externalId: "t_old", selected: true }),
      match({ externalId: "t_new", selected: true }),
    ];
    const existing = new Map([["t_old", "share-old"]]);
    const marked = applyExistingToMatches(rows, existing);
    expect(marked.filter((m) => !m.alreadyInDb)).toHaveLength(1);
    expect(marked.find((m) => m.externalId === "t_old")).toMatchObject({
      alreadyInDb: true,
      selected: false,
      shareToken: "share-old",
    });
    expect(marked.find((m) => m.externalId === "t_new")?.selected).toBe(true);
  });
});
