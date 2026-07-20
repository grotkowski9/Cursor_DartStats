"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GitCompareArrows, Trophy } from "lucide-react";

type SeasonId = "all" | "2026-H1" | "2025-H2" | "2025-H1";

type TournamentRow = {
  title: string;
  matches: number;
  avg: number;
  wins: number;
  losses: number;
  season: Exclude<SeasonId, "all">;
};

type FormPoint = {
  index: number;
  dateLabel: string;
  average: number;
  first9: number;
  won: boolean;
  oppName: string;
};

const SEASON_LABELS: Record<SeasonId, string> = {
  all: "Wszystko",
  "2026-H1": "2026 H1",
  "2025-H2": "2025 H2",
  "2025-H1": "2025 H1",
};

const TOURNAMENTS: TournamentRow[] = [
  { title: "Liga Dartowa Trójmiasto", matches: 14, avg: 68.4, wins: 9, losses: 5, season: "2026-H1" },
  { title: "Turniej Sylveon Open", matches: 8, avg: 71.2, wins: 5, losses: 3, season: "2026-H1" },
  { title: "Puchar Pomorza", matches: 6, avg: 64.1, wins: 3, losses: 3, season: "2025-H2" },
  { title: "Liga Dartowa Trójmiasto", matches: 11, avg: 66.0, wins: 6, losses: 5, season: "2025-H2" },
  { title: "N01 Weekend Cup", matches: 5, avg: 62.8, wins: 2, losses: 3, season: "2025-H1" },
  { title: "Turniej Firmowy Softip", matches: 4, avg: 59.5, wins: 1, losses: 3, season: "2025-H1" },
];

const FORM_BY_TITLE: Record<string, FormPoint[]> = {
  "Liga Dartowa Trójmiasto": [
    { index: 0, dateLabel: "03.01", average: 64.2, first9: 71.0, won: true, oppName: "Kowalski" },
    { index: 1, dateLabel: "17.01", average: 66.8, first9: 68.5, won: false, oppName: "Nowak" },
    { index: 2, dateLabel: "31.01", average: 69.1, first9: 74.2, won: true, oppName: "Wiśniewski" },
    { index: 3, dateLabel: "14.02", average: 67.4, first9: 70.1, won: true, oppName: "Wójcik" },
    { index: 4, dateLabel: "28.02", average: 71.0, first9: 76.8, won: true, oppName: "Kamiński" },
    { index: 5, dateLabel: "14.03", average: 68.9, first9: 72.3, won: false, oppName: "Lewandowski" },
  ],
  "Turniej Sylveon Open": [
    { index: 0, dateLabel: "11.01", average: 69.5, first9: 73.0, won: true, oppName: "Zieliński" },
    { index: 1, dateLabel: "25.01", average: 72.1, first9: 78.4, won: true, oppName: "Szymański" },
    { index: 2, dateLabel: "08.02", average: 70.4, first9: 75.1, won: false, oppName: "Woźniak" },
    { index: 3, dateLabel: "22.02", average: 73.8, first9: 79.0, won: true, oppName: "Dąbrowski" },
  ],
  "Puchar Pomorza": [
    { index: 0, dateLabel: "05.09", average: 61.2, first9: 66.0, won: false, oppName: "Kozłowski" },
    { index: 1, dateLabel: "19.09", average: 63.8, first9: 69.4, won: true, oppName: "Jankowski" },
    { index: 2, dateLabel: "03.10", average: 65.5, first9: 70.2, won: true, oppName: "Mazur" },
    { index: 3, dateLabel: "17.10", average: 64.0, first9: 68.8, won: false, oppName: "Krawczyk" },
  ],
};

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors ${
        active
          ? "border-accent-from/60 bg-accent-from/15 text-foreground"
          : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-accent-gradient">{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function FormTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: FormPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-card/90 px-3 py-2 text-xs backdrop-blur-xl">
      <p className="mb-1 font-semibold">{d.dateLabel}</p>
      <p className="mb-1 text-muted-foreground">vs {d.oppName}</p>
      <p className="tabular-nums">
        Avg <span className="font-bold text-accent-from">{d.average.toFixed(1)}</span>
      </p>
      <p className={`mt-1 font-semibold ${d.won ? "text-emerald-300" : "text-red-300"}`}>
        {d.won ? "Wygrana" : "Przegrana"}
      </p>
    </div>
  );
}

export function TournamentsPreviewClient() {
  const [season, setSeason] = useState<SeasonId>("all");
  const [selectedTitle, setSelectedTitle] = useState("Liga Dartowa Trójmiasto");
  const [compareA, setCompareA] = useState("Liga Dartowa Trójmiasto");
  const [compareB, setCompareB] = useState("Turniej Sylveon Open");

  const rows = useMemo(() => {
    const filtered =
      season === "all" ? TOURNAMENTS : TOURNAMENTS.filter((t) => t.season === season);
    // Group same titles across seasons when "all"
    if (season !== "all") return filtered;
    const map = new Map<string, TournamentRow>();
    for (const t of filtered) {
      const prev = map.get(t.title);
      if (!prev) {
        map.set(t.title, { ...t });
        continue;
      }
      map.set(t.title, {
        ...prev,
        matches: prev.matches + t.matches,
        wins: prev.wins + t.wins,
        losses: prev.losses + t.losses,
        avg:
          (prev.avg * prev.matches + t.avg * t.matches) / (prev.matches + t.matches),
        season: prev.season,
      });
    }
    return Array.from(map.values()).sort((a, b) => b.matches - a.matches);
  }, [season]);

  const titles = useMemo(() => rows.map((r) => r.title), [rows]);

  const formSeries = FORM_BY_TITLE[selectedTitle] ?? FORM_BY_TITLE["Liga Dartowa Trójmiasto"];
  const formAvg =
    formSeries.reduce((sum, p) => sum + p.average, 0) / Math.max(1, formSeries.length);

  const rowA = rows.find((r) => r.title === compareA) ?? TOURNAMENTS[0];
  const rowB = rows.find((r) => r.title === compareB) ?? TOURNAMENTS[1];

  return (
    <div className="flex flex-col gap-6">
      {/* 0.3.17 — Filtr sezon */}
      <section>
        <div className="glass-tile p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest">Sezon</h2>
            <span className="text-[10px] text-muted-foreground">0.3.17</span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Rok / półrocze z daty meczu (`start_time`). Działa razem z obecnymi chipami 30/90/180 dni.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(SEASON_LABELS) as SeasonId[]).map((id) => (
              <Chip key={id} active={season === id} onClick={() => setSeason(id)}>
                {SEASON_LABELS[id]}
              </Chip>
            ))}
          </div>
        </div>
      </section>

      {/* 0.3.15 — Grupowanie po turnieju */}
      <section>
        <div className="glass-tile p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest">
              <Trophy className="h-3.5 w-3.5 text-accent-from" />
              Turnieje i sesje
            </h2>
            <span className="text-[10px] text-muted-foreground">0.3.15</span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Grupowanie po `matches.title` z N01 — liczba meczów, avg, bilans W/L.
          </p>

          <ul className="space-y-2">
            {rows.map((row) => {
              const active = row.title === selectedTitle;
              const winRate = Math.round((row.wins / (row.wins + row.losses)) * 100);
              return (
                <li key={`${row.title}-${row.season}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTitle(row.title);
                      setCompareA(row.title);
                    }}
                    className={`w-full rounded-xl border px-3.5 py-3 text-left transition-colors ${
                      active
                        ? "border-accent-from/50 bg-accent-from/10"
                        : "border-white/10 bg-black/20 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.title}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {row.matches} meczów · {winRate}% WR
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums text-accent-gradient">
                          {row.avg.toFixed(1)}
                        </p>
                        <p className="mt-1 text-[11px] tabular-nums">
                          <span className="text-emerald-300">{row.wins}W</span>
                          <span className="text-muted-foreground"> · </span>
                          <span className="text-red-300">{row.losses}L</span>
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 0.3.14 — Porównanie sesji */}
      <section>
        <div className="glass-tile p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest">
              <GitCompareArrows className="h-3.5 w-3.5 text-accent-from" />
              Porównanie sesji
            </h2>
            <span className="text-[10px] text-muted-foreground">0.3.14</span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Dwa tytuły obok siebie — np. liga vs turniej pucharowy.
          </p>

          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Sesja A
              <select
                value={compareA}
                onChange={(e) => setCompareA(e.target.value)}
                className="mt-1.5 w-full appearance-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground focus:border-accent-from focus:outline-none"
              >
                {titles.map((t) => (
                  <option key={`a-${t}`} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Sesja B
              <select
                value={compareB}
                onChange={(e) => setCompareB(e.target.value)}
                className="mt-1.5 w-full appearance-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground focus:border-accent-from focus:outline-none"
              >
                {titles.map((t) => (
                  <option key={`b-${t}`} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="truncate text-xs font-medium text-muted-foreground">{rowA.title}</p>
              <div className="grid grid-cols-3 gap-1.5">
                <StatTile label="Avg" value={rowA.avg.toFixed(1)} />
                <StatTile label="Mecze" value={String(rowA.matches)} />
                <StatTile
                  label="W/L"
                  value={`${rowA.wins}-${rowA.losses}`}
                  sub={`${Math.round((rowA.wins / (rowA.wins + rowA.losses)) * 100)}%`}
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="truncate text-xs font-medium text-muted-foreground">{rowB.title}</p>
              <div className="grid grid-cols-3 gap-1.5">
                <StatTile label="Avg" value={rowB.avg.toFixed(1)} />
                <StatTile label="Mecze" value={String(rowB.matches)} />
                <StatTile
                  label="W/L"
                  value={`${rowB.wins}-${rowB.losses}`}
                  sub={`${Math.round((rowB.wins / (rowB.wins + rowB.losses)) * 100)}%`}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 0.3.16 — Trendy per turniej */}
      <section>
        <div className="glass-tile p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest">
              Forma per turniej
            </h2>
            <span className="text-[10px] text-muted-foreground">0.3.16</span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Ten sam wykres formy co dziś, ale tylko dla wybranego `title`.
          </p>

          <select
            value={selectedTitle}
            onChange={(e) => setSelectedTitle(e.target.value)}
            className="mb-4 w-full appearance-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-foreground focus:border-accent-from focus:outline-none"
          >
            {Object.keys(FORM_BY_TITLE).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={formSeries} margin={{ top: 4, right: 8, bottom: 8, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="index"
                type="number"
                domain={[0, formSeries.length - 1]}
                ticks={formSeries.map((d) => d.index)}
                tickFormatter={(idx) => formSeries[Number(idx)]?.dateLabel ?? ""}
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[55, 85]}
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickCount={5}
              />
              <Tooltip content={<FormTooltip />} />
              <ReferenceLine y={formAvg} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
              <Line
                dataKey="first9"
                stroke="rgba(139,107,255,0.4)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="average"
                stroke="#5ea0ff"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#5ea0ff", stroke: "#fff", strokeWidth: 1 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Przerywana linia = średnia w wybranym turnieju ({formAvg.toFixed(1)})
          </p>
        </div>
      </section>

      <p className="pb-6 text-center text-[11px] text-muted-foreground">
        To tylko mock pod decyzję UX — nie podpięte do prawdziwych meczów.
      </p>
    </div>
  );
}
