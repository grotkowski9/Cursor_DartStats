"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronLeft, Share2, Trophy } from "lucide-react";
import type { N01Match, N01Visit } from "@/lib/n01-parser";
import { computeMatchStats, dartWord, normalizeName, type LegStats, type MatchStats } from "@/lib/stats";

type Props = {
  match: N01Match;
};

export function MatchView({ match }: Props) {
  const stats = useMemo(() => computeMatchStats(match), [match]);
  const [copied, setCopied] = useState(false);

  const date = new Date(match.startTime * 1000).toLocaleString("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const shareUrl =
    typeof window !== "undefined" ? window.location.href : `/m/${match.shareToken}`;

  return (
    <>
      <nav>
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Wróć do profilu
        </Link>
      </nav>

      <header className="flex flex-col gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">{date}</p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{match.title}</h1>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {
              /* noop */
            }
          }}
          className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium hover:border-accent-from/50"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Share2 className="h-3.5 w-3.5" />
          )}
          {copied ? "Skopiowano link" : "Udostępnij ten mecz"}
        </button>
      </header>

      <ScoreCard stats={stats} />
      <MatchKpi stats={stats} />

      <section className="flex flex-col gap-4">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-widest">Rzut po rzucie</h2>
        {stats.legs.map((leg) => (
          <LegDetail key={leg.index} leg={leg} match={match} stats={stats} />
        ))}
      </section>
    </>
  );
}

function ScoreCard({ stats }: { stats: MatchStats }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[stats.me, stats.opp].map((p, i) => (
        <div
          key={i}
          className={`rounded-2xl border p-4 backdrop-blur-xl ${
            p.isMe
              ? "border-accent-from/60 bg-accent-from/10"
              : "border-white/10 bg-card/70"
          }`}
        >
          <p className="mb-1 truncate text-xs font-medium">
            {p.isMe && <span className="mr-1 text-accent-from">▸</span>}
            {normalizeName(p.name)}
          </p>
          <p className="text-4xl font-bold tabular-nums text-accent-gradient">{p.legsWon}</p>
          <p className="mt-1 text-[11px] uppercase text-muted-foreground">
            avg {p.average.toFixed(2)}
          </p>
        </div>
      ))}
    </div>
  );
}

function MatchKpi({ stats }: { stats: MatchStats }) {
  const rows: Array<{label: string; me: string | number; opp: string | number; highlight?: boolean; violet?: boolean; signal?: boolean}> = [
    {label: "First 9", me: stats.me.first9?.toFixed(2) ?? "—", opp: stats.opp.first9?.toFixed(2) ?? "—"},
    {label: "60+", me: stats.me.buckets.s60, opp: stats.opp.buckets.s60},
    {label: "80+", me: stats.me.buckets.s80, opp: stats.opp.buckets.s80},
    {label: "100+", me: stats.me.buckets.s100, opp: stats.opp.buckets.s100, highlight: true},
    {label: "120+", me: stats.me.buckets.s120, opp: stats.opp.buckets.s120, highlight: true},
    {label: "140+", me: stats.me.buckets.s140, opp: stats.opp.buckets.s140, violet: true},
    {label: "170+", me: stats.me.buckets.s170, opp: stats.opp.buckets.s170, violet: true},
    {label: "180", me: stats.me.buckets.s180, opp: stats.opp.buckets.s180, signal: true},
    {label: "High finish", me: stats.me.highFinish ?? "—", opp: stats.opp.highFinish ?? "—"},
    {label: "100+ fin.", me: stats.me.finishes100, opp: stats.opp.finishes100},
    {label: "Best leg", me: stats.me.bestLegDarts ?? "—", opp: stats.opp.bestLegDarts ?? "—"},
    {label: "Worst leg", me: stats.me.worstLegDarts ?? "—", opp: stats.opp.worstLegDarts ?? "—"},
    {
      label: "Checkout",
      me: stats.me.checkoutRate !== null
        ? `${Math.round(stats.me.checkoutRate * 100)}% (${stats.me.checkoutHits}/${stats.me.checkoutAttempts})`
        : "—",
      opp: stats.opp.checkoutRate !== null
        ? `${Math.round(stats.opp.checkoutRate * 100)}% (${stats.opp.checkoutHits}/${stats.opp.checkoutAttempts})`
        : "—",
    },
  ];

  return (
    <div className="glass-tile p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest">Details</h2>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3 text-xs">
        {rows.map((row) => {
          const numCls = row.signal
            ? "text-signal font-bold"
            : row.violet
              ? "text-accent-to font-bold"
              : row.highlight
                ? "text-accent-from font-bold"
                : "font-semibold";
          return (
            <div key={row.label} className="contents">
              <span className={`border-b border-white/5 py-1.5 text-right tabular-nums ${numCls}`}>
                {row.me}
              </span>
              <span className="border-b border-white/5 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {row.label}
              </span>
              <span className={`border-b border-white/5 py-1.5 text-left tabular-nums opacity-80 ${numCls}`}>
                {row.opp}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LegDetail({
  leg,
  match,
  stats,
}: {
  leg: LegStats;
  match: N01Match;
  stats: MatchStats;
}) {
  const mineIdx = stats.playerIndex ?? 0;
  const oppIdx = mineIdx === 0 ? 1 : 0;
  const rawLeg = match.legs.find((l) => l.index === leg.index);
  const vMe = rawLeg?.visits[mineIdx] ?? [];
  const vOpp = rawLeg?.visits[oppIdx] ?? [];
  const rounds = Math.max(vMe.length, vOpp.length);
  const winnerIsMe = leg.winnerIdx === mineIdx;
  const winnerName = normalizeName(winnerIsMe ? stats.me.name : stats.opp.name);

  return (
    <div className="glass-tile p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">Leg {leg.index}</span>
        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
          <Trophy className="h-3 w-3" />
          {winnerName}
          {leg.darts ? ` · ${leg.darts} ${dartWord(leg.darts)}` : ""}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg border border-accent-from/40 bg-accent-from/10 px-2.5 py-1.5">
          <span className="text-muted-foreground">avg Ja</span>{" "}
          <span className="font-semibold tabular-nums">{leg.average.toFixed(2)}</span>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
          <span className="text-muted-foreground">avg Opp</span>{" "}
          <span className="font-semibold tabular-nums">{leg.opponentAverage.toFixed(2)}</span>
        </div>
      </div>

      <table className="w-full text-[11px] tabular-nums">
        <thead className="text-muted-foreground/70">
          <tr>
            <th className="py-1 text-left font-normal">#</th>
            <th className="py-1 text-right font-normal">Ja</th>
            <th className="py-1 text-right font-normal">left</th>
            <th className="py-1 text-right font-normal">Opp</th>
            <th className="py-1 text-right font-normal">left</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rounds }).map((_, r) => {
            if (r === 0) return null;
            const a = vMe[r];
            const b = vOpp[r];
            return (
              <tr key={r} className="border-t border-white/5">
                <td className="py-1 text-muted-foreground">{r}</td>
                <td className="py-1 text-right">
                  <VisitCell v={a} />
                </td>
                <td className="py-1 text-right text-muted-foreground">{a?.left ?? ""}</td>
                <td className="py-1 text-right">
                  <VisitCell v={b} />
                </td>
                <td className="py-1 text-right text-muted-foreground">{b?.left ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function VisitCell({ v }: { v: N01Visit | undefined }) {
  if (!v) return <span>—</span>;
  const val = v.actualScore;
  const suffix = v.isCheckout ? ` ✓${v.darts}` : v.isBust ? " ×" : "";
  let cls = "";
  if (val === 180) cls = "rounded bg-signal/10 px-1.5 font-extrabold text-signal";
  else if (val >= 140) cls = "font-bold text-accent-to";
  else if (val >= 100) cls = "font-bold text-accent-from";
  else if (val >= 60) cls = "font-semibold text-foreground";
  else cls = "text-foreground/70";
  return (
    <span className={cls}>
      {val}
      {suffix && <span className="ml-1 text-[9px] opacity-60">{suffix}</span>}
    </span>
  );
}
