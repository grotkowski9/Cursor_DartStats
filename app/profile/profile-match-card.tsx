"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Share2 } from "lucide-react";
import type { N01Match } from "@/lib/n01-parser";
import { computeMatchStats, normalizeName, type MatchStats } from "@/lib/stats";

type Props = {
  match: N01Match;
  defaultExpanded?: boolean;
  /** Override display name for "me" player (use customer lastName + firstName) */
  myDisplayName?: string;
};

export function ProfileMatchCard({ match, defaultExpanded = false, myDisplayName }: Props) {
  const stats = useMemo(() => computeMatchStats(match), [match]);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);

  const date = new Date(match.startTime * 1000).toLocaleString("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const myName = myDisplayName ?? normalizeName(stats.me.name);
  const oppName = normalizeName(stats.opp.name);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/m/${match.shareToken}`
      : `/m/${match.shareToken}`;

  return (
    <article className="glass-tile overflow-hidden">
      {/* Compact header — always visible, click to expand */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {/* Win/Loss badge */}
        {stats.won !== null ? (
          <span
            className={`shrink-0 rounded-md w-7 h-7 flex items-center justify-center text-[10px] font-bold uppercase ${
              stats.won
                ? "border border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                : "border border-red-500/40 bg-red-500/15 text-red-300"
            }`}
          >
            {stats.won ? "W" : "L"}
          </span>
        ) : (
          <span className="shrink-0 h-7 w-7 rounded-md border border-white/10 bg-white/5" />
        )}

        {/* Names + score + date/avg */}
        <div className="min-w-0 flex-1">
          {/* Name row: my name | score | opp name */}
          <div className="flex items-center gap-2 text-[11px]">
            <span
              className={`min-w-0 flex-1 truncate font-semibold ${
                stats.won === true
                  ? "text-emerald-300"
                  : stats.won === false
                    ? "text-red-300"
                    : "text-foreground"
              }`}
            >
              {myName}
            </span>
            <span className="shrink-0 text-[13px] font-bold tabular-nums text-foreground">
              {stats.me.legsWon}:{stats.opp.legsWon}
            </span>
            <span className="min-w-0 flex-1 truncate text-right text-muted-foreground">
              {oppName}
            </span>
          </div>
          {/* Meta: date + avg */}
          <div className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>{date}</span>
            <span className="font-semibold text-accent-from">{stats.me.average.toFixed(2)}</span>
          </div>
        </div>

        {/* Expand chevron */}
        <div className="shrink-0 text-muted-foreground/60">
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </div>
      </button>

      {/* Expanded KPI grid */}
      {expanded && (
        <div className="border-t border-white/5 px-4 pb-4 pt-3">
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            <KpiRow label="3-dart" me={stats.me.average.toFixed(2)} opp={stats.opp.average.toFixed(2)} />
            <KpiRow
              label="First 9"
              me={stats.me.first9?.toFixed(2) ?? "—"}
              opp={stats.opp.first9?.toFixed(2) ?? "—"}
            />
            <KpiRow label="60+" me={stats.me.buckets.s60} opp={stats.opp.buckets.s60} />
            <KpiRow label="80+" me={stats.me.buckets.s80} opp={stats.opp.buckets.s80} />
            <KpiRow label="100+" me={stats.me.buckets.s100} opp={stats.opp.buckets.s100} highlight />
            <KpiRow label="140+" me={stats.me.buckets.s140} opp={stats.opp.buckets.s140} violet />
            <KpiRow label="180" me={stats.me.buckets.s180} opp={stats.opp.buckets.s180} signal />
            <KpiRow label="High fin." me={stats.me.highFinish ?? "—"} opp={stats.opp.highFinish ?? "—"} />
            <KpiRow label="100+ fin." me={stats.me.finishes100} opp={stats.opp.finishes100} />
            <KpiRow label="Best leg" me={stats.me.bestLegDarts ?? "—"} opp={stats.opp.bestLegDarts ?? "—"} />
            <KpiRow label="Worst leg" me={stats.me.worstLegDarts ?? "—"} opp={stats.opp.worstLegDarts ?? "—"} />
            <KpiRow
              label="Checkout"
              me={
                stats.me.checkoutRate !== null
                  ? `${Math.round(stats.me.checkoutRate * 100)}% (${stats.me.checkoutHits}/${stats.me.checkoutAttempts})`
                  : "—"
              }
              opp={
                stats.opp.checkoutRate !== null
                  ? `${Math.round(stats.opp.checkoutRate * 100)}% (${stats.opp.checkoutHits}/${stats.opp.checkoutAttempts})`
                  : "—"
              }
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <Link
              href={`/m/${match.shareToken}`}
              className="text-xs font-medium text-primary/90 underline-offset-4 hover:text-primary hover:underline"
            >
              Rzut po rzucie →
            </Link>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                } catch {
                  /* noop */
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-from/50 hover:bg-accent-from/10"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              {copied ? "Skopiowano" : "Udostępnij mecz"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function KpiRow({
  label,
  me,
  opp,
  highlight,
  violet,
  signal,
}: {
  label: string;
  me: string | number;
  opp: string | number;
  highlight?: boolean;
  violet?: boolean;
  signal?: boolean;
}) {
  const numCls = signal
    ? "text-signal font-bold"
    : violet
      ? "text-accent-to font-bold"
      : highlight
        ? "text-accent-from font-bold"
        : "text-foreground font-semibold";
  return (
    <div className="col-span-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-white/5 py-1 last:border-0">
      <span className={`text-right tabular-nums ${numCls}`}>{me}</span>
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={`text-left tabular-nums ${numCls} opacity-80`}>{opp}</span>
    </div>
  );
}

// Exported for use in expanded-only contexts (not used internally now, kept for future)
export type { MatchStats };
