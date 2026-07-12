import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Import,
  Share2,
  Target,
  Trophy,
} from "lucide-react";
import { LandingJsonLd } from "@/components/landing-json-ld";
import { SiteFooter } from "@/components/site-footer";
import { DEMO_PERSONA } from "@/demo/demo-persona";
import { getDemoMatches } from "@/lib/demo";
import { getSiteUrl, SITE_NAME } from "@/lib/site-config";

const matchCount = getDemoMatches().length;

export const metadata: Metadata = {
  title: `${SITE_NAME} — statystyki darta z N01, profil gracza, analityka meczów`,
  description:
    "Importuj mecze z n01darts.com, śledź średnie, checkout, formę i H2H. Demo profil z 10 meczami — zobacz przed rejestracją.",
  robots: { index: true, follow: true },
  alternates: { canonical: getSiteUrl() },
  openGraph: {
    title: SITE_NAME,
    description:
      "Statystyki darta z N01 — wykres formy, H2H, checkout. Zobacz demo przed rejestracją.",
    url: getSiteUrl(),
    type: "website",
    locale: "pl_PL",
  },
  keywords: [
    "dart statystyki",
    "n01 import",
    "profil gracza darta",
    "turniej darta analityka",
    "wykres formy darta",
  ],
};

const HERO_STATS = [
  { value: String(matchCount), label: "Meczów w demo" },
  { value: "501", label: "Start score" },
  { value: "N01", label: "Import linkiem" },
  { value: "H2H", label: "vs przeciwnicy" },
] as const;

const FEATURES = [
  {
    icon: Import,
    title: "Import z N01",
    text: "Wklejasz link z n01darts.com — legi, lotki, checkouty. Bez ręcznego przepisywania po turnieju.",
  },
  {
    icon: BarChart3,
    title: "Analityka na serio",
    text: "Średnia ważona, first 9, forma, aktywność po dniach i godzinach, histogram checkoutów.",
  },
  {
    icon: Trophy,
    title: "H2H i top listy",
    text: "Kto cię bije, kogo bijesz, najlepsze rzuty i finish — z meczów, nie z pamięci.",
  },
  {
    icon: Share2,
    title: "Share meczu",
    text: "Link do meczu z rzutem po rzucie. Profil zostaje prywatny (noindex).",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <LandingJsonLd />
      <main className="relative overflow-hidden bg-background text-foreground">
        <div className="bg-grid absolute inset-0 z-0 opacity-20" aria-hidden />
        <div
          className="absolute left-1/2 top-[-20%] z-0 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-from/25 to-accent-to/25 blur-[140px]"
          aria-hidden
        />

        <section className="relative z-10 mx-auto max-w-4xl px-6 pb-20 pt-16 md:pt-24">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <div className="relative mb-8 inline-flex dartboard-ring">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card/60 text-primary backdrop-blur-xl">
                  <Target className="h-8 w-8" aria-hidden />
                </div>
              </div>

              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl lg:text-[3.25rem]">
                Dart{" "}
                <span className="text-accent-gradient">Profile</span> Tracker
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                Importuj mecze z N01, zobacz jak grasz naprawdę — średnie, checkout,
                forma, head-to-head. Prywatny profil, publiczne demo do obejrzenia
                przed rejestracją.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/demo/profile"
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-from to-accent-to px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-accent-to/25 transition hover:shadow-accent-to/45"
                >
                  Zobacz profil demo
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold transition hover:border-accent-from/40 hover:bg-accent-from/5"
                >
                  Zaloguj się / Zarejestruj
                </Link>
              </div>

              <p className="mt-6 text-xs text-muted-foreground">
                Demo: {DEMO_PERSONA.firstName} „{DEMO_PERSONA.nickname}"{" "}
                {DEMO_PERSONA.lastName} · {matchCount} spotkań
              </p>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-3 lg:w-72">
              {HERO_STATS.map((s) => (
                <article key={s.label} className="glass-tile flex flex-col items-center px-3 py-5 text-center">
                  <span className="text-2xl font-bold text-accent-gradient">{s.value}</span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 border-t border-white/10 bg-black/10 px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-primary/80">
              Co dostajesz
            </h2>
            <p className="mt-2 text-2xl font-bold">Od linku N01 do profilu gracza</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <article key={title} className="glass-tile p-5">
                  <Icon className="mb-3 h-5 w-5 text-accent-from" aria-hidden />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 px-6 py-16">
          <div className="mx-auto max-w-4xl rounded-3xl border border-accent-from/25 bg-gradient-to-br from-accent-from/10 via-transparent to-accent-to/10 p-8 md:p-12">
            <h2 className="text-2xl font-bold md:text-3xl">
              {matchCount} spotkań demo — bez konta
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Pełna analityka na przykładowym profilu{" "}
              <strong className="text-foreground">
                {DEMO_PERSONA.firstName} „{DEMO_PERSONA.nickname}" {DEMO_PERSONA.lastName}
              </strong>
              : statystyki, wykres formy, H2H i mecze z widokiem rzut po rzucie.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/demo/profile"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-from to-accent-to px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md"
              >
                Otwórz profil demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/demo/m/demo001"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium transition hover:border-white/25"
              >
                Przykładowy mecz
              </Link>
            </div>
          </div>
        </section>

        <section className="relative z-10 px-6 pb-8">
          <p className="mx-auto max-w-4xl text-center text-xs text-muted-foreground/70">
            Masz już dostęp?{" "}
            <Link href="/profile" className="hover:text-primary hover:underline">
              /profile
            </Link>{" "}
            (prywatny)
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
