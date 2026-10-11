import { describe, expect, it } from "vitest";
import { computePlayerStats } from "@/lib/stats";
import { prdExternalId, prdMatchToN01, type PrdRawMatch, type PrdTournament } from "@/lib/sources/prd";
import sample from "./fixtures/prd-sample-match.json";
import zaglebie from "./fixtures/prd-zaglebie-4matches.json";

const tournament = {
  id: "tour-1",
  name: "Mistrzostwa Zagłębia Dąbrowskiego",
  slug: "mz-test",
  date: "2026-10-10T11:00:00",
  starting_points: 501,
};

describe("prdMatchToN01", () => {
  const raw = sample as unknown as PrdRawMatch;

  it("maps throw-by-throw and identity", () => {
    const m = prdMatchToN01(raw, {
      tournament,
      playerId: "9f60529d-e088-4629-aff9-c6e4e006c149",
      snapshotPath: "snap.json",
      htmlSnapshotPath: null,
      shareToken: "abc",
    });
    expect(m.source).toBe("prd");
    expect(m.tmid).toBe(prdExternalId(raw.id));
    expect(m.ttype).toBe("tournament");
    expect(m.startScore).toBe(501);
    expect(m.playerIndex).toBe(0);
    expect(m.players[0].isMe).toBe(true);
    expect(m.players[0].winLegs).toBe(3);
    expect(m.players[1].winLegs).toBe(0);
    expect(m.legs).toHaveLength(1);
    expect(m.legs[0].visits[0][0].isSetup).toBe(true);
    const real = m.legs[0].visits[0].filter((v) => !v.isSetup);
    expect(real).toHaveLength(6);
    expect(real[5].isCheckout).toBe(true);
    expect(real[5].actualScore).toBe(40);
    expect(m.title).toBe("Mistrzostwa Zagłębia Dąbrowskiego");
    expect(m.title).not.toMatch(/vs/i);
  });

  it("uses slot 1 when player is p2", () => {
    const m = prdMatchToN01(raw, {
      tournament,
      playerId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      snapshotPath: "snap.json",
      htmlSnapshotPath: null,
      shareToken: "abc",
    });
    expect(m.playerIndex).toBe(1);
    expect(m.players[1].isMe).toBe(true);
  });
});

describe("PRD Zagłębie 4 finished matches", () => {
  const fixture = zaglebie as {
    tournament: PrdTournament;
    playerId: string;
    group: PrdRawMatch[];
    knockout: PrdRawMatch[];
  };

  it("maps throw-by-throw and card totals 46.08 / 52.67 / 12.12% / 6175/402", () => {
    const matches = [...fixture.group, ...fixture.knockout].map((raw, i) =>
      prdMatchToN01(raw, {
        tournament: fixture.tournament,
        playerId: fixture.playerId,
        snapshotPath: `snap/${i}.json`,
        htmlSnapshotPath: null,
        shareToken: `tok${i}`,
      }),
    );
    expect(matches).toHaveLength(4);
    expect(matches.every((m) => m.source === "prd")).toBe(true);
    expect(matches.every((m) => m.tmid.startsWith("prd:"))).toBe(true);
    expect(matches.every((m) => m.startScore === 501)).toBe(true);
    expect(matches.reduce((n, m) => n + m.legs.length, 0)).toBeGreaterThanOrEqual(4);
    const visits = matches.flatMap((m) =>
      m.legs.flatMap((l) => l.visits[m.playerIndex ?? 0].filter((v) => !v.isSetup)),
    );
    expect(visits.length).toBeGreaterThan(20);
    expect(visits.some((v) => v.isCheckout)).toBe(true);

    const scored = matches.reduce((s, m) => s + m.players[m.playerIndex ?? 0].allScore, 0);
    const darts = matches.reduce((s, m) => s + m.players[m.playerIndex ?? 0].allDarts, 0);
    expect(scored).toBe(6175);
    expect(darts).toBe(402);

    const stats = computePlayerStats(matches);
    expect(stats.matches).toBe(4);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(3);
    expect(stats.average).toBe(46.08);

    let f9Pts = 0;
    let f9Darts = 0;
    let prdHits = 0;
    let prdAtt = 0;
    for (const raw of fixture.group) {
      const meIsP1 = raw.player1 === fixture.playerId;
      const slot = meIsP1 ? raw.match_data?.liveStats?.p1 : raw.match_data?.liveStats?.p2;
      f9Pts += Number((slot as { first9Points?: number } | undefined)?.first9Points ?? 0);
      f9Darts += Number((slot as { first9Darts?: number } | undefined)?.first9Darts ?? 0);
      prdHits += Number((slot as { checkoutSuccess?: number } | undefined)?.checkoutSuccess ?? 0);
      prdAtt += Number((slot as { checkoutAttempts?: number } | undefined)?.checkoutAttempts ?? 0);
    }
    expect(Math.round((f9Pts / f9Darts) * 3 * 100) / 100).toBe(52.67);
    expect(prdHits).toBe(4);
    expect(prdAtt).toBe(33);
    expect(Math.round((prdHits / prdAtt) * 10000) / 100).toBe(12.12);
  });
});
