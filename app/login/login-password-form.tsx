"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  next?: string;
  /** Gdy true: przed logowaniem upsert + reset customer (świeży onboarding). */
  allowDevUpsert?: boolean;
};

export function LoginPasswordForm({
  next = "/profile",
  allowDevUpsert = false,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const trimmedEmail = email.trim().toLowerCase();

      if (allowDevUpsert) {
        const upsertRes = await fetch("/api/auth/dev-upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail, password }),
        });
        const upsertData = (await upsertRes.json()) as { error?: string };
        if (!upsertRes.ok) {
          throw new Error(upsertData.error ?? "Nie udało się utworzyć konta testowego");
        }
      }

      const supabase = createSupabaseBrowserClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signError) {
        throw new Error(
          signError.message === "Invalid login credentials"
            ? "Błędny e-mail lub hasło. (Włącz Email provider w Supabase albo użyj upsert w trybie deweloperskim.)"
            : signError.message,
        );
      }

      let dest = next.startsWith("/") ? next : "/profile";
      try {
        const res = await fetch("/api/customer");
        if (res.ok) {
          const data = (await res.json()) as { needsOnboarding?: boolean };
          if (data.needsOnboarding) dest = "/onboarding";
        }
      } catch {
        // non-fatal
      }

      router.replace(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logowanie nieudane");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      {allowDevUpsert && (
        <p className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-100/90">
          Tryb testowy: każde logowanie e-mailem <strong>tworzy / resetuje</strong> konto
          (świeży onboarding). Np. <code className="text-amber-50">test@test.pl</code> /{" "}
          <code className="text-amber-50">Grotkowski</code>.
        </p>
      )}

      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          E-mail
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="test@test.pl"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-accent-from focus:outline-none"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Hasło
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          placeholder="Grotkowski"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-accent-from focus:outline-none"
        />
      </label>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-from to-accent-to px-6 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {allowDevUpsert ? "Utwórz / zaloguj (test)" : "Zaloguj e-mailem"}
      </button>
    </form>
  );
}
