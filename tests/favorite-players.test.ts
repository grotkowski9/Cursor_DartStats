import { describe, expect, it } from "vitest";
import favoritePlayers from "@/data/favorite-players.json";

describe("favorite players catalog", () => {
  it("lists Ratajski first and Białecki second", () => {
    const ordered = [...favoritePlayers].sort(
      (a, b) => (a.popularityRank ?? 999) - (b.popularityRank ?? 999),
    );
    expect(ordered[0]).toMatchObject({ id: "ratajski", name: "Krzysztof Ratajski" });
    expect(ordered[1]).toMatchObject({ id: "bialecki", name: "Sebastian Białecki" });
    expect(ordered[2]?.id).toBe("littler");
  });
});
