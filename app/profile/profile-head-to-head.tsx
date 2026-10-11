"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Swords } from "lucide-react";
import type { N01Match } from "@/lib/n01-parser";
import { displayMatchTitle } from "@/lib/match-title";
import {
  computeMatchStats,
  computePlayerStats,
  normalizeName,
  type MatchStats,
  type PlayerStats,
} from "@/lib/stats";
import type { DemoH2HStats } from "@/lib/demo-snapshot";

type Props = {
  matches?: N01Match[];
  opponents?: { name: string; count: number }[];
  h2hByOpponent?: Record<string, DemoH2HStats>;
  matchPathPrefix?: string;
  matchStatsByToken?: Record<string, MatchStats>;
};

export function ProfileHeadToHead({
  matches = [],
  opponents: opponentsProp,
  h2hByOpponent,
  matchPathPrefix = "/m/",
  matchStatsByToken,
}: Props) {
  const [selected, setSelected] = useState<string>("");

  const opponents = useMemo(() => {
    if (opponentsProp) return opponentsProp;
    const names = new Map<string, number>();
    for (const m of matches) {
      if (m.playerIndex === null) continue;
      const oppIdx = m.playerIndex === 0 ? 1 : 0;
      const name = normalizeName(m.players[oppIdx].name);
      names.set(name, (names.get(name) ?? 0) + 1);
    }
    return Array.from(names.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [matches, opponentsProp]);

  const h2hMatches = useMemo(() => {
    if (!selected) return [];
    return matches
      .filter((m) => {
        if (m.playerIndex === null) return false;
        const oppIdx = m.playerIndex === 0 ? 1 : 0;
        return normalizeName(m.players[oppIdx].name) === selected;
      })
      .slice()
      .sort((a, b) => b.startTime - a.startTime);
  }, [matches, selected]);

  const stats: PlayerStats = useMemo(() => {
    if (h2hByOpponent && selected) return h2hByOpponent[selected]?.stats ?? computePlayerStats([]);
    return computePlayerStats(h2hMatches);
  }, [h2hByOpponent, selected, h2hMatches]);

  const oppStats = useMemo(() => {
    if (h2hByOpponent && selected) return h2hByOpponent[selected]?.oppStats ?? null;
    if (h2hMatches.length === 0) return null;
    const flippedMatches = h2hMatches.map((m) => {
      const oppIdx = (m.playerIndex === 0 ? 1 : 0) as 0 | 1;
      return { ...m, playerIndex: oppIdx } as N01Match;
    });
    return computePlayerStats(flippedMatches);
  }, [h2hByOpponent, selected, h2hMatches]);

  if (opponents.length === 0) return null;

  return (
    <section>
      <div className="glass-tile p-5">
        <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest">
          <Swords className="h-3.5 w-3.5 text-accent-from" />
          Head-to-head
        </h2>

        <div className="relative mb-4">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full appearance-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-foreground focus:border-accent-from focus:outline-none"
          >
            <option value="">— wybierz przeciwnika —</option>
            {opponents.map(({ name, count }) => (
              <option key={name} value={name}>
                {name} ({count} {plMatches(count)})
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            ▾
          </span>
        </div>

        {selected && stats.matches > 0 && (
          <>
            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <p className="text-2xl font-bold tabular-nums text-emerald-300">{stats.wins}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400/70">
                  Win
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-2xl font-bold tabular-nums text-accent-gradient">
                  {Math.round(stats.winRate * 100)}%
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Win rate
                </p>
              </div>
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-2xl font-bold tabular-nums text-red-300">{stats.losses}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400/70">
                  Loss
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Ja</span>
                <span>vs</span>
                <span>{selected}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 gap-y-1 text-xs">
                <H2HRow label="Avg" me={stats.average.toFixed(2)} opp={oppStats?.average.toFixed(2) ?? "—"} highlight />
                <H2HRow label="First 9" me={stats.first9?.toFixed(2) ?? "—"} opp={oppStats?.first9?.toFixed(2) ?? "—"} />
                <H2HRow
                  label="Legi"
                  me={`${stats.legsWon}–${stats.legsLost}`}
                  opp={oppStats ? `${oppStats.legsWon}–${oppStats.legsLost}` : "—"}
                />
                <H2HRow
                  label="Checkout"
                  me={stats.checkoutRate !== null ? `${Math.round(stats.checkoutRate * 100)}%` : "—"}
                  opp={
                    oppStats?.checkoutRate !== null && oppStats?.checkoutRate !== undefined
                      ? `${Math.round(oppStats.checkoutRate * 100)}%`
                      : "—"
                  }
                />
                <H2HRow label="100+" me={stats.buckets.s100.toString()} opp={oppStats?.buckets.s100.toString() ?? "—"} highlight />
                <H2HRow label="140+" me={stats.buckets.s140.toString()} opp={oppStats?.buckets.s140.toString() ?? "—"} violet />
                <H2HRow label="180" me={stats.buckets.s180.toString()} opp={oppStats?.buckets.s180.toString() ?? "—"} signal />
              </div>
            </div>

            <ul className="mt-3 space-y-2">
              {h2hMatches.map((match) => {
                const rowStats = matchStatsByToken?.[match.shareToken] ?? computeMatchStats(match);
                return (
                  <H2HMeetingRow
                    key={match.shareToken || match.tmid}
                    match={match}
                    stats={rowStats}
                    href={`${matchPathPrefix}${match.shareToken}`}
                  />
                );
              })}
            </ul>
          </>
        )}

        {selected && stats.matches === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Brak meczów z tym przeciwnikiem w wybranym zakresie.
          </p>
        )}
      </div>
    </section>
  );
}

function plMatches(n: number): string {
  if (n === 1) return "mecz";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "mecze";
  return "meczów";
}

function H2HMeetingRow({
  match,
  stats,
  href,
}: {
  match: N01Match;
  stats: MatchStats;
  href: string;
}) {
  const date = new Date(match.startTime * 1000).toLocaleDateString("pl-PL", {
    dateStyle: "medium",
  });
  const winnerLabel =
    stats.won === true ? "Ty" : stats.won === false ? normalizeName(stats.opp.name) : "—";

  return (
    <li className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{date}</p>
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
            stats.won === true
              ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
              : stats.won === false
                ? "border border-red-500/40 bg-red-500/15 text-red-300"
                : "border border-white/10 bg-white/5 text-muted-foreground"
          }`}
        >
          {stats.won === true ? "W" : stats.won === false ? "L" : "—"}
        </span>
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">
        {displayMatchTitle(match.title)}
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          Avg{" "}
          <span className="font-semibold text-accent-from">{stats.me.average.toFixed(2)}</span>
          <span className="mx-1">–</span>
          <span className="font-semibold text-foreground/80">{stats.opp.average.toFixed(2)}</span>
        </span>
        <span>
          {winnerLabel}{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {stats.me.legsWon}–{stats.opp.legsWon}
          </span>
        </span>
      </div>
      <Link
        href={href}
        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-accent-from hover:underline"
      >
        Przejdź do szczegółów
        <ArrowRight className="h-3 w-3" />
      </Link>
    </li>
  );
}

function H2HRow({
  label,
  me,
  opp,
  highlight,
  violet,
  signal,
}: {
  label: string;
  me: string;
  opp: string;
  highlight?: boolean;
  violet?: boolean;
  signal?: boolean;
}) {
  const valCls = signal
    ? "text-signal font-bold"
    : violet
      ? "text-accent-to font-bold"
      : highlight
        ? "text-accent-from font-bold"
        : "font-semibold text-foreground";
  return (
    <>
      <span className={`border-b border-white/5 py-1.5 text-right tabular-nums ${valCls}`}>
        {me}
      </span>
      <span className="border-b border-white/5 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={`border-b border-white/5 py-1.5 text-left tabular-nums ${valCls}`}>
        {opp}
      </span>
    </>
  );
}
