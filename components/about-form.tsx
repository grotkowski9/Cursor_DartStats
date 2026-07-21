"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { CustomerProfile } from "@/lib/customer";
import { DART_WEIGHT_OPTIONS } from "@/lib/about-options";
import plCities from "@/data/pl-cities.json";
import dartBrands from "@/data/dart-brands.json";
import favoritePlayers from "@/data/favorite-players.json";

type Brand = { id: string; label: string };
type Player = { id: string; name: string; tier: string };

const CITIES = plCities as string[];
const BRANDS = dartBrands as Brand[];
const PLAYERS = (favoritePlayers as Player[])
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name, "pl"));

export type AboutFormValues = {
  city: string;
  dartBrand: string;
  dartBrandOther: string;
  dartModel: string;
  dartWeightBucket: string;
  throwingHand: "" | "L" | "R";
  favoritePlayerId: string;
  newsletterOptIn: boolean;
};

type Props = {
  initial: AboutFormValues;
  mode: "onboarding" | "edit";
  /** After save/skip in onboarding */
  nextHref?: string;
  showEncouragement?: boolean;
  onSaved?: () => void;
};

export function customerToAboutValues(c: CustomerProfile): AboutFormValues {
  return {
    city: c.city ?? "",
    dartBrand: c.dartBrand ?? "",
    dartBrandOther: c.dartBrandOther ?? "",
    dartModel: c.dartModel ?? "",
    dartWeightBucket: c.dartWeightBucket ?? "",
    throwingHand: c.throwingHand ?? "",
    favoritePlayerId: c.favoritePlayerId ?? "",
    newsletterOptIn: c.newsletterOptIn,
  };
}

export function AboutForm({
  initial,
  mode,
  nextHref = "/demo/profile?tour=1",
  showEncouragement = false,
  onSaved,
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
    return CITIES.filter((c) => c.toLocaleLowerCase("pl").includes(q)).slice(0, 8);
  }, [cityQuery]);

  const playerSuggestions = useMemo(() => {
    const q = playerQuery.trim().toLocaleLowerCase("pl");
    if (!q) return PLAYERS.slice(0, 12);
    return PLAYERS.filter((p) => p.name.toLocaleLowerCase("pl").includes(q)).slice(0, 12);
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
    "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-[color:var(--onb-mint,#7dd3c0)] focus:outline-none";

  return (
    <div className="space-y-5">
      {showEncouragement ? (
        <div className="glass-tile space-y-3 p-5">
          <p className="text-sm font-semibold leading-snug text-foreground">
            Uzupełnij „O Tobie” — odblokujesz więcej z profilu.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <span className="text-[color:var(--onb-mint,#7dd3c0)]">●</span> Statystyki
              porównujące graczy z{" "}
              <strong className="font-medium text-foreground">tymi samymi lotkami</strong>{" "}
              (wkrótce)
            </li>
            <li>
              <span className="text-[color:var(--onb-rose,#e8a0c0)]">●</span>{" "}
              <strong className="font-medium text-foreground">
                Spersonalizowana, dedykowana komunikacja
              </strong>
            </li>
            <li>
              <span className="text-[color:var(--onb-lilac,#c4a8e8)]">●</span>{" "}
              <strong className="font-medium text-foreground">Punkty gracza wkrótce</strong> —
              uzupełnione pola dadzą dodatkowe punkty
            </li>
            <li>
              <span className="text-primary">●</span> I wiele więcej
            </li>
          </ul>
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void persist({ markCompleted: true });
        }}
        className="glass-tile space-y-4 p-5"
      >
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Miasto
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
            <ul className="overflow-hidden rounded-xl border border-white/10 bg-black/50">
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
            <span className="block text-[11px] text-[color:var(--onb-mint,#7dd3c0)]">
              Wybrane: {values.city}
            </span>
          ) : (
            <span className="block text-[11px] text-muted-foreground">
              Tylko miasta z listy PL.
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
                    ? "border-[color:var(--onb-mint,#7dd3c0)]/50 bg-[color:var(--onb-mint,#7dd3c0)]/15 text-foreground"
                    : "border-white/10 bg-black/20 text-muted-foreground hover:border-white/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ulubiony zawodnik
          </span>
          <input
            value={playerQuery}
            onChange={(e) => setPlayerQuery(e.target.value)}
            placeholder={selectedPlayer?.name ?? "Szukaj A–Z…"}
            className={inputClass}
          />
          <ul className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-black/40">
            {playerSuggestions.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-white/5 ${
                    values.favoritePlayerId === p.id ? "text-[color:var(--onb-mint,#7dd3c0)]" : ""
                  }`}
                  onClick={() => {
                    patchValue("favoritePlayerId", p.id);
                    setPlayerQuery(p.name);
                  }}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </label>

        <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-muted-foreground">
          Twoje dane mogą być używane do porównań społecznościowych (zawsze włączone).
        </p>

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
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[color:var(--onb-mint,#7dd3c0)] via-[color:var(--onb-lilac,#c4a8e8)] to-[color:var(--onb-rose,#e8a0c0)] px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "onboarding" ? "Zapisz i kontynuuj" : "Zapisz"}
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
    </div>
  );
}
