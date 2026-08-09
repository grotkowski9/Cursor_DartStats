"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginGateForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Nie udało się odblokować.");
        return;
      }
      router.refresh();
    } catch {
      setError("Błąd sieci. Spróbuj ponownie.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <label className="block space-y-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Hasło dostępu
        </span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-accent-from focus:outline-none"
          placeholder="Hasło od administratora"
        />
      </label>
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || !password}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-from to-accent-to px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-accent-to/25 disabled:opacity-50"
      >
        {pending ? "Sprawdzam…" : "Odblokuj logowanie"}
      </button>
    </form>
  );
}
