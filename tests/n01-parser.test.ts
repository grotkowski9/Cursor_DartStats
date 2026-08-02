import { describe, expect, it } from "vitest";
import { checkN01MatchUrl } from "@/lib/n01-url";
import {
  computeShareToken,
  extractTmidFromUrl,
  parseN01Payload,
} from "@/lib/n01-parser";
import sample from "./fixtures/n01-sample.json";

describe("extractTmidFromUrl", () => {
  it("parses league URL", () => {
    const r = extractTmidFromUrl(
      "https://n01darts.com/n01/league/n01_view.html?tmid=abc123",
    );
    expect(r).toEqual({ tmid: "abc123", ttype: "league" });
  });

  it("parses tournament URL", () => {
    const r = extractTmidFromUrl(
      "https://www.n01darts.com/n01/tournament/n01_view.html?tmid=xyz",
    );
    expect(r.tmid).toBe("xyz");
    expect(r.ttype).toBe("tournament");
  });

  it("rejects non-n01 host", () => {
    expect(() =>
      extractTmidFromUrl("https://evil.com/n01/league/n01_view.html?tmid=x"),
    ).toThrow(/n01darts\.com/);
  });

  it("rejects missing tmid", () => {
    expect(() =>
      extractTmidFromUrl("https://n01darts.com/n01/league/n01_view.html"),
    ).toThrow(/tmid/);
  });
});

describe("checkN01MatchUrl", () => {
  it("accepts valid n01 URL", () => {
    const r = checkN01MatchUrl(
      "https://n01darts.com/n01/league/n01_view.html?tmid=t_1",
    );
    expect(r.ok).toBe(true);
  });

  it("rejects empty", () => {
    expect(checkN01MatchUrl("  ")).toEqual({ ok: false, kind: "empty" });
  });

  it("rejects not_url", () => {
    expect(checkN01MatchUrl("asdf")).toEqual({ ok: false, kind: "not_url" });
  });

  it("rejects not_n01 host", () => {
    expect(
      checkN01MatchUrl("https://example.com/?tmid=1"),
    ).toEqual({ ok: false, kind: "not_n01" });
  });

  it("rejects n01 without tmid", () => {
    expect(
      checkN01MatchUrl("https://n01darts.com/n01/league/n01_view.html"),
    ).toEqual({ ok: false, kind: "not_n01" });
  });
});

describe("computeShareToken", () => {
  it("returns stable 16 hex chars", async () => {
    const a = await computeShareToken("cust-1", "tmid-1");
    const b = await computeShareToken("cust-1", "tmid-1");
    const c = await computeShareToken("cust-2", "tmid-1");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(a).not.toBe(c);
  });
});

describe("parseN01Payload (golden sample)", () => {
  it("maps players, legs and visits", async () => {
    const match = await parseN01Payload(sample as Record<string, unknown>, {
      tmid: String(sample.tmid),
      ttype: "tournament",
      snapshotPath: "cust/path.json",
      htmlSnapshotPath: null,
      shareToken: "abcdabcdabcdabcd",
      playerIndex: 1,
    });

    expect(match.players[0].name).toContain("BETA");
    expect(match.players[1].name).toContain("ALPHA");
    expect(match.players[1].isMe).toBe(true);
    expect(match.players[0].isMe).toBe(false);
    expect(match.legs.length).toBeGreaterThan(0);
    expect(match.playerIndex).toBe(1);
    expect(match.snapshotPath).toBe("cust/path.json");
    expect(match.rawPayload).toBeTruthy();

    const firstLeg = match.legs[0];
    expect(firstLeg.visits[0].length).toBeGreaterThan(0);
    expect(firstLeg.visits[0][0].isSetup).toBe(true);
  });

  it("marks checkout when score negative and left 0", async () => {
    const payload = {
      title: "t",
      startTime: 1,
      updateTime: 1,
      startScore: 501,
      statsData: [
        { name: "A", winLegs: 1, allScore: 501, allDarts: 9 },
        { name: "B", winLegs: 0, allScore: 100, allDarts: 6 },
      ],
      legData: [
        {
          winner: 0,
          first: 0,
          playerData: [
            [
              { score: 501, left: 501 },
              { score: 180, left: 321 },
              { score: 180, left: 141 },
              { score: -3, left: 0 },
            ],
            [{ score: 501, left: 501 }],
          ],
        },
      ],
    };

    const match = await parseN01Payload(payload, {
      tmid: "t1",
      ttype: "league",
      snapshotPath: "x",
      htmlSnapshotPath: null,
      shareToken: "tok",
      playerIndex: 0,
    });

    const visits = match.legs[0].visits[0];
    const last = visits[visits.length - 1];
    expect(last.isCheckout).toBe(true);
    expect(last.isBust).toBe(false);
    expect(last.actualScore).toBe(141);
  });

  it("marks bust when score negative and left > 0", async () => {
    const payload = {
      title: "t",
      startTime: 1,
      updateTime: 1,
      startScore: 501,
      statsData: [
        { name: "A", winLegs: 0, allScore: 0, allDarts: 3 },
        { name: "B", winLegs: 0, allScore: 0, allDarts: 0 },
      ],
      legData: [
        {
          winner: -1,
          first: 0,
          playerData: [
            [
              { score: 501, left: 501 },
              { score: -2, left: 501 },
            ],
            [{ score: 501, left: 501 }],
          ],
        },
      ],
    };

    const match = await parseN01Payload(payload, {
      tmid: "t2",
      ttype: "league",
      snapshotPath: "x",
      htmlSnapshotPath: null,
      shareToken: "tok",
      playerIndex: 0,
    });

    const last = match.legs[0].visits[0][1];
    expect(last.isBust).toBe(true);
    expect(last.isCheckout).toBe(false);
    expect(last.actualScore).toBe(0);
  });
});
