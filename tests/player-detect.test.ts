import { describe, expect, it } from "vitest";
import { applyPlayerIndex, detectPlayerIndex } from "@/lib/player-detect";

const PATTERNS = ["grotkowski", "groteł", "grotel"] as const;

describe("detectPlayerIndex — README scenarios", () => {
  it("none — both strangers", () => {
    expect(
      detectPlayerIndex(["Jarek Marciniak", "Mariusz Pudzianowski"], PATTERNS),
    ).toEqual({
      status: "none",
      players: ["Jarek Marciniak", "Mariusz Pudzianowski"],
    });
  });

  it("auto — only Grotkowski matches (Piotr alone is not a pattern)", () => {
    expect(
      detectPlayerIndex(["Piotr Grotkowski", "Piotr Michałowicz"], PATTERNS),
    ).toEqual({ status: "auto", playerIndex: 0 });
  });

  it("ambiguous — Groteł vs Piotr Grotkowski", () => {
    expect(detectPlayerIndex(["Groteł", "Piotr Grotkowski"], PATTERNS)).toEqual({
      status: "ambiguous",
      players: ["Groteł", "Piotr Grotkowski"],
    });
  });

  it("ambiguous — reverse order", () => {
    expect(detectPlayerIndex(["Piotr Grotkowski", "Groteł"], PATTERNS).status).toBe(
      "ambiguous",
    );
  });

  it("auto — case insensitive GROTKOWSKI", () => {
    expect(
      detectPlayerIndex(["GROTKOWSKI Piotr", "Jan Kowalski"], PATTERNS),
    ).toEqual({ status: "auto", playerIndex: 0 });
  });

  it("auto — player 1", () => {
    expect(
      detectPlayerIndex(["Marciniak Jarek", "Grotkowski Piotr"], PATTERNS),
    ).toEqual({ status: "auto", playerIndex: 1 });
  });

  it("auto — initial + last name", () => {
    expect(
      detectPlayerIndex(["P. Grotkowski", "Wiśniewski Sławomir"], PATTERNS),
    ).toEqual({ status: "auto", playerIndex: 0 });
  });

  it("auto — nickname Groteł", () => {
    expect(detectPlayerIndex(["Groteł", "Kowalski Jan"], PATTERNS)).toEqual({
      status: "auto",
      playerIndex: 0,
    });
  });

  it("auto — city in parentheses does not block", () => {
    expect(
      detectPlayerIndex(
        ["Piotr Grotkowski (Katowice)", "Małkowski Adrian"],
        PATTERNS,
      ),
    ).toEqual({ status: "auto", playerIndex: 0 });
  });

  it("none — similar Grotowski is NOT Grotkowski", () => {
    expect(
      detectPlayerIndex(["Grotowski Piotr", "Kowalski Jan"], PATTERNS).status,
    ).toBe("none");
  });

  it("none — Grodkowski is NOT Grotkowski", () => {
    expect(
      detectPlayerIndex(["Grodkowski Piotr", "Kowalski Jan"], PATTERNS).status,
    ).toBe("none");
  });

  it("auto — only real Grotkowski among similar names", () => {
    expect(
      detectPlayerIndex(["Grotowski", "Grotkowski Piotr"], PATTERNS),
    ).toEqual({ status: "auto", playerIndex: 1 });
  });

  it("auto — Grodkowski vs Grotkowski", () => {
    expect(
      detectPlayerIndex(["Grodkowski", "Grotkowski Piotr"], PATTERNS),
    ).toEqual({ status: "auto", playerIndex: 1 });
  });

  it("auto — Piotr Grotowski vs Piotr Grotkowski", () => {
    expect(
      detectPlayerIndex(["Piotr Grotowski", "Piotr Grotkowski"], PATTERNS),
    ).toEqual({ status: "auto", playerIndex: 1 });
  });

  it("none — both similar-but-wrong surnames", () => {
    expect(
      detectPlayerIndex(["Grotowski Piotr", "Grodkowski Adrian"], PATTERNS)
        .status,
    ).toBe("none");
  });

  it("none — opponent is Grotowski", () => {
    expect(
      detectPlayerIndex(["Marciniak Jarek", "Grotowski Piotr"], PATTERNS).status,
    ).toBe("none");
  });

  it("none — opponent is Grodkowski", () => {
    expect(
      detectPlayerIndex(["Marciniak Jarek", "Grodkowski Piotr"], PATTERNS)
        .status,
    ).toBe("none");
  });
});

describe("applyPlayerIndex", () => {
  it("sets isMe flags", () => {
    const players = [
      { name: "A", isMe: false },
      { name: "B", isMe: false },
    ] as [{ name: string; isMe?: boolean }, { name: string; isMe?: boolean }];
    applyPlayerIndex(players, 1);
    expect(players[0].isMe).toBe(false);
    expect(players[1].isMe).toBe(true);
  });
});
