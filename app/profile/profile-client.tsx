"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Inbox, Loader2 } from "lucide-react";
import type { N01Match } from "@/lib/n01-parser";
import {
  computePlayerStats,
  computeTopCheckouts,
  computeTopThrows,
  computeLast5,
  filterByRange,
  type TimeRange,
} from "@/lib/stats";
import { ProfileAddMatch } from "./profile-add-match";
import { ProfileFormChart } from "./profile-form-chart";
import { ProfileHeadToHead } from "./profile-head-to-head";
import { ProfileMatchCard } from "./profile-match-card";
import { ProfileRecentMatches } from "./profile-recent-matches";
import { ProfileStatsBlock } from "./profile-stats-block";
import { ProfileTopLists } from "./profile-top-lists";

const INITIAL_SHOW = 3;
const PAGE_SIZE = 10;

type Props = {
  myDisplayName?: string;
};

export function ProfileClient({ myDisplayName }: Props) {
  const [matches, setMatches] = useState<N01Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>("all");
  const [showMore, setShowMore] = useState(false);
  const [page, setPage] = useState(0);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/matches/full");
      const data = (await res.json()) as { matches?: N01Match[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Błąd pobierania");
      setMatches(data.matches ?? []);
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const filtered = useMemo(() => filterByRange(matches, range), [matches, range]);
  const playerStats = useMemo(() => computePlayerStats(filtered), [filtered]);
  const topThrows = useMemo(() => computeTopThrows(filtered, 10), [filtered]);
  const topCheckouts = useMemo(() => computeTopCheckouts(filtered, 10), [filtered]);
  const recent = useMemo(() => computeLast5(filtered), [filtered]);

  const sortedMatches = useMemo(
    () => filtered.slice().sort((a, b) => b.startTime - a.startTime),
    [filtered],
  );

  const initialMatches = sortedMatches.slice(0, INITIAL_SHOW);
  const extraMatches = sortedMatches.slice(INITIAL_SHOW);
  const totalPages = Math.ceil(extraMatches.length / PAGE_SIZE);
  const pageMatches = extraMatches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleShowMore() {
    setShowMore(true);
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-6">
      <ProfileAddMatch onMatchesChanged={() => void loadMatches()} />

      <ProfileStatsBlock
        stats={playerStats}
        range={range}
        onRange={setRange}
        loading={loading}
      />

      {/* Form chart */}
      {!loading && filtered.length >= 2 && <ProfileFormChart matches={filtered} />}

      <ProfileRecentMatches items={recent} />

      <ProfileTopLists throws={topThrows} checkouts={topCheckouts} />

      {/* Head-to-head */}
      {!loading && filtered.length > 0 && <ProfileHeadToHead matches={filtered} />}

      {/* Match list */}
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-widest">Ostatnie mecze</h2>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-accent-from" />
            Ładuję mecze…
          </div>
        ) : sortedMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] p-10 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <Inbox className="h-6 w-6 text-primary/60" />
            </div>
            <h3 className="font-medium">Brak meczów w tym zakresie</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Dodaj pierwszy link z N01 powyżej.
            </p>
          </div>
        ) : (
          <>
            {/* Initial 3 matches */}
            <div className="flex flex-col gap-2">
              {initialMatches.map((m) => (
                <ProfileMatchCard key={m.tmid} match={m} myDisplayName={myDisplayName} />
              ))}
            </div>

            {/* "Więcej spotkań" button */}
            {extraMatches.length > 0 && !showMore && (
              <button
                type="button"
                onClick={handleShowMore}
                className="mt-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-accent-from/30 hover:bg-accent-from/5 hover:text-foreground"
              >
                Więcej spotkań ({extraMatches.length})
              </button>
            )}

            {/* Paginated list */}
            {showMore && extraMatches.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2">
                  {pageMatches.map((m) => (
                    <ProfileMatchCard key={m.tmid} match={m} myDisplayName={myDisplayName} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-2 px-1 pt-1">
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Wstecz
                    </button>
                    <span className="text-[10px] text-muted-foreground">
                      Strona {page + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Dalej
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowMore(false)}
                  className="mt-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Zwiń listę
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
