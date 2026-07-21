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
  /** onboarding → redirect /profile; edit → stay and refresh */
  mode: "onboarding" | "edit";
  submitLabel?: string;
  onSaved?: () => void;
};

export function IdentityForm({ initial, mode, submitLabel, onSaved }: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [nickname, setNickname] = useState(initial.nickname);
  const [knownNicknames, setKnownNicknames] = useState(initial.knownNicknames);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedOk(false);
    try {
      const nicknames = knownNicknames
        .split(/[,;\n]/)
        .map((n) => n.trim())
        .filter(Boolean);

      const res = await fetch("/api/customer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          nickname: nickname.trim() || null,
          knownNicknames: nicknames,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Zapis nieudany");

      if (mode === "onboarding") {
        router.replace("/profile");
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

  const label =
    submitLabel ??
    (mode === "onboarding" ? "Zapisz i przejdź do profilu" : "Zapisz zmiany");

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="glass-tile space-y-4 p-5">
      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Imię
        </span>
        <input
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          autoComplete="given-name"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-accent-from focus:outline-none"
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
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-accent-from focus:outline-none"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Pseudonim główny
        </span>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="np. Groteł"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-accent-from focus:outline-none"
        />
        <span className="block text-[11px] text-muted-foreground">
          Opcjonalnie — wyświetlamy jako Imię „pseudonim” Nazwisko.
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Pseudonimy N01 (oddziel przecinkiem)
        </span>
        <textarea
          required
          value={knownNicknames}
          onChange={(e) => setKnownNicknames(e.target.value)}
          rows={3}
          placeholder="Grotkowski, Groteł"
          className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-accent-from focus:outline-none"
        />
        <span className="block text-[11px] text-muted-foreground">
          Fragmenty nazw z N01, po których rozpoznamy Cię w meczu. Minimum jeden wzorzec.
        </span>
      </label>

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
}

/** Prefill N01 patterns when empty: last name + main nick (skip placeholders). */
export function suggestKnownNicknames(parts: {
  firstName: string;
  lastName: string;
  nickname: string | null;
  knownNicknames: string[];
}): string {
  if (parts.knownNicknames.filter((n) => n.trim()).length > 0) {
    return parts.knownNicknames.join(", ");
  }
  const suggestions: string[] = [];
  const last = parts.lastName.trim();
  if (last && last.toLowerCase() !== "dart") suggestions.push(last);
  const nick = parts.nickname?.trim();
  if (nick) suggestions.push(nick);
  return suggestions.join(", ");
}
