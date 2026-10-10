"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import type { N01Match } from "@/lib/n01-parser";
import { matchTags, MAX_TAG_LENGTH, MAX_TAGS_PER_MATCH, normalizeTag } from "@/lib/match-tags";

type Props = {
  match: N01Match;
  catalog: string[];
  canEdit: boolean;
  persist: boolean;
  onUpdated: (match: N01Match) => void;
  onOpenChange?: (open: boolean) => void;
};

export function ProfileMatchTags({
  match,
  catalog,
  canEdit,
  persist,
  onUpdated,
  onOpenChange,
}: Props) {
  const tags = matchTags(match);
  const [open, setOpenState] = useState(false);
  function setOpen(next: boolean | ((prev: boolean) => boolean)) {
    setOpenState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      onOpenChange?.(value);
      return value;
    });
  }
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const unusedCatalog = catalog.filter(
    (t) => !tags.some((have) => have.toLowerCase() === t.toLowerCase()),
  );

  async function save(next: string[]) {
    if (!canEdit || !match.matchId || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!persist) {
        onUpdated({ ...match, tags: next });
        return;
      }
      const res = await fetch(`/api/matches/${match.matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: next }),
      });
      const data = (await res.json()) as { match?: N01Match; error?: string };
      if (!res.ok || !data.match) throw new Error(data.error ?? "Nie udało się zapisać tagu");
      onUpdated(data.match);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się zapisać tagu");
    } finally {
      setBusy(false);
    }
  }

  function addTag(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag) {
      setError(`Tag: 1–${MAX_TAG_LENGTH} znaków.`);
      return;
    }
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setOpen(false);
      setDraft("");
      return;
    }
    if (tags.length >= MAX_TAGS_PER_MATCH) {
      setError(`Maks. ${MAX_TAGS_PER_MATCH} tagów na mecz.`);
      return;
    }
    setDraft("");
    setOpen(false);
    void save([...tags, tag]);
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 rounded-md border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-foreground"
          >
            {tag}
            {canEdit && match.matchId ? (
              <button
                type="button"
                aria-label={`Usuń tag ${tag}`}
                disabled={busy}
                onClick={() => void save(tags.filter((t) => t !== tag))}
                className="text-muted-foreground hover:text-red-300"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            ) : null}
          </span>
        ))}
        {canEdit && match.matchId ? (
          <button
            type="button"
            disabled={busy || tags.length >= MAX_TAGS_PER_MATCH}
            onClick={() => {
              setError(null);
              setOpen((v) => !v);
            }}
            className="inline-flex items-center gap-0.5 rounded-md border border-dashed border-white/20 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-accent-from/50 hover:text-foreground disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Plus className="h-2.5 w-2.5" />}
            Tag
          </button>
        ) : null}
      </div>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-56 rounded-xl border border-white/10 bg-[#141a2e] p-2 shadow-2xl">
          <p className="mb-1 px-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            Lista tagów lub nowy
          </p>
          <div className="max-h-32 overflow-y-auto">
            {unusedCatalog.length === 0 ? (
              <p className="px-1 py-1 text-[10px] text-muted-foreground">Brak innych tagów.</p>
            ) : (
              unusedCatalog.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  disabled={busy}
                  onClick={() => addTag(tag)}
                  className="block w-full truncate rounded-md px-2 py-1 text-left text-xs hover:bg-white/5"
                >
                  {tag}
                </button>
              ))
            )}
          </div>
          <form
            className="mt-1 flex gap-1 border-t border-white/10 pt-1"
            onSubmit={(e) => {
              e.preventDefault();
              addTag(draft);
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_TAG_LENGTH}
              placeholder="Dodaj nowy…"
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs outline-none focus:border-accent-from/50"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="rounded-md border border-accent-from/40 bg-accent-from/15 px-2 text-[10px] font-medium disabled:opacity-40"
            >
              Dodaj
            </button>
          </form>
          {error && <p className="mt-1 px-1 text-[10px] text-red-300">{error}</p>}
        </div>
      )}
    </div>
  );
}
