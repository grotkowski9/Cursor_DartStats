import { describe, expect, it } from "vitest";
import { DEMO_MATCH_TAGS } from "@/lib/demo-snapshot";
import { getDemoSnapshot } from "@/lib/demo";
import { filterByTags } from "@/lib/match-tags";

describe("demo match tags", () => {
  it("stamps Mecz towarzyski on selected demo matches", () => {
    const snapshot = getDemoSnapshot();
    const friendly = snapshot.matches.filter((m) =>
      (m.tags ?? []).includes("Mecz towarzyski"),
    );
    expect(friendly.map((m) => m.shareToken).sort()).toEqual(["demo003", "demo007", "demo010"]);
    expect(DEMO_MATCH_TAGS.demo002).toEqual(["Liga"]);
  });

  it("exclude Mecz towarzyski hides those matches", () => {
    const snapshot = getDemoSnapshot();
    const left = filterByTags(snapshot.matches, { excludeTag: "Mecz towarzyski" });
    expect(left.some((m) => (m.tags ?? []).includes("Mecz towarzyski"))).toBe(false);
    expect(left.length).toBe(snapshot.matches.length - 3);
  });
});
