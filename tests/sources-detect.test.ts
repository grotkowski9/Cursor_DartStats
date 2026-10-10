import { describe, expect, it } from "vitest";
import { detectSourceUrl, splitInputUrls } from "@/lib/sources/detect-url";

describe("detectSourceUrl", () => {
  it("detects N01 match tmid", () => {
    const r = detectSourceUrl(
      "https://n01darts.com/n01/league/n01_view.html?tmid=t_84WD_6808_rr_1_ODeb_WvbB",
    );
    expect(r.kind).toBe("n01_match");
    if (r.kind === "n01_match") expect(r.tmid).toBe("t_84WD_6808_rr_1_ODeb_WvbB");
  });

  it("detects N01 tournament comp.php", () => {
    const r = detectSourceUrl(
      "https://n01darts.com/n01/tournament/comp.php?id=t_lQMv_5737&lg=2-aOIY",
    );
    expect(r.kind).toBe("n01_tournament");
    if (r.kind === "n01_tournament") expect(r.tdid).toBe("t_lQMv_5737");
  });

  it("detects N01 league portal", () => {
    const r = detectSourceUrl("https://n01darts.com/n01/league/portal.php?lgid=lg_Ab1c_2345");
    expect(r.kind).toBe("n01_league");
    if (r.kind === "n01_league") expect(r.lgid).toBe("lg_Ab1c_2345");
  });

  it("detects N01 league season.php", () => {
    const r = detectSourceUrl("https://n01darts.com/n01/league/season.php?lgid=lg_Ab1c_2345");
    expect(r.kind).toBe("n01_league");
    if (r.kind === "n01_league") expect(r.lgid).toBe("lg_Ab1c_2345");
  });

  it("detects PRD tournament slug", () => {
    const r = detectSourceUrl(
      "https://polskirankingdarta.pl/turnieje/mistrzostwa-zaglebia-dabrowskiego-20261010-cr4n4wtyavm8p64v",
    );
    expect(r.kind).toBe("prd_tournament");
    if (r.kind === "prd_tournament") {
      expect(r.slug).toBe("mistrzostwa-zaglebia-dabrowskiego-20261010-cr4n4wtyavm8p64v");
    }
  });

  it("unknown host", () => {
    expect(detectSourceUrl("https://example.com/foo").kind).toBe("unknown");
  });

  it("n01 without usable params", () => {
    const r = detectSourceUrl("https://n01darts.com/n01/tournament/n01_view.html");
    expect(r.kind).toBe("unknown");
  });
});

describe("splitInputUrls", () => {
  it("dedupes the same URL twice", () => {
    const lines = splitInputUrls(
      [
        "https://n01darts.com/n01/tournament/n01_view.html?tmid=t_abc",
        "https://n01darts.com/n01/tournament/n01_view.html?tmid=t_abc",
        "https://polskirankingdarta.pl/turnieje/foo",
      ].join("\n"),
    );
    expect(lines).toHaveLength(2);
  });
});
