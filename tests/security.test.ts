import { describe, expect, it } from "vitest";
import { toClientMatch } from "@/lib/match-client";
import { rateLimit } from "@/lib/rate-limit";
import { safeInternalPath } from "@/lib/safe-path";
import { isPlaceholderName, formNameFields } from "@/lib/identity-suggest";
import { needsOnboarding } from "@/lib/customer";
import type { N01Match } from "@/lib/n01-parser";
import type { CustomerProfile } from "@/lib/customer";

function baseCustomer(over: Partial<CustomerProfile> = {}): CustomerProfile {
  return {
    customerId: "00000000-0000-4000-8000-000000000099",
    authUserId: null,
    firstName: "Jan",
    lastName: "Kowalski",
    nickname: "Janek",
    knownNicknames: [],
    role: "user",
    city: null,
    dartBrand: null,
    dartBrandOther: null,
    dartModel: null,
    dartWeightBucket: null,
    throwingHand: null,
    favoritePlayerId: null,
    profileStatsVisible: true,
    newsletterOptIn: false,
    aboutCompletedAt: null,
    tourCompletedAt: null,
    ...over,
  };
}

describe("toClientMatch", () => {
  it("strips snapshot paths and rawPayload", () => {
    const match = {
      tmid: "t",
      ttype: "league" as const,
      title: "x",
      startTime: 1,
      updateTime: 1,
      startScore: 501,
      players: [
        {
          name: "A",
          winLegs: 0,
          allScore: 0,
          allDarts: 0,
          average: 0,
          isMe: true,
        },
        {
          name: "B",
          winLegs: 0,
          allScore: 0,
          allDarts: 0,
          average: 0,
          isMe: false,
        },
      ],
      legs: [],
      snapshotPath: "customer-id/secret.json",
      htmlSnapshotPath: "customer-id/secret.html",
      playerIndex: 0 as const,
      shareToken: "abcdabcdabcdabcd",
      rawPayload: { secret: true },
    } satisfies N01Match;

    const client = toClientMatch(match);
    expect(client.snapshotPath).toBe("");
    expect(client.htmlSnapshotPath).toBeNull();
    expect(client.rawPayload).toBeUndefined();
    expect(client.shareToken).toBe("abcdabcdabcdabcd");
  });
});

describe("rateLimit", () => {
  it("allows up to limit then blocks", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).ok).toBe(true);
    }
    const blocked = rateLimit(key, { limit: 3, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});

describe("safeInternalPath", () => {
  it("allows relative app paths", () => {
    expect(safeInternalPath("/profile")).toBe("/profile");
    expect(safeInternalPath("/onboarding?x=1")).toBe("/onboarding?x=1");
  });

  it("rejects open redirects", () => {
    expect(safeInternalPath("//evil.com")).toBe("/profile");
    expect(safeInternalPath("https://evil.com")).toBe("/profile");
    expect(safeInternalPath("/\\evil.com")).toBe("/profile");
    expect(safeInternalPath("not-a-path")).toBe("/profile");
  });
});

describe("identity / onboarding gates", () => {
  it("isPlaceholderName", () => {
    expect(isPlaceholderName("Gracz", "Dart")).toBe(true);
    expect(isPlaceholderName("Test", "User")).toBe(true);
    expect(isPlaceholderName("Jan", "Kowalski")).toBe(false);
  });

  it("formNameFields blanks placeholders", () => {
    const f = formNameFields({
      firstName: "Gracz",
      lastName: "Dart",
      nickname: "X",
      knownNicknames: ["a"],
    });
    expect(f.firstName).toBe("");
    expect(f.lastName).toBe("");
    expect(f.nickname).toBe("X");
  });

  it("needsOnboarding when nickname missing or placeholder name", () => {
    expect(needsOnboarding(baseCustomer({ nickname: null }))).toBe(true);
    expect(
      needsOnboarding(
        baseCustomer({ firstName: "Gracz", lastName: "Dart", nickname: "x" }),
      ),
    ).toBe(true);
    expect(needsOnboarding(baseCustomer())).toBe(false);
  });
});
