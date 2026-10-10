import { describe, expect, it } from "vitest";
import type { N01Match } from "@/lib/n01-parser";
import {
  filterByTags,
  sanitizeMatchTags,
  uniqueCatalogTags,
} from "@/lib/match-tags";

function match(partial: Partial<N01Match> & { tmid: string }): N01Match {
  return {
    tmid: partial.tmid,
    ttype: "tournament",
    title: partial.title ?? "T",
    startTime: 1,
    updateTime: 1,
    startScore: 501,
    players: [
      { name: "A", winLegs: 2, allScore: 0, allDarts: 0, average: 0, isMe: true },
      { name: "B", winLegs: 1, allScore: 0, allDarts: 0, average: 0, isMe: false },
    ],
    legs: [],
    snapshotPath: "",
    htmlSnapshotPath: null,
    playerIndex: 0,
    shareToken: partial.tmid,
    tags: partial.tags,
  };
}

describe("match tags", () => {
  it("sanitizes, trims, and dedupes case-insensitively", () => {
    expect(sanitizeMatchTags([" Gliwice ", "gliwice", "liga"])).toEqual(["Gliwice", "liga"]);
    expect(sanitizeMatchTags([])).toEqual([]);
    expect(sanitizeMatchTags("Gliwice")).toBeNull();
    expect(sanitizeMatchTags(["x".repeat(33)])).toBeNull();
    expect(sanitizeMatchTags(Array.from({ length: 9 }, (_, i) => `t${i}`))).toBeNull();
  });

  it("builds catalog from all matches", () => {
    const catalog = uniqueCatalogTags([
      match({ tmid: "a", tags: ["Gliwice"] }),
      match({ tmid: "b", tags: ["gliwice", "Liga"] }),
      match({ tmid: "c" }),
    ]);
    expect(catalog).toEqual(["Gliwice", "Liga"]);
  });

  it("include keeps only tagged matches; exclude hides them", () => {
    const matches = [
      match({ tmid: "a", tags: ["Gliwice"] }),
      match({ tmid: "b", tags: ["Liga"] }),
      match({ tmid: "c", tags: [] }),
    ];
    expect(filterByTags(matches, { includeTag: "Gliwice" }).map((m) => m.tmid)).toEqual(["a"]);
    expect(filterByTags(matches, { excludeTag: "Gliwice" }).map((m) => m.tmid)).toEqual(["b", "c"]);
    expect(
      filterByTags(matches, { includeTag: "Liga", excludeTag: "Gliwice" }).map((m) => m.tmid),
    ).toEqual(["b"]);
  });
});
