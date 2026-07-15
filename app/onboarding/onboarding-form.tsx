"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Props = {
  initial: {
    firstName: string;
    lastName: string;
    nickname: string;
    knownNicknames: string;
  };
};

export function OnboardingForm({ initial }: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [nickname, setNickname] = useState(initial.nickname);
  const [knownNicknames, setKnownNicknames] = useState(initial.knownNicknames);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
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
      router.replace("/profile");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zapis nieudany");
      setSaving(false);
    }
  }

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
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-accent-from focus:outline-none"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Pseudonim (opcjonalnie)
        </span>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="np. Groteł"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-accent-from focus:outline-none"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Wzorce N01 (oddziel przecinkiem)
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

      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-from to-accent-to px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Zapisz i przejdź do profilu
      </button>
    </form>
  );
}
