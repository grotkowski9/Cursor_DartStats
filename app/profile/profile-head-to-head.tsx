"use client";

import { useMemo, useState } from "react";
import { Swords } from "lucide-react";
import type { N01Match } from "@/lib/n01-parser";
import { computePlayerStats, normalizeName } from "@/lib/stats";

type Props = {
  matches: N01Match[];
};

export function ProfileHeadToHead({ matches }: Props) {
  const [selected, setSelected] = useState<string>("");

  const opponents = useMemo(() => {
    const names = new Map<string, number>(); // normalized name → count
    for (const m of matches) {
      if (m.playerIndex === null) continue;
      const oppIdx = m.playerIndex === 0 ? 1 : 0;
      const name = normalizeName(m.players[oppIdx].name);
      names.set(name, (names.get(name) ?? 0) + 1);
    }
    return Array.from(names.entries())
      .sort((a, b) => b[1] - a[1]) // most played first
      .map(([name, count]) => ({ name, count }));
  }, [matches]);

  const h2hMatches = useMemo(() => {
    if (!selected) return [];
    return matches.filter((m) => {
      if (m.playerIndex === null) return false;
      const oppIdx = m.playerIndex === 0 ? 1 : 0;
      return normalizeName(m.players[oppIdx].name) === selected;
    });
  }, [matches, selected]);

  const stats = useMemo(() => computePlayerStats(h2hMatches), [h2hMatches]);

  // Opponent stats from same matches (flip perspective)
  const oppStats = useMemo(() => {
    if (h2hMatches.length === 0) return null;
    // Create "flipped" matches where opponent is "me"
    const flippedMatches = h2hMatches.map((m) => {
      const oppIdx = (m.playerIndex === 0 ? 1 : 0) as 0 | 1;
      return { ...m, playerIndex: oppIdx } as N01Match;
    });
    return computePlayerStats(flippedMatches);
  }, [h2hMatches]);

  if (opponents.length === 0) return null;

  const legsTotal = stats.legsWon + stats.legsLost;
  const legsPct = legsTotal > 0 ? Math.round((stats.legsWon / legsTotal) * 100) : 0;

  return (
    <section>
      <div className="glass-tile p-5">
        <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest">
          <Swords className="h-3.5 w-3.5 text-accent-from" />
          Head-to-head
        </h2>

        {/* Opponent selector */}
        <div className="relative mb-4">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full appearance-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-foreground focus:border-accent-from focus:outline-none"
          >
            <option value="">— wybierz przeciwnika —</option>
            {opponents.map(({ name, count }) => (
              <option key={name} value={name}>
                {name} ({count} meczów)
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            ▾
          </span>
        </div>

        {selected && stats.matches > 0 && (
          <>
            {/* Win/loss overview */}
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

            {/* Key stats - Ja vs On comparison */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Ja</span>
                <span>vs</span>
                <span>{selected}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 gap-y-1 text-xs">
                <H2HRow label="Mecze" me={`${stats.matches}`} opp={oppStats ? `${oppStats.matches}` : "—"} />
                <H2HRow label="Avg" me={stats.average.toFixed(2)} opp={oppStats?.average.toFixed(2) ?? "—"} highlight />
                <H2HRow label="First 9" me={stats.first9?.toFixed(2) ?? "—"} opp={oppStats?.first9?.toFixed(2) ?? "—"} />
                <H2HRow label="Legi" me={`${stats.legsWon}–${stats.legsLost}`} opp={oppStats ? `${oppStats.legsWon}–${oppStats.legsLost}` : "—"} />
                <H2HRow
                  label="Checkout"
                  me={stats.checkoutRate !== null ? `${Math.round(stats.checkoutRate * 100)}%` : "—"}
                  opp={(oppStats?.checkoutRate !== null && oppStats?.checkoutRate !== undefined) ? `${Math.round(oppStats.checkoutRate * 100)}%` : "—"}
                />
                <H2HRow label="100+" me={stats.buckets.s100.toString()} opp={oppStats?.buckets.s100.toString() ?? "—"} highlight />
                <H2HRow label="140+" me={stats.buckets.s140.toString()} opp={oppStats?.buckets.s140.toString() ?? "—"} violet />
                <H2HRow label="180" me={stats.buckets.s180.toString()} opp={oppStats?.buckets.s180.toString() ?? "—"} signal />
              </div>
            </div>
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
