"use client";

import { useEffect, useId, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import type { N01Match } from "@/lib/n01-parser";
import { computeMatchStats, normalizeName } from "@/lib/stats";

const CONFIRM_WORD = "usuwam";

type Props = {
  match: N01Match;
  myDisplayName?: string;
  onClose: () => void;
  onDeleted: () => void;
};

export function MatchDeleteDialog({ match, myDisplayName, onClose, onDeleted }: Props) {
  const titleId = useId();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = computeMatchStats(match);
  const myName = myDisplayName ?? normalizeName(stats.me.name);
  const oppName = normalizeName(stats.opp.name);
  const date = new Date(match.startTime * 1000).toLocaleString("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const score = `${stats.me.legsWon}:${stats.opp.legsWon}`;
  const canDelete = typed.trim().toLowerCase() === CONFIRM_WORD;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function submitDelete() {
    if (!match.matchId || !canDelete || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${match.matchId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Nie udało się usunąć");
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się usunąć");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="presentation"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="glass-tile w-full max-w-md overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-300/80">
              Usuwanie meczu · krok {step}/3
            </p>
            <h2 id={titleId} className="mt-0.5 text-sm font-semibold text-foreground">
              {step === 1 && "Na pewno usunąć ten mecz?"}
              {step === 2 && "Sprawdź, co zniknie"}
              {step === 3 && "Ostateczne potwierdzenie"}
            </h2>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-40"
            aria-label="Zamknij"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4 text-sm">
          {step === 1 && (
            <p className="text-muted-foreground">
              Mecz zostanie usunięty z archiwum. Link share przestanie działać. Tej operacji nie da się
              cofnąć.
            </p>
          )}

          {step === 2 && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
              <p className="font-semibold text-foreground">{match.title || "Mecz N01"}</p>
              <dl className="mt-2 space-y-1.5 text-muted-foreground">
                <div className="flex justify-between gap-3">
                  <dt>Data</dt>
                  <dd className="text-right text-foreground">{date}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Wynik</dt>
                  <dd className="text-right tabular-nums text-foreground">
                    {myName} {score} {oppName}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Przeciwnik</dt>
                  <dd className="text-right text-foreground">{oppName}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Śr. 3-dart</dt>
                  <dd className="text-right tabular-nums text-foreground">
                    {stats.me.average.toFixed(2)}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Wpisz{" "}
                <span className="font-mono font-semibold text-red-300">{CONFIRM_WORD}</span>, aby
                potwierdzić trwałe usunięcie.
              </p>
              <input
                type="text"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                value={typed}
                disabled={busy}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={CONFIRM_WORD}
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none ring-red-400/40 placeholder:text-muted-foreground/50 focus:border-red-400/50 focus:ring-2"
              />
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
          {step > 1 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError(null);
                setStep((s) => (s === 3 ? 2 : 1));
              }}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white/10 disabled:opacity-40"
            >
              Wstecz
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white/10 disabled:opacity-40"
            >
              Anuluj
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
              className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/25"
            >
              Dalej
            </button>
          ) : (
            <button
              type="button"
              disabled={!canDelete || busy || !match.matchId}
              onClick={() => void submitDelete()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Usuń na zawsze
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
