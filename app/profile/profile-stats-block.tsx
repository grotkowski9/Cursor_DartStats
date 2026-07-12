"use client";

import type { PlayerStats, TimeRange } from "@/lib/stats";

const RANGE_LABELS: Record<TimeRange, string> = {
  "30d": "30 dni",
  "90d": "90 dni",
  "180d": "180 dni",
  "365d": "365 dni",
  all: "Wszystko",
};

type Props = {
  stats: PlayerStats;
  range: TimeRange;
  onRange: (r: TimeRange) => void;
  loading: boolean;
};

export function ProfileStatsBlock({ stats, range, onRange, loading }: Props) {
  return (
    <section>
      <div className="glass-tile p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest">
            Statystyki zawodnika
          </h2>
          <span className="text-[10px] text-muted-foreground">
            {stats.matches} {stats.matches === 1 ? "mecz" : "meczów"}
          </span>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {(Object.keys(RANGE_LABELS) as TimeRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRange(r)}
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                range === r
                  ? "border-accent-from/60 bg-accent-from/15 text-foreground"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Ładuję dane…</div>
        ) : stats.matches === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            Brak meczów w tym zakresie.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="3-DART AVG" value={stats.average.toFixed(2)} big />
              <Stat label="FIRST 9 AVG" value={stats.first9?.toFixed(2) ?? "—"} big />
              <Stat
                label="Win rate"
                value={`${Math.round(stats.winRate * 100)}%`}
                sub={`${stats.wins}W · ${stats.losses}L`}
                big
              />
              <Stat
                label="LEGS WIN RATE"
                value={
                  stats.legsWon + stats.legsLost > 0
                    ? `${Math.round((stats.legsWon / (stats.legsWon + stats.legsLost)) * 100)}%`
                    : "—"
                }
                sub={`${stats.legsWon}W · ${stats.legsLost}L`}
                big
              />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
              <BucketPill label="Matches" value={stats.matches} accent="neutral" hideOnDesktop />
              <BucketPill label="60+" value={stats.buckets.s60} />
              <BucketPill label="80+" value={stats.buckets.s80} />
              <BucketPill label="100+" value={stats.buckets.s100} accent="primary" />
              <BucketPill label="120+" value={stats.buckets.s120} accent="primary" />
              <BucketPill label="140+" value={stats.buckets.s140} accent="violet" />
              <BucketPill label="170+" value={stats.buckets.s170} accent="violet" />
              <BucketPill label="180" value={stats.buckets.s180} accent="signal" />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              <Stat label="High finish" value={stats.highFinish?.toString() ?? "—"} compact />
              <Stat label="100+ Finish" value={stats.finishes100.toString()} compact />
              <Stat label="Best leg" value={stats.bestLegDarts?.toString() ?? "—"} compact />
              <Stat
                label="Checkout"
                value={
                  stats.checkoutRate !== null
                    ? `${Math.round(stats.checkoutRate * 100)}%`
                    : "—"
                }
                sub={
                  stats.checkoutRate !== null
                    ? `${stats.checkoutHits}/${stats.checkoutAttempts}`
                    : undefined
                }
                compact
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  big,
  compact,
}: {
  label: string;
  value: string;
  sub?: string;
  big?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-xl ${
        compact ? "p-2" : "p-3"
      }`}
    >
      <p
        className={`mb-1 font-bold uppercase tracking-[0.15em] text-muted-foreground ${
          compact ? "text-[8px]" : "text-[9px]"
        }`}
      >
        {label}
      </p>
      <p
        className={`font-bold tabular-nums ${
          big
            ? "text-2xl text-accent-gradient"
            : compact
              ? "text-base text-foreground"
              : "text-lg text-foreground"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p className={`mt-0.5 text-muted-foreground ${compact ? "text-[9px]" : "text-[10px]"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

function BucketPill({
  label,
  value,
  accent,
  hideOnDesktop,
}: {
  label: string;
  value: number;
  accent?: "primary" | "violet" | "signal" | "neutral";
  hideOnDesktop?: boolean;
}) {
  const cls =
    accent === "signal"
      ? "border-signal/50 bg-signal/10 text-signal"
      : accent === "violet"
        ? "border-accent-to/40 bg-accent-to/10 text-accent-to"
        : accent === "primary"
          ? "border-accent-from/40 bg-accent-from/10 text-accent-from"
          : accent === "neutral"
            ? "border-white/20 bg-white/[0.08] text-muted-foreground"
            : "border-white/10 bg-white/[0.03] text-muted-foreground";
  const hideCls = hideOnDesktop ? "sm:hidden" : "";
  return (
    <div className={`rounded-lg border px-2 py-1.5 text-center ${cls} ${hideCls}`}>
      <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-sm font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
