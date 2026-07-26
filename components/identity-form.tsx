"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export type IdentityFormInitial = {
  firstName: string;
  lastName: string;
  nickname: string;
  knownNicknames: string;
};

type Props = {
  initial: IdentityFormInitial;
  /** onboarding → /onboarding/about; edit → stay and refresh */
  mode: "onboarding" | "edit";
  submitLabel?: string;
  onSaved?: () => void;
  /** When set, render without outer glass-tile (embedded in parent card). */
  embedded?: boolean;
};

export function IdentityForm({
  initial,
  mode,
  submitLabel,
  onSaved,
  embedded = false,
}: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [nickname, setNickname] = useState(initial.nickname);
  const [knownNicknames, setKnownNicknames] = useState(initial.knownNicknames);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [emptyNicknamesPrompt, setEmptyNicknamesPrompt] = useState(false);

  async function saveProfile(skipEmptyNicknamesCheck = false) {
    setSaving(true);
    setError(null);
    setSavedOk(false);
    try {
      const nick = nickname.trim();
      if (!nick) {
        throw new Error("Podaj pseudonim główny.");
      }
      if (!firstName.trim() || !lastName.trim()) {
        throw new Error("Podaj imię i nazwisko.");
      }

      const nicknames = knownNicknames
        .split(/[,;\n]/)
        .map((n) => n.trim())
        .filter(Boolean);

      if (nicknames.length === 0 && !skipEmptyNicknamesCheck) {
        setEmptyNicknamesPrompt(true);
        setSaving(false);
        return;
      }

      setEmptyNicknamesPrompt(false);

      const res = await fetch("/api/customer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          nickname: nick,
          knownNicknames: nicknames,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Zapis nieudany");

      if (mode === "onboarding") {
        router.replace("/onboarding/about");
        router.refresh();
        return;
      }

      setSavedOk(true);
      onSaved?.();
      router.refresh();
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zapis nieudany");
      setSaving(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void saveProfile(emptyNicknamesPrompt);
  }

  const label =
    submitLabel ??
    (mode === "onboarding" ? "Zapisz i przejdź dalej" : "Zapisz dane identyfikacyjne");

  const form = (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className={embedded ? "space-y-4" : "glass-tile space-y-4 p-5"}
    >
      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Imię
        </span>
        <input
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          autoComplete="given-name"
          placeholder="np. Antoni"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:border-accent-from focus:outline-none"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Nazwisko
        </span>
        <input
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          autoComplete="family-name"
          placeholder="np. Kowalski"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:border-accent-from focus:outline-none"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Pseudonim główny
        </span>
        <input
          required
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="np. Łysy"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:border-accent-from focus:outline-none"
        />
        <span className="block text-[11px] text-muted-foreground">
          Twój główny pseudonim.
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Jak Cię najczęściej zapisują w meczach N01?
        </span>
        <textarea
          value={knownNicknames}
          onChange={(e) => {
            setKnownNicknames(e.target.value);
            if (emptyNicknamesPrompt) setEmptyNicknamesPrompt(false);
          }}
          rows={3}
          placeholder="np. Antoni Kowalski, A. Kowalski, Łysy, Łysy /Kraków"
          className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:border-accent-from focus:outline-none"
        />
        <span className="block text-[11px] leading-relaxed text-muted-foreground">
          Wypisz po przecinku wszystkie nazwy, pod jakimi zwykle jesteś zapisywany w meczach N01.
          Potrzebujemy tego do automatycznego przypisania wyników do Twojego konta. Spokojnie —
          jak nie będziemy pewni przy imporcie, dopytamy.
        </span>
      </label>

      {emptyNicknamesPrompt ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Zostawiłeś puste pole pod dodatkowe pseudonimy pomocne w automatycznym rozpoznawaniu
            zawodnika. Czy na pewno w meczach N01 nie zapisują Cię inaczej niż z nazwiska i/lub
            pseudonimu głównego?
          </p>
        </div>
      ) : null}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
      {savedOk && !error && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          Zapisano zmiany w profilu.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-from to-accent-to px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {label}
      </button>
    </form>
  );

  return form;
}
