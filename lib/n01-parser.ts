import { DEFAULT_CUSTOMER_ID, N01_API } from "@/lib/constants";
import { detectPlayerIndex, applyPlayerIndex } from "@/lib/player-detect";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type N01VisitRaw = { score: number; left: number };

export type N01Visit = {
  score: number;
  left: number;
  actualScore: number;
  darts: number;
  isCheckout: boolean;
  isBust: boolean;
  isSetup: boolean;
};

export type N01Leg = {
  index: number;
  winner: number;
  first: number;
  visits: [N01Visit[], N01Visit[]];
};

export type N01Player = {
  name: string;
  winLegs: number;
  allScore: number;
  allDarts: number;
  average: number;
  isMe: boolean;
};

export type N01Match = {
  tmid: string;
  ttype: "league" | "tournament";
  title: string;
  startTime: number;
  updateTime: number;
  startScore: number;
  players: [N01Player, N01Player];
  legs: N01Leg[];
  snapshotPath: string;
  htmlSnapshotPath: string | null;
  playerIndex: 0 | 1 | null;
  shareToken: string;
  rawPayload?: unknown;
};

export function extractTmidFromUrl(url: string): { tmid: string; ttype: "league" | "tournament" } {
  const u = new URL(url);
  const tmid = u.searchParams.get("tmid");
  if (!tmid) throw new Error("Brak parametru tmid w URL");
  if (!/n01darts\.com/.test(u.hostname)) throw new Error("URL musi pochodzić z n01darts.com");
  const ttype = u.pathname.includes("/league/") ? "league" : "tournament";
  return { tmid, ttype };
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseVisits(raw: N01VisitRaw[]): N01Visit[] {
  const out: N01Visit[] = [];
  let prevLeft = raw[0]?.left ?? 501;
  raw.forEach((v, i) => {
    const isSetup = i === 0;
    if (isSetup) {
      out.push({ ...v, actualScore: 0, darts: 0, isCheckout: false, isBust: false, isSetup: true });
      prevLeft = v.left;
      return;
    }
    if (v.score < 0) {
      const darts = Math.min(3, Math.max(1, -v.score));
      if (v.left === 0) {
        out.push({ ...v, actualScore: prevLeft, darts, isCheckout: true, isBust: false, isSetup: false });
      } else {
        out.push({ ...v, actualScore: 0, darts, isCheckout: false, isBust: true, isSetup: false });
      }
    } else {
      out.push({ ...v, actualScore: v.score, darts: 3, isCheckout: false, isBust: false, isSetup: false });
    }
    prevLeft = v.left;
  });
  return out;
}

export async function computeShareToken(customerId: string, tmid: string): Promise<string> {
  const shareHash = await sha256Hex(`${customerId}:${tmid}`);
  return BigInt(`0x${shareHash.slice(0, 12)}`).toString(36).slice(0, 8);
}

export async function fetchN01Payload(url: string): Promise<{ payload: Record<string, unknown>; jsonText: string; htmlText: string | null; tmid: string; ttype: "league" | "tournament" }> {
  const { tmid, ttype } = extractTmidFromUrl(url);

  const apiRes = await fetch(N01_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: "https://n01darts.com",
      Referer: `https://n01darts.com/n01/${ttype}/n01_view.html?tmid=${tmid}`,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36",
    },
    body: JSON.stringify({ tmid }),
  });
  if (!apiRes.ok) throw new Error(`n01 API zwróciło ${apiRes.status}`);
  const jsonText = await apiRes.text();
  const payload = JSON.parse(jsonText) as Record<string, unknown>;

  let htmlText: string | null = null;
  try {
    const htmlRes = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 DartTracker" } });
    if (htmlRes.ok) htmlText = await htmlRes.text();
  } catch {
    htmlText = null;
  }

  return { payload, jsonText, htmlText, tmid, ttype };
}

export async function parseN01Payload(
  payload: Record<string, unknown>,
  opts: {
    tmid: string;
    ttype: "league" | "tournament";
    snapshotPath: string;
    htmlSnapshotPath: string | null;
    shareToken: string;
    playerIndex?: 0 | 1 | null;
  },
): Promise<N01Match> {
  const stats = (payload.statsData as Record<string, unknown>[]) ?? [];
  const legData = (payload.legData as Record<string, unknown>[]) ?? [];

  const players = stats.slice(0, 2).map((p) => {
    const allScore = Number(p.allScore ?? 0);
    const allDarts = Number(p.allDarts ?? 0);
    const avg = allDarts > 0 ? (allScore / allDarts) * 3 : 0;
    return {
      name: String(p.name ?? "?"),
      winLegs: Number(p.winLegs ?? 0),
      allScore,
      allDarts,
      average: Math.round(avg * 100) / 100,
      isMe: false,
    };
  }) as [N01Player, N01Player];

  let playerIndex = opts.playerIndex ?? null;
  if (playerIndex === null || playerIndex === undefined) {
    const detection = detectPlayerIndex([players[0].name, players[1].name]);
    if (detection.status === "auto") {
      playerIndex = detection.playerIndex;
    }
  }
  if (playerIndex === 0 || playerIndex === 1) {
    applyPlayerIndex(players, playerIndex);
  }

  const legs: N01Leg[] = legData.map((leg, i) => {
    const pd = (leg.playerData ?? []) as N01VisitRaw[][];
    return {
      index: i + 1,
      winner: Number(leg.winner ?? -1),
      first: Number(leg.first ?? 0),
      visits: [parseVisits(pd[0] ?? []), parseVisits(pd[1] ?? [])] as [N01Visit[], N01Visit[]],
    };
  });

  return {
    tmid: opts.tmid,
    ttype: opts.ttype,
    title: String(payload.title ?? "(bez tytułu)"),
    startTime: Number(payload.startTime ?? 0),
    updateTime: Number(payload.updateTime ?? 0),
    startScore: Number(payload.startScore ?? 501),
    players,
    legs,
    snapshotPath: opts.snapshotPath,
    htmlSnapshotPath: opts.htmlSnapshotPath,
    playerIndex: playerIndex ?? null,
    shareToken: opts.shareToken,
    rawPayload: payload,
  };
}

export async function backupToStorage(
  customerId: string,
  ttype: "league" | "tournament",
  tmid: string,
  jsonText: string,
  htmlText: string | null,
): Promise<{ snapshotPath: string; htmlSnapshotPath: string | null; payloadHash: string }> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hash = (await sha256Hex(jsonText)).slice(0, 16);
  const basePath = `${customerId}/${ttype}/${yyyy}/${mm}/${dd}/${tmid}_${hash}`;
  const snapshotPath = `${basePath}.json`;
  const htmlSnapshotPath = htmlText ? `${basePath}.html` : null;

  const { error: jsonErr } = await supabase.storage
    .from("dart-snapshots")
    .upload(snapshotPath, new Blob([jsonText], { type: "application/json" }), { upsert: true });
  if (jsonErr) throw new Error(`Backup JSON: ${jsonErr.message}`);

  if (htmlText && htmlSnapshotPath) {
    const { error: htmlErr } = await supabase.storage
      .from("dart-snapshots")
      .upload(htmlSnapshotPath, new Blob([htmlText], { type: "text/html" }), { upsert: true });
    if (htmlErr) throw new Error(`Backup HTML: ${htmlErr.message}`);
  }

  return { snapshotPath, htmlSnapshotPath, payloadHash: hash };
}

export async function parseAndBackupN01(
  url: string,
  playerIndex?: 0 | 1 | null,
  customerId: string = DEFAULT_CUSTOMER_ID,
): Promise<N01Match> {
  const { payload, jsonText, htmlText, tmid, ttype } = await fetchN01Payload(url);
  const shareToken = await computeShareToken(customerId, tmid);
  const { snapshotPath, htmlSnapshotPath } = await backupToStorage(customerId, ttype, tmid, jsonText, htmlText);
  return parseN01Payload(payload, {
    tmid,
    ttype,
    snapshotPath,
    htmlSnapshotPath,
    shareToken,
    playerIndex,
  });
}

