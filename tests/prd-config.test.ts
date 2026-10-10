import { afterEach, describe, expect, it } from "vitest";
import {
  extractPrdConfigFromText,
  extractPrdScriptUrls,
  resetPrdConfigCache,
  resolvePrdConfig,
  setPrdConfigFetchForTests,
} from "@/lib/sources/prd-config";

afterEach(() => {
  setPrdConfigFetchForTests(null);
  resetPrdConfigCache();
  delete process.env.PRD_SUPABASE_URL;
  delete process.env.PRD_SUPABASE_PUBLISHABLE_KEY;
});

describe("extractPrdConfigFromText", () => {
  it("reads publishable key + supabase host from minified SPA", () => {
    const js =
      'const rct="https://abcdabcdabcdabcdabcd.supabase.co",nct="sb_publishable_AAA-BBB_ccc";';
    expect(extractPrdConfigFromText(js)).toEqual({
      url: "https://abcdabcdabcdabcdabcd.supabase.co",
      key: "sb_publishable_AAA-BBB_ccc",
    });
  });

  it("falls back to anon JWT if no sb_publishable_", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.signaturexx";
    const js = `url:"https://zzzzzzzzzzzzzzzzzzzz.supabase.co",key:"${jwt}"`;
    const found = extractPrdConfigFromText(js);
    expect(found?.url).toBe("https://zzzzzzzzzzzzzzzzzzzz.supabase.co");
    expect(found?.key).toBe(jwt);
  });
});

describe("extractPrdScriptUrls", () => {
  it("skips legacy bundles and prefers /assets/index-", () => {
    const html = `
      <script src="/assets/polyfills-legacy-Dx.js"></script>
      <script src="/assets/index-legacy-DI.js"></script>
      <script src="/assets/index-CRi_jYS5.js"></script>
    `;
    expect(extractPrdScriptUrls(html, "https://polskirankingdarta.pl/")).toEqual([
      "https://polskirankingdarta.pl/assets/index-CRi_jYS5.js",
    ]);
  });
});

describe("resolvePrdConfig", () => {
  it("discovers a new project when builtin REST is dead", async () => {
    const calls: string[] = [];
    setPrdConfigFetchForTests(async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("tszuyyibbyjyznwdpnpe.supabase.co")) {
        return new Response("Invalid API key", { status: 401 });
      }
      if (url === "https://polskirankingdarta.pl/") {
        return new Response(`<script src="/assets/index-NEW.js"></script>`, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      if (url.endsWith("/assets/index-NEW.js")) {
        return new Response(
          `createClient("https://newnewnewnewnewnewnewn.supabase.co","sb_publishable_NEWKEY_ok")`,
          { status: 200 },
        );
      }
      if (url.includes("newnewnewnewnewnewnewn.supabase.co/rest/v1/tournaments")) {
        return new Response('[{"id":"1"}]', {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("nope", { status: 500 });
    });

    const cfg = await resolvePrdConfig();
    expect(cfg.origin).toBe("discovered");
    expect(cfg.url).toBe("https://newnewnewnewnewnewnewn.supabase.co");
    expect(cfg.key).toBe("sb_publishable_NEWKEY_ok");
    expect(calls.some((u) => u.includes("polskirankingdarta.pl"))).toBe(true);
  });

  it("uses working builtin without hitting the SPA", async () => {
    setPrdConfigFetchForTests(async (input) => {
      const url = String(input);
      if (url.includes("tszuyyibbyjyznwdpnpe.supabase.co/rest/v1/tournaments")) {
        return new Response("[]", {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    const cfg = await resolvePrdConfig();
    expect(cfg.origin).toBe("builtin");
  });
});
