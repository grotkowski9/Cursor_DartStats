"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Loader2, Pencil, X } from "lucide-react";
import type { N01Match } from "@/lib/n01-parser";
import { computeMatchStats, normalizeName } from "@/lib/stats";

type Props = {
  match: N01Match;
  myDisplayName?: string;
  onClose: () => void;
  onSaved: (match: N01Match) => void;
};

export function MatchEditDialog({ match, myDisplayName, onClose, onSaved }: Props) {
  const titleId = useId();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [changeSides, setChangeSides] = useState(false);
  const [changeOppName, setChangeOppName] = useState(false);
  const [playerIndex, setPlayerIndex] = useState<0 | 1>(
    match.playerIndex === 0 || match.playerIndex === 1 ? match.playerIndex : 0,
  );
  const [oppNameDraft, setOppNameDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => computeMatchStats(match), [match]);
  const slot0 = normalizeName(match.players[0]?.name ?? "Gracz 1");
  const slot1 = normalizeName(match.players[1]?.name ?? "Gracz 2");
  const currentMe = match.playerIndex === 0 || match.playerIndex === 1 ? match.playerIndex : 0;
  const effectiveMe = changeSides ? playerIndex : currentMe;
  const effectiveOppIdx = (effectiveMe === 0 ? 1 : 0) as 0 | 1;
  const effectiveOppName = normalizeName(match.players[effectiveOppIdx]?.name ?? "");
  const myLabel = myDisplayName ?? normalizeName(stats.me.name);

  useEffect(() => {
    setOppNameDraft(effectiveOppName);
  }, [effectiveOppName]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const canGoStep3 = changeSides || changeOppName;
  const sidesChanged = changeSides && playerIndex !== currentMe;
  const oppNameTrimmed = oppNameDraft.trim();
  const oppNameChanged =
    changeOppName && oppNameTrimmed.length > 0 && oppNameTrimmed !== effectiveOppName;
  const hasEffectiveChange = sidesChanged || oppNameChanged;

  const previewMeSlotName = normalizeName(match.players[effectiveMe]?.name ?? "");
  const previewOppName = changeOppName && oppNameTrimmed ? oppNameTrimmed : effectiveOppName;

  async function submitEdit() {
    if (!match.matchId || !hasEffectiveChange || busy) return;
    setBusy(true);
    setError(null);
    try {
      const body: {
        playerIndex?: 0 | 1;
        playerNames?: { "0"?: string; "1"?: string };
      } = {};
                  if (sidesChanged) body.playerIndex = playerIndex;
      if (oppNameChanged) {
        body.playerNames = { [String(effectiveOppIdx)]: oppNameTrimmed };
      }
      const res = await fetch(`/api/matches/${match.matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { match?: N01Match; error?: string };
      if (!res.ok || !data.match) throw new Error(data.error ?? "Nie udało się zapisać");
      onSaved(data.match);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się zapisać");
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
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent-from/80">
              Edycja meczu · krok {step}/3
            </p>
            <h2 id={titleId} className="mt-0.5 text-sm font-semibold text-foreground">
              {step === 1 && "Na pewno edytować ten mecz?"}
              {step === 2 && "Co chcesz zmienić?"}
              {step === 3 && "Potwierdź wprowadzone zmiany"}
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
            <div className="space-y-3 text-muted-foreground">
              <p>
                Możesz poprawić błędne przypisanie strony albo nazwę przeciwnika.
              </p>
              <p className="text-xs">
                Mecz, wynik i link share zostają. Zmienia się tylko perspektywa / nazwa w Twoim
                archiwum.
              </p>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-foreground">
                <p className="font-semibold">{match.title || "Mecz N01"}</p>
                <p className="mt-1 text-muted-foreground">
                  {myLabel} vs {normalizeName(match.players[currentMe === 0 ? 1 : 0]?.name ?? "")}
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Zaznacz, co chcesz zmienić. Reszta OK.</p>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <input
                  type="checkbox"
                  checked={changeSides}
                  onChange={(e) => setChangeSides(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">Zmiana stron</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Błędnie przypisało statystyki do Twojego konta - jesteś zawodnikiem po drugiej
                    stronie.
                  </span>
                </span>
              </label>

              {changeSides ? (
                <fieldset className="space-y-2 rounded-xl border border-accent-from/25 bg-accent-from/5 p-3">
                  <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Kim jesteś?
                  </legend>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="edit-side"
                      checked={playerIndex === 0}
                      onChange={() => setPlayerIndex(0)}
                    />
                    <span>
                      {slot0}
                      {currentMe === 0 ? (
                        <span className="ml-1 text-[10px] text-muted-foreground">(teraz Ty)</span>
                      ) : null}
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="edit-side"
                      checked={playerIndex === 1}
                      onChange={() => setPlayerIndex(1)}
                    />
                    <span>
                      {slot1}
                      {currentMe === 1 ? (
                        <span className="ml-1 text-[10px] text-muted-foreground">(teraz Ty)</span>
                      ) : null}
                    </span>
                  </label>
                </fieldset>
              ) : null}

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <input
                  type="checkbox"
                  checked={changeOppName}
                  onChange={(e) => setChangeOppName(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    Zmiana nazwy przeciwnika
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Ta sama osoba zapisana inaczej w różnych turniejach. Pomoże to np. w poprawnych
                    statystykach Head-to-Head.
                  </span>
                </span>
              </label>

              {changeOppName ? (
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Nazwa przeciwnika
                  </span>
                  <input
                    type="text"
                    value={oppNameDraft}
                    onChange={(e) => setOppNameDraft(e.target.value)}
                    placeholder={effectiveOppName || "np. T. Wolski"}
                    className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-accent-from/50 focus:ring-2 focus:ring-accent-from/30"
                  />
                </label>
              ) : null}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Sprawdź zmiany przed zapisem:</p>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
                <dl className="space-y-2 text-muted-foreground">
                  {sidesChanged ? (
                    <div>
                      <dt className="font-semibold text-foreground">Zmiana stron</dt>
                      <dd className="mt-0.5">
                        Było: slot {currentMe + 1} ({normalizeName(match.players[currentMe]?.name ?? "")})
                        <br />
                        Będzie: slot {effectiveMe + 1} ({previewMeSlotName}) — Ty
                      </dd>
                    </div>
                  ) : null}
                  {oppNameChanged ? (
                    <div>
                      <dt className="font-semibold text-foreground">Nazwa przeciwnika</dt>
                      <dd className="mt-0.5">
                        Było: {effectiveOppName}
                        <br />
                        Będzie: {previewOppName}
                      </dd>
                    </div>
                  ) : null}
                  {!hasEffectiveChange ? (
                    <p className="text-amber-200/90">
                      Nie wprowadzono żadnej realnej zmiany. Wróć do kroku 2.
                    </p>
                  ) : null}
                </dl>
              </div>
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

          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg border border-accent-from/40 bg-accent-from/15 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent-from/25"
            >
              Dalej
            </button>
          ) : null}

          {step === 2 ? (
            <button
              type="button"
              disabled={!canGoStep3}
              onClick={() => {
                setError(null);
                setStep(3);
              }}
              className="rounded-lg border border-accent-from/40 bg-accent-from/15 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent-from/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Dalej
            </button>
          ) : null}

          {step === 3 ? (
            <button
              type="button"
              disabled={!hasEffectiveChange || busy || !match.matchId}
              onClick={() => void submitEdit()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent-from/50 bg-accent-from/20 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent-from/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
              Zapisz zmiany
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
