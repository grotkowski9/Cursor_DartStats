"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { detectSourceUrl, IMPORT_HINT_MIXED, IMPORT_HINT_N01, IMPORT_HINT_PRD } from "@/lib/sources/detect-url";
import type { CommitItem } from "@/lib/sources/commit";
import type {
  ParticipantCandidate,
  PreviewGroup,
  PreviewLineError,
  PreviewMatch,
} from "@/lib/sources/types";

type SourceHint = "mixed" | "n01" | "prd";

type Props = {
  onMatchesChanged: () => void;
  demoMode?: boolean;
  loginHref?: string;
};

const DEMO_CTA =
  "Załóż konto i zacznij śledzić swoje statystyki. Dodasz swoje mecze, a my pokażemy Ci jak grasz.";

function hintFor(source: SourceHint): string {
  if (source === "n01") return IMPORT_HINT_N01;
  if (source === "prd") return IMPORT_HINT_PRD;
  return IMPORT_HINT_MIXED;
}

function placeholderFor(source: SourceHint): string {
  if (source === "prd") {
    return "https://polskirankingdarta.pl/turnieje/…";
  }
  if (source === "n01") {
    return "https://n01darts.com/n01/tournament/comp.php?id=…";
  }
  return "https://n01darts.com/…\nhttps://polskirankingdarta.pl/turnieje/…";
}

function formatWhen(ts: number | null): string {
  if (!ts) return "";
  const ms = ts > 1e12 ? ts : ts * 1000;
  try {
    return new Date(ms).toLocaleDateString("pl-PL");
  } catch {
    return "";
  }
}

function scoreLabel(m: PreviewMatch): string {
  if (m.myScore == null || m.oppScore == null) return "";
  return `${m.myScore}–${m.oppScore}`;
}

export function ProfileAddMatch({
  onMatchesChanged,
  demoMode = false,
  loginHref = "/login",
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [sourceHint, setSourceHint] = useState<SourceHint>("mixed");
  const [bulk, setBulk] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [demoCta, setDemoCta] = useState(false);
  const [groups, setGroups] = useState<PreviewGroup[]>([]);
  const [lineErrors, setLineErrors] = useState<PreviewLineError[]>([]);
  const [overwriteIds, setOverwriteIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState<Record<string, string>>({});

  const lines = useMemo(
    () =>
      text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean),
    [text],
  );

  function resetPreview() {
    setGroups([]);
    setLineErrors([]);
    setOverwriteIds(new Set());
    setSearch({});
  }

  function showDemoCta() {
    setError(null);
    setSuccess(null);
    setDemoCta(true);
    resetPreview();
  }

  function demoCheck(urls: string[]): boolean {
    setDemoCta(false);
    if (!urls.length) return false;
    for (const url of urls) {
      const d = detectSourceUrl(url);
      if (d.kind === "unknown") {
        setError(
          d.reason === "not_url"
            ? "To nie jest prawidłowy URL"
            : "W demo wklej link N01 (mecz/turniej/liga) albo turniej PRD.",
        );
        return false;
      }
    }
    showDemoCta();
    return true;
  }

  async function runPreview() {
    const urls = bulk ? lines : text.trim() ? [text.trim()] : [];
    if (!urls.length) return;
    if (demoMode) {
      demoCheck(urls);
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    setDemoCta(false);
    try {
      const res = await fetch("/api/ingest/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        redirect?: string;
        groups?: PreviewGroup[];
        lineErrors?: PreviewLineError[];
      };
      if (res.status === 403 && data.code === "needs_onboarding") {
        window.location.assign(data.redirect ?? "/onboarding");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Nie udało się sprawdzić linków");
      setGroups(data.groups ?? []);
      setLineErrors(data.lineErrors ?? []);
      setOverwriteIds(new Set());
      if (!(data.groups ?? []).length && !(data.lineErrors ?? []).length) {
        setError("Nic nie znalazłem pod tymi linkami.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview nieudany");
    } finally {
      setBusy(false);
    }
  }

  async function resolveGroup(groupKey: string, participantId: string) {
    const group = groups.find((g) => g.groupKey === groupKey);
    if (!group) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ingest/preview/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group, participantId }),
      });
      const data = (await res.json()) as { error?: string; group?: PreviewGroup };
      if (!res.ok) throw new Error(data.error ?? "Nie udało się wybrać zawodnika");
      if (!data.group) throw new Error("Brak odpowiedzi");
      setGroups((prev) => prev.map((g) => (g.groupKey === groupKey ? data.group! : g)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wybór zawodnika nieudany");
    } finally {
      setBusy(false);
    }
  }

  function skipGroup(groupKey: string) {
    setGroups((prev) => prev.filter((g) => g.groupKey !== groupKey));
  }

  function toggleMatch(groupKey: string, externalId: string) {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.groupKey !== groupKey) return g;
        return {
          ...g,
          matches: g.matches.map((m) =>
            m.externalId === externalId ? { ...m, selected: !m.selected } : m,
          ),
        };
      }),
    );
  }

  function toggleOverwrite(externalId: string) {
    setOverwriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(externalId)) next.delete(externalId);
      else next.add(externalId);
      return next;
    });
  }

  const pendingIdentity = groups.some((g) => g.identity.status !== "auto" && !g.error);
  const selectedCount = groups.reduce(
    (n, g) => n + g.matches.filter((m) => m.selected || (m.alreadyInDb && overwriteIds.has(m.externalId))).length,
    0,
  );

  async function runCommit() {
    if (demoMode) {
      showDemoCta();
      return;
    }
    if (pendingIdentity) {
      setError("Najpierw wskaż, kim jesteś w turnieju (albo pomiń grupę).");
      return;
    }
    const items: CommitItem[] = [];
    for (const g of groups) {
      if (g.identity.status !== "auto") continue;
      for (const m of g.matches) {
        const overwrite = m.alreadyInDb && overwriteIds.has(m.externalId);
        if (!m.selected && !overwrite) continue;
        items.push({
          source: m.source,
          externalId: m.externalId,
          fetchRef: m.fetchRef,
          overwrite,
          playerIndex: m.playerIndex,
          participantId: g.identity.participantId,
        });
      }
    }
    if (!items.length) {
      setError("Zaznacz mecze do dodania.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/ingest/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        redirect?: string;
        saved?: number;
        results?: { status: string; message?: string }[];
      };
      if (res.status === 403 && data.code === "needs_onboarding") {
        window.location.assign(data.redirect ?? "/onboarding");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Import nieudany");
      const saved = data.saved ?? 0;
      const errors = (data.results ?? []).filter((r) => r.status === "error").length;
      const dups = (data.results ?? []).filter((r) => r.status === "duplicate").length;
      setSuccess(
        saved
          ? `Zapisano ${saved} ${saved === 1 ? "mecz" : "meczów"}${dups ? ` · pominięto ${dups} duplikatów` : ""}${errors ? ` · ${errors} błędów` : ""}`
          : dups
            ? "Nic nowego — te mecze już masz."
            : "Nic nie zapisano",
      );
      if (saved) onMatchesChanged();
      resetPreview();
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import nieudany");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="glass-tile p-5">
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className="flex w-full items-start justify-between text-left"
        >
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest">Dodaj mecze</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              N01 (mecz, turniej albo liga) albo turniej z Polskiego Rankingu Darta. Zapisujemy rzut
              po rzucie u nas — nawet gdy źródło zniknie.
            </p>
          </div>
          <span className="rounded bg-white/5 px-2 py-1 font-mono text-[10px] text-muted-foreground">
            {addOpen ? "−" : "+"}
          </span>
        </button>

        {addOpen && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["mixed", "Dowolne"],
                  ["n01", "N01"],
                  ["prd", "PRD"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSourceHint(id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                    sourceHint === id
                      ? "bg-accent-from/20 text-foreground ring-1 ring-accent-from/50"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setBulk((b) => !b)}
                className={`ml-auto rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                  bulk
                    ? "bg-white/10 text-foreground"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                {bulk ? "Wiele linków" : "Jeden link"}
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground">{hintFor(sourceHint)}</p>

            {bulk ? (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                disabled={busy}
                placeholder={placeholderFor("mixed")}
                className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:border-accent-from focus:outline-none"
              />
            ) : (
              <input
                type="url"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholderFor(sourceHint)}
                disabled={busy}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-accent-from focus:outline-none"
              />
            )}

            <button
              type="button"
              disabled={busy || !text.trim()}
              onClick={() => void runPreview()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-from to-accent-to px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-accent-to/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {busy ? "Sprawdzam…" : "Sprawdź linki"}
            </button>

            {demoCta && (
              <div className="rounded-xl border border-accent-from/40 bg-accent-from/10 p-4 text-sm text-foreground">
                <p>{DEMO_CTA}</p>
                <Link
                  href={loginHref}
                  className="mt-3 inline-flex rounded-lg bg-gradient-to-r from-accent-from to-accent-to px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  Załóż konto →
                </Link>
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                {success}
              </p>
            )}

            {lineErrors.map((le) => (
              <p
                key={le.url}
                className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-200"
              >
                <span className="font-semibold">{le.message}</span>
                <span className="mt-0.5 block truncate font-mono text-[10px] opacity-70">{le.url}</span>
              </p>
            ))}

            {groups.map((g) => (
              <GroupCard
                key={g.groupKey}
                group={g}
                busy={busy}
                search={search[g.groupKey] ?? ""}
                overwriteIds={overwriteIds}
                onSearch={(v) => setSearch((s) => ({ ...s, [g.groupKey]: v }))}
                onPick={(id) => void resolveGroup(g.groupKey, id)}
                onSkip={() => skipGroup(g.groupKey)}
                onToggle={(id) => toggleMatch(g.groupKey, id)}
                onOverwrite={toggleOverwrite}
                onOverwriteAll={() => {
                  const ids = g.matches.filter((m) => m.alreadyInDb).map((m) => m.externalId);
                  setOverwriteIds((prev) => {
                    const next = new Set(prev);
                    const allOn = ids.every((id) => next.has(id));
                    for (const id of ids) {
                      if (allOn) next.delete(id);
                      else next.add(id);
                    }
                    return next;
                  });
                }}
              />
            ))}

            {groups.length > 0 && (
              <button
                type="button"
                disabled={busy || pendingIdentity || selectedCount === 0}
                onClick={() => void runCommit()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-from to-accent-to px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {pendingIdentity
                  ? "Wskaż zawodnika, żeby dodać"
                  : `Dodaj zaznaczone${selectedCount ? ` (${selectedCount})` : ""}`}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function GroupCard({
  group,
  busy,
  search,
  overwriteIds,
  onSearch,
  onPick,
  onSkip,
  onToggle,
  onOverwrite,
  onOverwriteAll,
}: {
  group: PreviewGroup;
  busy: boolean;
  search: string;
  overwriteIds: Set<string>;
  onSearch: (v: string) => void;
  onPick: (id: string) => void;
  onSkip: () => void;
  onToggle: (id: string) => void;
  onOverwrite: (id: string) => void;
  onOverwriteAll: () => void;
}) {
  const sourceLabel = group.source === "prd" ? "PRD" : "N01";
  const kindLabel =
    group.kind === "n01_league"
      ? "liga"
      : group.kind === "n01_tournament" || group.kind === "prd_tournament"
        ? "turniej"
        : "mecz";
  const needsPick = group.identity.status !== "auto";
  const q = search.trim().toLowerCase();
  const candidates: ParticipantCandidate[] =
    group.identity.status === "none" || group.identity.status === "ambiguous"
      ? group.identity.candidates.filter((c) =>
          !q
            ? true
            : c.displayName.toLowerCase().includes(q) ||
              (c.nickname ?? "").toLowerCase().includes(q),
        )
      : [];

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {sourceLabel} · {kindLabel}
          </p>
          <p className="text-sm font-semibold text-foreground">{group.title}</p>
          {group.identity.status === "auto" && (
            <p className="text-[11px] text-muted-foreground">Ty: {group.identity.displayName}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Pomiń
        </button>
      </div>

      {group.error && (
        <p className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-200">
          {group.error}
        </p>
      )}

      {needsPick && (
        <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-100">
          <p className="mb-2 font-semibold">
            {group.identity.status === "ambiguous"
              ? "Kilka osób pasuje do Twojego profilu. Która to Ty?"
              : group.identity.status === "none"
                ? group.identity.message
                : "Wybierz siebie"}
          </p>
          {(group.identity.status === "none" || group.identity.status === "ambiguous") &&
            group.identity.candidates.length > 6 && (
              <input
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Szukaj nazwiska…"
                className="mb-2 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[11px]"
              />
            )}
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
            {candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={busy}
                onClick={() => onPick(c.id)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-left hover:bg-white/10"
              >
                <span className="font-semibold">{c.displayName}</span>
                {c.city ? <span className="ml-2 text-[10px] opacity-70">{c.city}</span> : null}
                {c.matchCount != null && (
                  <span className="ml-2 text-[10px] opacity-70">{c.matchCount} mecz.</span>
                )}
              </button>
            ))}
            {candidates.length === 0 && (
              <p className="text-[11px] opacity-70">Brak wyników — zmień szukanie albo pomiń grupę.</p>
            )}
          </div>
        </div>
      )}

      {group.identity.status === "auto" && (
        <ul className="space-y-1">
          {group.matches.some((m) => m.alreadyInDb) && (
            <li className="flex justify-end">
              <button
                type="button"
                onClick={onOverwriteAll}
                className="text-[10px] text-amber-200/80 hover:text-amber-100"
              >
                Nadpisz wszystkie w grupie
              </button>
            </li>
          )}
          {group.matches.length === 0 && (
            <li className="text-[11px] text-muted-foreground">
              Brak zakończonych meczów do importu.
            </li>
          )}
          {group.matches.map((m) => (
            <li
              key={m.externalId}
              className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5 text-[11px]"
            >
              <input
                type="checkbox"
                checked={m.alreadyInDb ? overwriteIds.has(m.externalId) : m.selected}
                onChange={() => (m.alreadyInDb ? onOverwrite(m.externalId) : onToggle(m.externalId))}
                className="accent-accent-from"
              />
              <span className="min-w-0 flex-1 truncate">
                vs {m.opponent ?? "?"}
                {scoreLabel(m) ? ` · ${scoreLabel(m)}` : ""}
                {formatWhen(m.startTime) ? ` · ${formatWhen(m.startTime)}` : ""}
              </span>
              {m.alreadyInDb ? (
                <span className="inline-flex items-center gap-1 text-amber-300">
                  <AlertTriangle className="h-3 w-3" />
                  {overwriteIds.has(m.externalId) ? "nadpisz" : "już masz"}
                </span>
              ) : (
                <span className="text-emerald-300/80">nowy</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
