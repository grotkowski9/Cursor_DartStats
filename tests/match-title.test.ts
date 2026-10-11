import { describe, expect, it } from "vitest";
import { displayMatchTitle } from "@/lib/match-title";

describe("displayMatchTitle", () => {
  it("strips PRD vs suffix", () => {
    expect(displayMatchTitle("Mistrzostwa Zagłębia Dąbrowskiego · vs Kaszuba")).toBe(
      "Mistrzostwa Zagłębia Dąbrowskiego",
    );
  });

  it("keeps N01 tournament titles", () => {
    expect(displayMatchTitle("Gliwice Open 2026")).toBe("Gliwice Open 2026");
  });

  it("does not strip a name that merely contains vs in the middle of a word", () => {
    expect(displayMatchTitle("Warszawa")).toBe("Warszawa");
  });
});
