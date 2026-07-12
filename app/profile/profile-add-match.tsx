"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRef } from "react";
import { AlertTriangle, Loader2, Plus } from "lucide-react";

type IdentityPrompt = {
  players: [string, string];
  url: string;
};

type DuplicatePrompt = {
  shareToken: string;
  url: string;
};

type DupDecision = "overwrite" | "skip" | "overwrite-all" | "skip-all";

type BulkStatus = "queued" | "ok" | "duplicate" | "error";
type BulkRow = { url: string; status: BulkStatus; message?: string };

type Props = {
  onMatchesChanged: () => void;
};

export function ProfileAddMatch({ onMatchesChanged }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [identity, setIdentity] = useState<IdentityPrompt | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicatePrompt | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [dupPolicy, setDupPolicy] = useState<"ask" | "overwrite" | "skip">("ask");
  // Ref mirrors dupPolicy for synchronous reads inside async processBulkOne loop
  const dupPolicyRef = useRef<"ask" | "overwrite" | "skip">("ask");
  const [pendingDup, setPendingDup] = useState<{ url: string; shareToken: string | null } | null>(
    null,
  );

  async function runIngest(opts: {
    ingestUrl: string;
    playerIndex?: 0 | 1;
    overwrite?: boolean;
    action?: "reject";
  }) {
    setIngesting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: opts.ingestUrl,
          playerIndex: opts.playerIndex,
          overwrite: opts.overwrite,
          action: opts.action,
        }),
      });
      const data = (await res.json()) as {
        status?: string;
        error?: string;
        players?: [string, string];
        shareToken?: string;
        match?: { title?: string };
      };

      if (!res.ok) throw new Error(data.error ?? "Import nieudany");

      if (data.status === "needs_identity_confirmation" && data.players) {
        setIdentity({ players: data.players, url: opts.ingestUrl });
        setDuplicate(null);
        return "identity";
      }

      if (data.status === "duplicate" && data.shareToken) {
        setDuplicate({ shareToken: data.shareToken, url: opts.ingestUrl });
        setIdentity(null);
        return "duplicate";
      }

      if (data.status === "rejected") {
        setIdentity(null);
        setDuplicate(null);
        setUrl("");
        return "rejected";
      }

      if (data.status === "saved") {
        setIdentity(null);
        setDuplicate(null);
        setUrl("");
        setSuccess(data.match?.title ? `Zapisano: ${data.match.title}` : "Mecz zapisany");
        onMatchesChanged();
        return "saved";
      }
      return data.status;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import nieudany");
      throw e;
    } finally {
      setIngesting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    void runIngest({ ingestUrl: url.trim() });
  }

  async function processBulkOne(
    ingestUrl: string,
    forceOverwrite: boolean,
  ): Promise<BulkRow> {
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ingestUrl, overwrite: forceOverwrite }),
      });
      const data = (await res.json()) as {
        status?: string;
        error?: string;
        shareToken?: string;
      };

      if (!res.ok) throw new Error(data.error ?? "Import nieudany");

      if (data.status === "duplicate" && !forceOverwrite) {
        if (dupPolicyRef.current === "skip") {
          return { url: ingestUrl, status: "duplicate", message: "pominięto" };
        }
        if (dupPolicyRef.current === "overwrite") {
          const res2 = await fetch("/api/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: ingestUrl, overwrite: true }),
          });
          const data2 = (await res2.json()) as { status?: string; error?: string };
          if (!res2.ok) throw new Error(data2.error ?? "Nadpisanie nieudane");
          return { url: ingestUrl, status: "ok", message: "nadpisano" };
        }
        const decision = await new Promise<DupDecision>((resolve) => {
          setPendingDup({ url: ingestUrl, shareToken: data.shareToken ?? null });
          (window as unknown as { __dartsBulkResolve?: (v: DupDecision) => void }).__dartsBulkResolve =
            resolve;
        });
        setPendingDup(null);
        if (decision === "overwrite-all") { setDupPolicy("overwrite"); dupPolicyRef.current = "overwrite"; }
        if (decision === "skip-all") { setDupPolicy("skip"); dupPolicyRef.current = "skip"; }
        if (decision === "skip" || decision === "skip-all") {
          return { url: ingestUrl, status: "duplicate", message: "pominięto" };
        }
        const res2 = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: ingestUrl, overwrite: true }),
        });
        const data2 = (await res2.json()) as { status?: string; error?: string };
        if (!res2.ok) throw new Error(data2.error ?? "Nadpisanie nieudane");
        return { url: ingestUrl, status: "ok", message: "nadpisano" };
      }

      if (data.status === "saved") return { url: ingestUrl, status: "ok" };
      if (data.status === "needs_identity_confirmation") {
        return { url: ingestUrl, status: "error", message: "wymaga wyboru gracza" };
      }
      return { url: ingestUrl, status: "error", message: data.status ?? "błąd" };
    } catch (e) {
      return {
        url: ingestUrl,
        status: "error",
        message: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async function handleBulkRun() {
    const urls = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (urls.length === 0) return;
    setBulkRunning(true);
    setDupPolicy("ask");
    dupPolicyRef.current = "ask";
    setBulkRows(urls.map((u) => ({ url: u, status: "queued" })));
    for (let i = 0; i < urls.length; i++) {
      const res = await processBulkOne(urls[i], false);
      setBulkRows((prev) => prev.map((r, idx) => (idx === i ? res : r)));
    }
    setBulkRunning(false);
    onMatchesChanged();
  }

  function resolveDup(kind: DupDecision) {
    const fn = (window as unknown as { __dartsBulkResolve?: (v: DupDecision) => void })
      .__dartsBulkResolve;
    if (fn) fn(kind);
  }

  const bulkSummary = useMemo(() => {
    const ok = bulkRows.filter((r) => r.status === "ok").length;
    const dup = bulkRows.filter((r) => r.status === "duplicate").length;
    const err = bulkRows.filter((r) => r.status === "error").length;
    const queued = bulkRows.filter((r) => r.status === "queued").length;
    return { ok, dup, err, queued, total: bulkRows.length };
  }, [bulkRows]);

  return (
    <section>
      <div className="glass-tile p-5">
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className="flex w-full items-start justify-between text-left"
        >
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest">Dodaj nowy mecz</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Wklej link do swojego meczu z n01 — pobiorę dane, zrobię wyliczenia i uaktualnię Twój profil gracza.
            </p>
          </div>
          <span className="rounded bg-white/5 px-2 py-1 font-mono text-[10px] text-muted-foreground">
            {addOpen ? "−" : "+"}
          </span>
        </button>

        {addOpen && (
          <div className="mt-4 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://n01darts.com/n01/..."
                disabled={ingesting}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-accent-from focus:outline-none"
              />
              <button
                type="submit"
                disabled={ingesting || !url.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-from to-accent-to px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-accent-to/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ingesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {ingesting ? "Pobieram…" : "Pobierz dane"}
              </button>
            </form>

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

            {identity && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-100">
                <p className="mb-3">Nie rozpoznano Cię automatycznie. Który gracz to Ty?</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={ingesting}
                    onClick={() => void runIngest({ ingestUrl: identity.url, playerIndex: 0 })}
                    className="flex-1 rounded-lg border border-white/15 px-3 py-2 hover:bg-white/5"
                  >
                    {identity.players[0]}
                  </button>
                  <button
                    type="button"
                    disabled={ingesting}
                    onClick={() => void runIngest({ ingestUrl: identity.url, playerIndex: 1 })}
                    className="flex-1 rounded-lg border border-white/15 px-3 py-2 hover:bg-white/5"
                  >
                    {identity.players[1]}
                  </button>
                </div>
                <button
                  type="button"
                  disabled={ingesting}
                  onClick={() => void runIngest({ ingestUrl: identity.url, action: "reject" })}
                  className="mt-3 w-full rounded-lg px-3 py-2 text-muted-foreground hover:bg-white/5"
                >
                  Odrzuć — nie zapisuj
                </button>
              </div>
            )}

            {duplicate && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-100">
                <p className="mb-2 inline-flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Ten mecz jest już w bazie
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={ingesting}
                    onClick={() => void runIngest({ ingestUrl: duplicate.url, overwrite: true })}
                    className="rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-1.5 font-semibold"
                  >
                    Nadpisz
                  </button>
                  <Link
                    href={`/m/${duplicate.shareToken}`}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5"
                  >
                    Zobacz istniejący
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDuplicate(null)}
                    className="rounded-lg px-3 py-1.5 text-muted-foreground"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setBulkOpen((o) => !o)}
                className="flex w-full items-start justify-between text-left"
              >
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest">
                    Import hurtowy
                  </h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Wiele linków — jeden URL w każdej linii.
                  </p>
                </div>
                <span className="rounded bg-white/5 px-2 py-1 font-mono text-[10px] text-muted-foreground">
                  {bulkOpen ? "−" : "+"}
                </span>
              </button>

              {bulkOpen && (
                <div className="mt-3 space-y-3">
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={6}
                    disabled={bulkRunning}
                    placeholder={
                      "https://n01darts.com/n01/league/n01_view.html?tmid=t_...\nhttps://n01darts.com/n01/tournament/n01_view.html?tmid=t_..."
                    }
                    className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:border-accent-from focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleBulkRun()}
                    disabled={bulkRunning || !bulkText.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-from to-accent-to px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {bulkRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                    {bulkRunning
                      ? `Importuję… (${bulkSummary.ok + bulkSummary.dup + bulkSummary.err}/${bulkSummary.total})`
                      : "Importuj wszystkie"}
                  </button>

                  {pendingDup && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
                      <p className="mb-2 font-semibold inline-flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Duplikat: mecz już istnieje
                      </p>
                      <p className="mb-3 truncate font-mono text-[10px] opacity-80">
                        {pendingDup.url}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => resolveDup("overwrite")} className="rounded-lg border border-amber-400/40 bg-amber-500/20 px-2.5 py-1 font-semibold">Nadpisz</button>
                        <button type="button" onClick={() => resolveDup("overwrite-all")} className="rounded-lg border border-amber-400/40 bg-amber-500/20 px-2.5 py-1 font-semibold">Nadpisz wszystkie</button>
                        <button type="button" onClick={() => resolveDup("skip")} className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1">Pomiń</button>
                        <button type="button" onClick={() => resolveDup("skip-all")} className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1">Pomiń wszystkie</button>
                      </div>
                    </div>
                  )}

                  {bulkRows.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wider">
                        <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-300">OK {bulkSummary.ok}</span>
                        <span className="rounded bg-amber-500/15 px-2 py-0.5 text-amber-300">Duplikat {bulkSummary.dup}</span>
                        <span className="rounded bg-red-500/15 px-2 py-0.5 text-red-300">Błąd {bulkSummary.err}</span>
                      </div>
                      <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-white/5 bg-black/20 p-2">
                        {bulkRows.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px]">
                            <span
                              className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold ${
                                r.status === "ok"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : r.status === "duplicate"
                                    ? "bg-amber-500/20 text-amber-300"
                                    : r.status === "error"
                                      ? "bg-red-500/20 text-red-300"
                                      : "bg-white/10 text-muted-foreground"
                              }`}
                            >
                              {r.status === "ok" ? "✓" : r.status === "duplicate" ? "=" : r.status === "error" ? "!" : "…"}
                            </span>
                            <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground">
                              {r.url}
                            </span>
                            {r.message && (
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {r.message}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
