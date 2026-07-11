// KPI 1:1 z arkuszem `testdane.xlsx` (source of truth):
//   Legs / 3-Darts Avg / First 9 / 60+ / 80+ / 100+ / 120+ / 140+ / 170+ / 180's
//   / High Finish / 100+ Finishes / Best Leg (darts) / Worst Leg (darts) / Checkout %.
//
// Wszystkie liczby zdobyte pkt liczymy po `visit.actualScore`, a nie `visit.score`
// (surowe pole n01 bywa ujemne — patrz `parseVisits` w n01-parser.ts).

import type { N01Match, N01Visit, N01Leg } from "@/lib/n01-parser";

export type ScoreBuckets = {
  s60: number;   // [60,80)
  s80: number;   // [80,100)
  s100: number;  // [100,120)
  s120: number;  // [120,140)
  s140: number;  // [140,170)
  s170: number;  // [170,180)
  s180: number;  // 180
};

export type PlayerBox = {
  name: string;
  isMe: boolean;
  legsWon: number;
  average: number;      // 3-dart, ważony (allScore/allDarts*3)
  first9: number | null;
  buckets: ScoreBuckets;
  highFinish: number | null;
  finishes100: number;  // liczba checkoutów >= 100
  bestLegDarts: number | null;   // najkrótszy wygrany leg
  worstLegDarts: number | null;  // najdłuższy wygrany leg
  checkoutRate: number | null;   // wygrane legi / próby na double (aproks.)
  checkoutHits: number;
  checkoutAttempts: number;
};

export type LegStats = {
  index: number;
  won: boolean;             // z perspektywy `playerIndex` (fallback: p0)
  winnerIdx: number;
  playerVisits: N01Visit[];   // widok „ja”
  opponentVisits: N01Visit[];
  average: number;
  opponentAverage: number;
  first9: number | null;
  scored: number;
  darts: number;
  checkout: number | null;
};

export type MatchStats = {
  match: N01Match;
  playerIndex: 0 | 1 | null;
  me: PlayerBox;         // p1 na karcie
  opp: PlayerBox;
  won: boolean | null;
  legs: LegStats[];
  bestLegAvg: number | null;
  worstLegAvg: number | null;
  shortestLegDarts: number | null;
  highestCheckout: number | null;
};

const EMPTY_BUCKETS: ScoreBuckets = {
  s60: 0, s80: 0, s100: 0, s120: 0, s140: 0, s170: 0, s180: 0,
};

function bucketOf(score: number, b: ScoreBuckets) {
  if (score === 180) b.s180++;
  else if (score >= 170) b.s170++;
  else if (score >= 140) b.s140++;
  else if (score >= 120) b.s120++;
  else if (score >= 100) b.s100++;
  else if (score >= 80) b.s80++;
  else if (score >= 60) b.s60++;
}

function realVisits(vs: N01Visit[]): N01Visit[] {
  // pomijamy setup (indeks 0)
  return vs.filter((v) => !v.isSetup);
}

function calcAvg3(totalScore: number, totalDarts: number): number {
  if (totalDarts === 0) return 0;
  return Math.round((totalScore / totalDarts) * 3 * 100) / 100;
}

function calcFirst9(vs: N01Visit[]): number | null {
  const first3 = vs.slice(0, 3);
  if (first3.length < 3) return null;
  const scored = first3.reduce((s, v) => s + v.actualScore, 0);
  const darts = first3.reduce((s, v) => s + v.darts, 0);
  return calcAvg3(scored, darts);
}

function buildBox(match: N01Match, playerIdx: number): PlayerBox {
  const p = match.players[playerIdx];
  const buckets: ScoreBuckets = { ...EMPTY_BUCKETS };
  let highFinish: number | null = null;
  let finishes100 = 0;
  const wonLegDarts: number[] = [];
  const first9s: number[] = [];
  let checkoutHits = 0;
  let checkoutAttempts = 0;

  for (const leg of match.legs) {
    const vs = realVisits(leg.visits[playerIdx] ?? []);
    for (const v of vs) {
      // rozkład 60+/80+/…/180 liczymy po ZDOBYTYCH pkt (bez bustów, bez setupu)
      if (v.actualScore > 0) bucketOf(v.actualScore, buckets);

      // próba na double: przed wizytą left ≤ 170 (aproks., n01 nie daje per-dart)
      // = po tej wizycie left ≤ 170 lub isCheckout / isBust z wysokiej próby
      const leftBefore = v.left + (v.isCheckout ? v.actualScore : v.isBust ? 0 : v.actualScore);
      if (leftBefore <= 170 && leftBefore > 1) {
        checkoutAttempts++;
      }
    }

    const f9 = calcFirst9(vs);
    if (f9 !== null) first9s.push(f9);

    if (leg.winner === playerIdx) {
      const darts = vs.reduce((s, v) => s + v.darts, 0);
      wonLegDarts.push(darts);
      checkoutHits++;
      const last = vs[vs.length - 1];
      if (last?.isCheckout) {
        if (highFinish === null || last.actualScore > highFinish) highFinish = last.actualScore;
        if (last.actualScore >= 100) finishes100++;
      }
    }
  }

  const first9 = first9s.length
    ? Math.round((first9s.reduce((s, x) => s + x, 0) / first9s.length) * 100) / 100
    : null;

  return {
    name: p.name,
    isMe: p.isMe,
    legsWon: p.winLegs,
    average: p.average,
    first9,
    buckets,
    highFinish,
    finishes100,
    bestLegDarts: wonLegDarts.length ? Math.min(...wonLegDarts) : null,
    worstLegDarts: wonLegDarts.length ? Math.max(...wonLegDarts) : null,
    checkoutRate: checkoutAttempts ? checkoutHits / checkoutAttempts : null,
    checkoutHits,
    checkoutAttempts,
  };
}

export function computeMatchStats(m: N01Match): MatchStats {
  const meIdx = m.playerIndex;
  const mineIdx = meIdx ?? 0;
  const oppIdx = mineIdx === 0 ? 1 : 0;
  const me = buildBox(m, mineIdx);
  const opp = buildBox(m, oppIdx);

  const legs: LegStats[] = m.legs.map((leg: N01Leg) => {
    const mine = realVisits(leg.visits[mineIdx] ?? []);
    const oppV = realVisits(leg.visits[oppIdx] ?? []);
    const scored = mine.reduce((s, v) => s + v.actualScore, 0);
    const darts = mine.reduce((s, v) => s + v.darts, 0);
    const oppScored = oppV.reduce((s, v) => s + v.actualScore, 0);
    const oppDarts = oppV.reduce((s, v) => s + v.darts, 0);
    const wonLeg = leg.winner === mineIdx;
    const last = mine[mine.length - 1];
    const checkout = wonLeg && last?.isCheckout ? last.actualScore : null;
    return {
      index: leg.index,
      won: wonLeg,
      winnerIdx: leg.winner,
      playerVisits: mine,
      opponentVisits: oppV,
      average: calcAvg3(scored, darts),
      opponentAverage: calcAvg3(oppScored, oppDarts),
      first9: calcFirst9(mine),
      scored,
      darts,
      checkout,
    };
  });

  const wonLegs = legs.filter((l) => l.won);
  const bestLegAvg = wonLegs.length ? Math.max(...wonLegs.map((l) => l.average)) : null;
  const worstLegAvg = wonLegs.length ? Math.min(...wonLegs.map((l) => l.average)) : null;
  const shortestLegDarts = wonLegs.length ? Math.min(...wonLegs.map((l) => l.darts)) : null;
  const highestCheckout = me.highFinish;
  const won = meIdx === null ? null : me.legsWon > opp.legsWon;

  return {
    match: m,
    playerIndex: meIdx,
    me,
    opp,
    won,
    legs,
    bestLegAvg,
    worstLegAvg,
    shortestLegDarts,
    highestCheckout,
  };
}

export type PlayerStats = {
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  legsWon: number;
  legsLost: number;
  average: number;
  first9: number | null;
  buckets: ScoreBuckets;
  highFinish: number | null;
  finishes100: number;
  bestLegDarts: number | null;
  worstLegDarts: number | null;
  checkoutRate: number | null;
  checkoutHits: number;
  checkoutAttempts: number;
};

const EMPTY_STATS: PlayerStats = {
  matches: 0, wins: 0, losses: 0, winRate: 0,
  legsWon: 0, legsLost: 0, average: 0, first9: null,
  buckets: { ...EMPTY_BUCKETS },
  highFinish: null, finishes100: 0,
  bestLegDarts: null, worstLegDarts: null,
  checkoutRate: null, checkoutHits: 0, checkoutAttempts: 0,
};

export function computePlayerStats(matches: N01Match[]): PlayerStats {
  if (matches.length === 0) return EMPTY_STATS;
  const per = matches.map(computeMatchStats).filter((s) => s.playerIndex !== null);
  if (per.length === 0) return EMPTY_STATS;

  const buckets: ScoreBuckets = { ...EMPTY_BUCKETS };
  let totalScored = 0;
  let totalDarts = 0;
  let legsWon = 0;
  let legsLost = 0;
  const first9s: number[] = [];
  let highFinish: number | null = null;
  let finishes100 = 0;
  const bestLegs: number[] = [];
  const worstLegs: number[] = [];
  let checkoutHits = 0;
  let checkoutAttempts = 0;
  let wins = 0;
  let losses = 0;

  for (const s of per) {
    const me = s.me;
    (Object.keys(buckets) as (keyof ScoreBuckets)[]).forEach((k) => {
      buckets[k] += me.buckets[k];
    });
    // reconstruct scored/darts from match.players (weighted average)
    const idx = s.playerIndex!;
    totalScored += s.match.players[idx].allScore;
    totalDarts += s.match.players[idx].allDarts;
    legsWon += me.legsWon;
    legsLost += s.opp.legsWon;
    if (me.first9 !== null) first9s.push(me.first9);
    if (me.highFinish !== null && (highFinish === null || me.highFinish > highFinish)) {
      highFinish = me.highFinish;
    }
    finishes100 += me.finishes100;
    if (me.bestLegDarts !== null) bestLegs.push(me.bestLegDarts);
    if (me.worstLegDarts !== null) worstLegs.push(me.worstLegDarts);
    checkoutHits += me.checkoutHits;
    checkoutAttempts += me.checkoutAttempts;
    if (s.won === true) wins++;
    else if (s.won === false) losses++;
  }

  return {
    matches: per.length,
    wins,
    losses,
    winRate: per.length ? wins / per.length : 0,
    legsWon,
    legsLost,
    average: calcAvg3(totalScored, totalDarts),
    first9: first9s.length ? Math.round((first9s.reduce((s, x) => s + x, 0) / first9s.length) * 100) / 100 : null,
    buckets,
    highFinish,
    finishes100,
    bestLegDarts: bestLegs.length ? Math.min(...bestLegs) : null,
    worstLegDarts: worstLegs.length ? Math.max(...worstLegs) : null,
    checkoutRate: checkoutAttempts ? checkoutHits / checkoutAttempts : null,
    checkoutHits,
    checkoutAttempts,
  };
}

/** Polish city names (normalized: no diacritics, lowercase) to strip from player names. */
const CITY_BLACKLIST = new Set([
  // Silesia — most common darts region
  "katowice", "gliwice", "zabrze", "bytom", "sosnowiec", "chorzow",
  "siemianowice", "tychy", "myslowice", "jaworzno", "dabrowa", "bedzin",
  "czeladz", "zabkowice", "slawkow", "wojkowice", "piekary", "radzionkow",
  "knurow", "pyskowice", "tarnowskie", "jastrzebie", "zory", "mikolow",
  "laziska", "ornontowice", "imielin", "ruda",
  // Other major Polish cities
  "krakow", "warszawa", "wroclaw", "poznan", "lodz", "gdansk", "gdynia",
  "szczecin", "bydgoszcz", "lublin", "bialystok", "rzeszow", "opole",
  "czestochowa", "radom", "kielce", "olsztyn", "torun", "tarnow",
  "koszalin", "legnica", "rybnik",
  // Adjective forms
  "slaskie", "slaski", "slaska", "gorne", "gorny", "gorna",
]);

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Normalize player display name:
 * 1. Strip "/" variant suffix (N01 sometimes uses "Name/Alt")
 * 2. Remove parenthesized content "(Katowice)"
 * 3. Remove standalone Polish city name words
 * 4. Title-case if ALL_CAPS or all_lowercase (pseudonyms left as-is)
 */
export function normalizeName(raw: string): string {
  let s = raw.split("/")[0].trim();
  // Remove parenthesized segments: "Jan Kowalski (Katowice)" → "Jan Kowalski"
  s = s.replace(/\s*\([^)]*\)/g, "").trim();
  // Strip city words
  const words = s.split(/\s+/).filter((w) => {
    const norm = stripDiacritics(w.replace(/[.,;:]/g, ""));
    return norm.length > 0 && !CITY_BLACKLIST.has(norm);
  });
  s = words.join(" ").trim();
  if (!s) return raw.split("/")[0].trim(); // fallback if everything was stripped

  const hasUpper = /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(s);
  const hasLower = /[a-ząćęłńóśźż]/.test(s);
  if (hasUpper && hasLower) return s; // already mixed / pseudonym
  return s
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

/** Polish declension: 1 → lotka, 2/3/4 → lotki (not 12-14), rest → lotek */
export function dartWord(n: number): string {
  if (n === 1) return "lotka";
  const lastTwo = n % 100;
  const lastOne = n % 10;
  if (lastTwo >= 12 && lastTwo <= 14) return "lotek";
  if (lastOne >= 2 && lastOne <= 4) return "lotki";
  return "lotek";
}

export type TimeRange = "30d" | "90d" | "180d" | "365d" | "all";

const RANGE_DAYS: Record<Exclude<TimeRange, "all">, number> = {
  "30d": 30, "90d": 90, "180d": 180, "365d": 365,
};

export function filterByRange(matches: N01Match[], range: TimeRange): N01Match[] {
  if (range === "all") return matches;
  const cutoff = Date.now() / 1000 - RANGE_DAYS[range] * 86400;
  return matches.filter((m) => m.startTime >= cutoff);
}

// ---------- 2.1.1 Top N najczęstszych podejść ----------
// Liczymy identyczne `actualScore` z wizyt gracza (bez setupu, bez bustów, > 0).
export type TopThrow = { value: number; count: number };

export function computeTopThrows(matches: N01Match[], n = 10): TopThrow[] {
  const counts = new Map<number, number>();
  for (const m of matches) {
    const meIdx = m.playerIndex;
    if (meIdx === null) continue;
    for (const leg of m.legs) {
      for (const v of leg.visits[meIdx]) {
        if (v.isSetup || v.isBust) continue;
        if (v.actualScore <= 0) continue;
        counts.set(v.actualScore, (counts.get(v.actualScore) ?? 0) + 1);
      }
    }
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || b.value - a.value)
    .slice(0, n);
}

// ---------- 2.1.2 Wykres formy (per mecz w czasie) ----------
export type FormPoint = {
  startTime: number;
  dateLabel: string;
  average: number;
  first9: number | null;
  won: boolean | null;
  shareToken: string;
};

export function computeFormSeries(matches: N01Match[]): FormPoint[] {
  return matches
    .slice()
    .sort((a, b) => a.startTime - b.startTime)
    .map((m) => {
      const s = computeMatchStats(m);
      const d = new Date(m.startTime * 1000);
      return {
        startTime: m.startTime,
        dateLabel: `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`,
        average: s.me.average,
        first9: s.me.first9,
        won: s.won,
        shareToken: m.shareToken,
      };
    });
}

// ---------- 2.1.4 Ostatnie 5 meczów ----------
export type RecentMatch = {
  shareToken: string;
  oppName: string;
  won: boolean | null;
  average: number;
  legsMe: number;
  legsOpp: number;
  startTime: number;
};

export function computeLast5(matches: N01Match[]): RecentMatch[] {
  return matches
    .slice()
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 5)
    .map((m) => {
      const s = computeMatchStats(m);
      return {
        shareToken: m.shareToken,
        oppName: normalizeName(s.opp.name),
        won: s.won,
        average: s.me.average,
        legsMe: s.me.legsWon,
        legsOpp: s.opp.legsWon,
        startTime: m.startTime,
      };
    });
}

// ---------- 5.1 Top N najczęstszych zamknięć (checkoutów) ----------
// Wartość zamknięcia lega przez „ja" (actualScore wizyty z isCheckout), niezależnie
// od liczby lotek (1/2/3). Sortowanie: częstość desc, potem wartość desc.
export function computeTopCheckouts(matches: N01Match[], n = 10): TopThrow[] {
  const counts = new Map<number, number>();
  for (const m of matches) {
    const meIdx = m.playerIndex;
    if (meIdx === null) continue;
    for (const leg of m.legs) {
      if (leg.winner !== meIdx) continue;
      for (const v of leg.visits[meIdx]) {
        if (v.isCheckout && v.actualScore > 0) {
          counts.set(v.actualScore, (counts.get(v.actualScore) ?? 0) + 1);
        }
      }
    }
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || b.value - a.value)
    .slice(0, n);
}

// ---------- 2.2 Aktywność: statystyki per dzień tygodnia ----------
const DAY_LABELS_PL = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

export type DayStats = {
  day: number;     // 0 = poniedziałek, 6 = niedziela
  label: string;
  count: number;
  wins: number;
  losses: number;
  winRate: number;
  avg: number;
};

export function computeDayStats(matches: N01Match[]): DayStats[] {
  const days: DayStats[] = DAY_LABELS_PL.map((label, day) => ({
    day, label, count: 0, wins: 0, losses: 0, winRate: 0, avg: 0,
  }));
  const scored = Array<number>(7).fill(0);
  const darts = Array<number>(7).fill(0);

  for (const m of matches) {
    const d = new Date(m.startTime * 1000);
    const day = (d.getDay() + 6) % 7; // 0 = Monday
    const s = computeMatchStats(m);
    days[day].count++;
    if (s.won === true) days[day].wins++;
    else if (s.won === false) days[day].losses++;
    if (m.playerIndex !== null) {
      scored[day] += m.players[m.playerIndex].allScore;
      darts[day] += m.players[m.playerIndex].allDarts;
    }
  }

  return days.map((d, i) => ({
    ...d,
    winRate: d.count > 0 ? d.wins / d.count : 0,
    avg: darts[i] > 0 ? Math.round((scored[i] / darts[i]) * 3 * 100) / 100 : 0,
  }));
}

// ---------- 2.4 Rozkład prób zamknięć (checkout distribution) ----------
const CHECKOUT_RANGES = [
  { range: "2–20",    min: 2,   max: 20  },
  { range: "21–40",   min: 21,  max: 40  },
  { range: "41–60",   min: 41,  max: 60  },
  { range: "61–80",   min: 61,  max: 80  },
  { range: "81–100",  min: 81,  max: 100 },
  { range: "101–120", min: 101, max: 120 },
  { range: "121–140", min: 121, max: 140 },
  { range: "141–170", min: 141, max: 170 },
];

export type CheckoutBucket = {
  range: string;
  min: number;
  max: number;
  attempts: number;
  hits: number;
  rate: number;
};

export function computeCheckoutDistribution(matches: N01Match[]): CheckoutBucket[] {
  const buckets: CheckoutBucket[] = CHECKOUT_RANGES.map((r) => ({ ...r, attempts: 0, hits: 0, rate: 0 }));

  for (const m of matches) {
    const meIdx = m.playerIndex;
    if (meIdx === null) continue;
    for (const leg of m.legs) {
      const vs = (leg.visits[meIdx] ?? []).filter((v) => !v.isSetup);
      for (const v of vs) {
        // leftBefore = score the player was on before this visit
        const leftBefore = v.left + v.actualScore;
        if (leftBefore < 2 || leftBefore > 170) continue;
        const bucket = buckets.find((b) => leftBefore >= b.min && leftBefore <= b.max);
        if (!bucket) continue;
        bucket.attempts++;
        if (v.isCheckout) bucket.hits++;
      }
    }
  }

  return buckets
    .map((b) => ({ ...b, rate: b.attempts > 0 ? b.hits / b.attempts : 0 }));
}


