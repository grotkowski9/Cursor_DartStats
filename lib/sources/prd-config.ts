/** Public REST that the PRD SPA already ships in its JS. Env is optional override. */

export type PrdConfigOrigin = "env" | "builtin" | "discovered";

export type PrdRestConfig = {
  url: string;
  key: string;
  origin: PrdConfigOrigin;
};

export const PRD_SITE_ORIGIN = "https://polskirankingdarta.pl";

/** Last known pair from their public frontend — used first, then rediscovered if dead. */
export const PRD_BUILTIN_CONFIG: Omit<PrdRestConfig, "origin"> = {
  url: "https://tszuyyibbyjyznwdpnpe.supabase.co",
  key: "sb_publishable_eQ2Zk9-K_vbSkTrlxDUYdQ_re4MP4mx",
};

const CACHE_MS = 30 * 60 * 1000;

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

let cache: { config: PrdRestConfig; until: number } | null = null;
let testFetch: FetchLike | null = null;

export function resetPrdConfigCache(): void {
  cache = null;
}

/** Test hook — pass `null` to restore real fetch. */
export function setPrdConfigFetchForTests(fn: FetchLike | null): void {
  testFetch = fn;
  resetPrdConfigCache();
}

function http(input: string | URL, init?: RequestInit): Promise<Response> {
  return (testFetch ?? fetch)(input, init);
}

export function extractPrdConfigFromText(text: string): Omit<PrdRestConfig, "origin"> | null {
  const urls = [...text.matchAll(/https:\/\/[a-z0-9]{10,}\.supabase\.co/gi)].map((m) =>
    m[0].replace(/\/$/, ""),
  );
  const publishable = [...text.matchAll(/sb_publishable_[A-Za-z0-9_-]+/g)].map((m) => m[0]);
  const jwt = [
    ...text.matchAll(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g),
  ].map((m) => m[0]);
  const key = publishable[0] ?? jwt[0];
  const url = urls[0];
  if (!url || !key) return null;
  return { url, key };
}

export function extractPrdScriptUrls(html: string, pageUrl: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /(?:src|href)=["']([^"']+\.js[^"']*)["']/gi;
  for (const m of html.matchAll(re)) {
    const raw = m[1];
    if (/legacy/i.test(raw)) continue;
    let abs: string;
    try {
      abs = new URL(raw, pageUrl).href;
    } catch {
      continue;
    }
    if (seen.has(abs)) continue;
    seen.add(abs);
    out.push(abs);
  }
  out.sort((a, b) => {
    const score = (u: string) => {
      const p = u.toLowerCase();
      if (p.includes("/assets/index-")) return 0;
      if (p.includes("/assets/")) return 1;
      return 2;
    };
    return score(a) - score(b);
  });
  return out;
}

export async function probePrdConfig(config: Omit<PrdRestConfig, "origin">): Promise<boolean> {
  try {
    const target = new URL(`${config.url.replace(/\/$/, "")}/rest/v1/tournaments`);
    target.searchParams.set("select", "id");
    target.searchParams.set("limit", "1");
    const res = await http(target, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") ?? "";
    if (ct && !ct.includes("json")) return false;
    await res.arrayBuffer();
    return true;
  } catch {
    return false;
  }
}

async function discoverFromPrdSite(): Promise<Omit<PrdRestConfig, "origin"> | null> {
  const pageUrl = `${PRD_SITE_ORIGIN}/`;
  const page = await http(pageUrl, { headers: { Accept: "text/html" } });
  if (!page.ok) return null;
  const html = await page.text();
  const inline = extractPrdConfigFromText(html);
  if (inline) return inline;

  const scripts = extractPrdScriptUrls(html, pageUrl).slice(0, 6);
  for (const src of scripts) {
    const jsRes = await http(src, { headers: { Accept: "application/javascript,text/javascript,*/*" } });
    if (!jsRes.ok) continue;
    const js = await jsRes.text();
    const found = extractPrdConfigFromText(js);
    if (found) return found;
  }
  return null;
}

function envConfig(): PrdRestConfig | null {
  const url = process.env.PRD_SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.PRD_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key, origin: "env" };
}

export async function resolvePrdConfig(opts?: { forceDiscover?: boolean }): Promise<PrdRestConfig> {
  const now = Date.now();
  if (!opts?.forceDiscover && cache && now < cache.until) {
    return cache.config;
  }

  const candidates: PrdRestConfig[] = [];
  const env = envConfig();
  if (env) candidates.push(env);
  if (!opts?.forceDiscover) {
    candidates.push({ ...PRD_BUILTIN_CONFIG, origin: "builtin" });
  }

  for (const c of candidates) {
    if (await probePrdConfig(c)) {
      cache = { config: c, until: now + CACHE_MS };
      return c;
    }
  }

  const discovered = await discoverFromPrdSite();
  if (discovered) {
    const cfg: PrdRestConfig = { ...discovered, origin: "discovered" };
    if (await probePrdConfig(cfg)) {
      cache = { config: cfg, until: now + CACHE_MS };
      return cfg;
    }
  }

  throw new Error(
    "Nie mogę połączyć się z API Polskiego Rankingu Darta — wygląda na to, że zmienili adres. Spróbuj za chwilę.",
  );
}

export function prdAuthFailed(status: number): boolean {
  return status === 401 || status === 403 || status === 404;
}
