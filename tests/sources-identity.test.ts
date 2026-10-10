import { describe, expect, it } from "vitest";
import type { CustomerProfile } from "@/lib/customer";
import {
  n01NameMatches,
  personMatchesPatterns,
  resolveCandidates,
} from "@/lib/sources/identity";
import { pickPrdIdentity } from "@/lib/sources/prd";
import { pickN01Identity } from "@/lib/sources/n01-competition";

const piotr: CustomerProfile = {
  customerId: "c1",
  authUserId: null,
  firstName: "Piotr",
  lastName: "Grotkowski",
  nickname: "Groteł",
  knownNicknames: ["Grotel"],
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
};

describe("resolveCandidates", () => {
  it("0 → none, no silent import", () => {
    const r = resolveCandidates([], "brak");
    expect(r.status).toBe("none");
    if (r.status === "none") expect(r.candidates).toEqual([]);
  });

  it("1 → auto", () => {
    const r = resolveCandidates([{ id: "a", displayName: "Piotr Grotkowski" }], "brak");
    expect(r.status).toBe("auto");
    if (r.status === "auto") expect(r.participantId).toBe("a");
  });

  it("2+ same name → always picker", () => {
    const r = resolveCandidates(
      [
        { id: "1", displayName: "Kamil Nowak" },
        { id: "2", displayName: "Kamil Nowak „Kamyk”" },
      ],
      "brak",
    );
    expect(r.status).toBe("ambiguous");
    if (r.status === "ambiguous") expect(r.candidates).toHaveLength(2);
  });
});

describe("PRD identity", () => {
  it("finds Piotr Groteł among participants", () => {
    const r = pickPrdIdentity(
      [
        { id: "x", displayName: "Kamil Nowak", nickname: "Kamyk" },
        { id: "p", displayName: "Piotr „Groteł” Grotkowski", nickname: "Groteł" },
      ],
      piotr,
    );
    expect(r.status).toBe("auto");
    if (r.status === "auto") expect(r.participantId).toBe("p");
  });

  it("0 candidates → no silent import", () => {
    const r = pickPrdIdentity(
      [{ id: "x", displayName: "Kamil Nowak", nickname: "Kamyk" }],
      piotr,
    );
    expect(r.status).toBe("none");
  });

  it("two Nowaks matching last name stay ambiguous", () => {
    const kamil: CustomerProfile = { ...piotr, firstName: "Kamil", lastName: "Nowak", nickname: null, knownNicknames: [] };
    const r = pickPrdIdentity(
      [
        { id: "1", displayName: "Kamil Nowak", nickname: null },
        { id: "2", displayName: "Kamil Nowak", nickname: "Inny" },
      ],
      kamil,
    );
    expect(r.status).toBe("ambiguous");
  });
});

describe("N01 identity", () => {
  it("matches P. Grotkowski", () => {
    expect(n01NameMatches("P. Grotkowski", piotr, ["grotkowski", "groteł"])).toBe(true);
  });

  it("0 candidates → none, no silent import", () => {
    const r = pickN01Identity(
      [
        {
          tmid: "t_1",
          endMatch: 1,
          statsData: [
            { name: "K. Nowak", tpid: "xxxx", winLegs: 3 },
            { name: "W. Witek", tpid: "yyyy", winLegs: 1 },
          ],
        },
      ],
      piotr,
    );
    expect(r.status).toBe("none");
  });

  it("picks unique tpid from tournament list", () => {
    const r = pickN01Identity(
      [
        {
          tmid: "t_1",
          endMatch: 1,
          statsData: [
            { name: "P. Grotkowski", tpid: "bMBU", winLegs: 2 },
            { name: "K. Nowak", tpid: "xxxx", winLegs: 3 },
          ],
        },
        {
          tmid: "t_2",
          endMatch: 1,
          statsData: [
            { name: "P. Grotkowski", tpid: "bMBU", winLegs: 3 },
            { name: "W. Witek", tpid: "yyyy", winLegs: 1 },
          ],
        },
      ],
      piotr,
    );
    expect(r.status).toBe("auto");
    if (r.status === "auto") expect(r.participantId).toBe("bMBU");
  });
});

describe("personMatchesPatterns", () => {
  it("does not match unrelated player", () => {
    expect(
      personMatchesPatterns(
        { firstName: "Jan", lastName: "Kowalski", nickname: "Janek" },
        ["grotkowski", "groteł"],
      ),
    ).toBe(false);
  });
});
