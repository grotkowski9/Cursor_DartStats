"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DART_WEIGHT_OPTIONS } from "@/lib/about-options";
import type { AboutFormValues } from "@/lib/about-form-values";
import plCities from "@/data/pl-cities.json";
import dartBrands from "@/data/dart-brands.json";
import favoritePlayers from "@/data/favorite-players.json";

type Brand = { id: string; label: string };
type Player = { id: string; name: string; popularityRank?: number };

const CITIES = plCities as string[];
const BRANDS = dartBrands as Brand[];
const PLAYERS = (favoritePlayers as Player[])
  .slice()
  .sort((a, b) => (a.popularityRank ?? 999) - (b.popularityRank ?? 999));

type Props = {
  initial: AboutFormValues;
  mode: "onboarding" | "edit";
  nextHref?: string;
  showEncouragement?: boolean;
  onSaved?: () => void;
  /** Without outer glass-tile — for shared profile accordion */
  embedded?: boolean;
};

export function AboutForm({
  initial,
  mode,
  nextHref = "/demo/profile?tour=1",
  showEncouragement = false,
  onSaved,
  embedded = false,
}: Props) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [cityQuery, setCityQuery] = useState(initial.city);
  const [playerQuery, setPlayerQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const citySuggestions = useMemo(() => {
    const q = cityQuery.trim().toLocaleLowerCase("pl");
    if (q.length < 3) return [];
    return CITIES.filter((c) => c.toLocaleLowerCase("pl").includes(q)).slice(0, 12);
  }, [cityQuery]);

  const playerList = useMemo(() => {
    const q = playerQuery.trim().toLocaleLowerCase("pl");
    if (!q) return PLAYERS;
    return PLAYERS.filter((p) => p.name.toLocaleLowerCase("pl").includes(q));
  }, [playerQuery]);

  const selectedPlayer = PLAYERS.find((p) => p.id === values.favoritePlayerId);

  function patchValue<K extends keyof AboutFormValues>(key: K, value: AboutFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function persist(opts: { markCompleted: boolean; skip?: boolean }) {
    setSaving(true);
    setError(null);
    setSavedOk(false);
    try {
      const body = opts.skip
        ? { markAboutCompleted: true }
        : {
            city: values.city || null,
            dartBrand: values.dartBrand || null,
            dartBrandOther:
              values.dartBrand === "other" ? values.dartBrandOther || null : null,
            dartModel: values.dartModel || null,
            dartWeightBucket: values.dartWeightBucket || null,
            throwingHand: values.throwingHand || null,
            favoritePlayerId: values.favoritePlayerId || null,
            profileStatsVisible: true,
            newsletterOptIn: values.newsletterOptIn,
            markAboutCompleted: opts.markCompleted,
          };

      const res = await fetch("/api/customer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Zapis nieudany");

      if (mode === "onboarding") {
        router.replace(nextHref);
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

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-accent-from focus:outline-none";

  const formInner = (
    <>
      {showEncouragement ? (
        <div className="mb-4 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold leading-snug text-foreground">
            Uzupełnij „O Tobie” — odblokujesz więcej z profilu.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              ● Statystyki porównujące graczy z{" "}
              <strong className="font-medium text-foreground">tymi samymi lotkami</strong>{" "}
              (wkrótce)
            </li>
            <li>
              ●{" "}
              <strong className="font-medium text-foreground">
                Spersonalizowana, dedykowana komunikacja
              </strong>
            </li>
            <li>
              ● <strong className="font-medium text-foreground">Punkty gracza wkrótce</strong> —
              uzupełnione pola dadzą dodatkowe punkty
            </li>
            <li>● I wiele więcej</li>
          </ul>
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void persist({ markCompleted: true });
        }}
        className="space-y-4"
      >
        {mode === "edit" ? (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            O Tobie (opcjonalne)
          </p>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Miasto / gmina
          </span>
          <input
            value={cityQuery}
            onChange={(e) => {
              setCityQuery(e.target.value);
              if (values.city && e.target.value !== values.city) patchValue("city", "");
            }}
            placeholder="Wpisz min. 3 litery…"
            autoComplete="off"
            className={inputClass}
          />
          {citySuggestions.length > 0 && !values.city ? (
            <ul className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-black/50">
              {citySuggestions.map((c) => (
                <li key={c}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-white/5"
                    onClick={() => {
                      patchValue("city", c);
                      setCityQuery(c);
                    }}
                  >
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {values.city ? (
            <span className="block text-[11px] text-muted-foreground">
              Wybrano: <span className="text-foreground/90">{values.city}</span>
            </span>
          ) : (
            <span className="block text-[11px] text-muted-foreground">
              Baza obejmuje wszystkie polskie gminy.
            </span>
          )}
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Marka lotek
          </span>
          <select
            value={values.dartBrand}
            onChange={(e) => patchValue("dartBrand", e.target.value)}
            className={inputClass}
          >
            <option value="">— wybierz —</option>
            {BRANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>

        {values.dartBrand === "other" ? (
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Inna marka
            </span>
            <input
              value={values.dartBrandOther}
              onChange={(e) => patchValue("dartBrandOther", e.target.value)}
              className={inputClass}
            />
          </label>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Model lotek
          </span>
          <input
            value={values.dartModel}
            onChange={(e) => patchValue("dartModel", e.target.value)}
            placeholder="np. Bolide 01"
            className={inputClass}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Waga lotek
          </span>
          <select
            value={values.dartWeightBucket}
            onChange={(e) => patchValue("dartWeightBucket", e.target.value)}
            className={inputClass}
          >
            <option value="">— wybierz —</option>
            {DART_WEIGHT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-1.5">
          <legend className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ręka
          </legend>
          <div className="flex gap-2">
            {(
              [
                ["L", "Lewa"],
                ["R", "Prawa"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => patchValue("throwingHand", val)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  values.throwingHand === val
                    ? "border-accent-from/50 bg-accent-from/15 text-foreground"
                    : "border-white/10 bg-black/20 text-muted-foreground hover:border-white/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ulubiony zawodnik
          </span>
          {!values.favoritePlayerId ? (
            <>
              <input
                value={playerQuery}
                onChange={(e) => setPlayerQuery(e.target.value)}
                placeholder="Szukaj albo przewiń listę…"
                autoComplete="off"
                className={inputClass}
              />
              <ul className="max-h-56 overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-black/40">
                {playerList.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-white/5"
                      onClick={() => {
                        patchValue("favoritePlayerId", p.id);
                        setPlayerQuery("");
                      }}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
                {playerList.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">Brak wyników</li>
                ) : null}
              </ul>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                Wybrano:{" "}
                <span className="text-foreground/90">{selectedPlayer?.name ?? values.favoritePlayerId}</span>
              </span>
              <button
                type="button"
                className="text-[11px] text-primary hover:underline"
                onClick={() => {
                  patchValue("favoritePlayerId", "");
                  setPlayerQuery("");
                }}
              >
                Zmień
              </button>
            </div>
          )}
        </div>

        <label className="flex cursor-not-allowed items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3 opacity-90">
          <input type="checkbox" checked readOnly disabled className="mt-0.5" />
          <span className="text-sm text-muted-foreground">
            Dane widoczne do porównań społecznościowych (zawsze włączone).
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
          <input
            type="checkbox"
            checked={values.newsletterOptIn}
            onChange={(e) => patchValue("newsletterOptIn", e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-sm text-muted-foreground">
            Newsletter / tipy — czasem konkret, np. wynik Twojego ulubionego zawodnika. Bez
            spamu.
          </span>
        </label>

        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        ) : null}
        {savedOk && !error ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            Zapisano profil dartera.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-from to-accent-to px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "onboarding" ? "Zapisz i kontynuuj" : "Zapisz „O Tobie”"}
        </button>

        {mode === "onboarding" ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void persist({ markCompleted: false, skip: true })}
            className="w-full py-2 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
          >
            Pomiń na razie
          </button>
        ) : null}
      </form>
    </>
  );

  if (embedded) {
    return <div className="space-y-4 border-t border-white/10 pt-5">{formInner}</div>;
  }

  return <div className="glass-tile space-y-4 p-5">{formInner}</div>;
}
