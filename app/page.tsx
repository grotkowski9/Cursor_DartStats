import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Link2,
  Target,
  Trophy,
} from "lucide-react";
import { LandingJsonLd } from "@/components/landing-json-ld";
import { SiteFooter } from "@/components/site-footer";
import { siteDocumentTitle, SITE_OG_TITLE } from "@/lib/page-metadata";
import { getSiteUrl, SITE_BRAND, SITE_NAME_SHORT } from "@/lib/site-config";

export const metadata: Metadata = {
  title: siteDocumentTitle(),
  description:
    "Importuj mecze z n01darts.com, śledź średnie, checkout, formę i H2H. Demo profil z 10 meczami — zobacz przed rejestracją.",
  robots: { index: true, follow: true },
  alternates: { canonical: getSiteUrl() },
  openGraph: {
    title: SITE_OG_TITLE,
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


const FEATURES = [
  {
    icon: Link2,
    title: "Koniec z Excelem",
    text: "Żadnego Excela, żadnego N01 po każdym turnieju. Wklejasz link, a legi, lotki i checkouty lądują w profilu. Dane o meczu masz od teraz w jednym miejscu. Na swoim koncie.",
  },
  {
    icon: BarChart3,
    title: "Analityka na serio",
    text: "Średnie, H2H, wykresy formy, podejść i zamknięć. Aktywność i forma wg. dni i godzin, rozkład checkoutów i wiele więcej.",
  },
  {
    icon: Trophy,
    title: "Head-to-head",
    text: "Różne turnieje, ale ten sam przeciwnik? Żaden problem. Porównasz statystyki dotychczasowych spotkań między wami.",
  },
] as const;

export default function HomePage() {
  /* Hero highlight tiles — wyłączone na landing, kod zostaje do ewentualnego powrotu
  const heroHighlights = [
    { value: "Top zamknięć", label: "najczęstsze finish" },
    { value: "Top podejść", label: "najczęstsze rzuty" },
    { value: "Forma", label: "wykres po meczach" },
    { value: "Turnieje", label: "jeden profil gracza" },
  ] as const;
  */

  return (
    <>
      <LandingJsonLd />
      <main className="relative overflow-hidden bg-background text-foreground">
        <div className="bg-grid absolute inset-0 z-0 opacity-20" aria-hidden />
        <div
          className="absolute left-1/2 top-[-20%] z-0 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-from/25 to-accent-to/25 blur-[140px]"
          aria-hidden
        />

        <section className="relative z-10 mx-auto max-w-4xl px-6 pb-8 pt-12 md:pt-16">
          <div>
            <div className="max-w-xl">
              <div className="relative mb-8 inline-flex dartboard-ring">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card/60 text-primary backdrop-blur-xl">
                  <Target className="h-8 w-8" aria-hidden />
                </div>
              </div>

              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl lg:text-[3.25rem]">
                <span className="bg-gradient-to-r from-sylveon-from to-sylveon-to bg-clip-text text-transparent">
                  {SITE_BRAND}
                </span>{" "}
                <span className="text-accent-gradient">{SITE_NAME_SHORT}</span>
              </h1>
              <p className="mt-6 leading-relaxed text-muted-foreground">
                <span className="text-lg font-semibold text-foreground/90">
                  Twój dart. W liczbach.
                </span>
                <br />
                <span className="text-base">
                  Importuj mecze z N01 i zobacz jak grasz naprawdę.
                  Średnie, checkouty, forma, H2H i wiele wykresów.
                  <br />
                  Różne turnieje — jeden profil gracza.
                </span>
              </p>

              <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-from to-accent-to px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-accent-to/25 transition hover:shadow-accent-to/45"
                >
                  Zaloguj się / Zarejestruj
                </Link>
                <Link
                  href="/demo/profile"
                  className="group inline-flex items-center justify-center gap-1.5 self-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-semibold text-muted-foreground transition hover:border-accent-from/40 hover:bg-accent-from/5 hover:text-foreground sm:self-auto"
                >
                  Zobacz profil demo
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            {/* Hero highlight tiles — wyłączone na landing
            <div className="grid shrink-0 grid-cols-2 gap-3 lg:w-72">
              {heroHighlights.map((s) => (
                <article key={s.label} className="glass-tile flex flex-col items-center px-3 py-5 text-center">
                  <span className="text-2xl font-bold text-accent-gradient">{s.value}</span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </span>
                </article>
              ))}
            </div>
            */}
          </div>
        </section>

        <section className="relative z-10 border-t border-white/10 bg-black/10 px-6 pt-8 pb-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-primary/80">
              Co dostajesz
            </h2>
            <p className="mt-2 text-2xl font-bold">Od linku N01 do profilu gracza</p>
            <div className="mt-6 flex flex-col gap-4">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <article key={title} className="glass-tile w-full p-5">
                  <Icon className="mb-3 h-5 w-5 text-accent-from" aria-hidden />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 border-t border-white/10 px-6 py-6">
          <div className="mx-auto max-w-4xl rounded-3xl border border-accent-from/25 bg-gradient-to-br from-accent-from/10 via-transparent to-accent-to/10 p-6 md:p-8">
            <h2 className="text-2xl font-bold leading-snug md:text-3xl">
              Zobacz jak wygląda{" "}
              <span className="bg-gradient-to-r from-sylveon-from to-sylveon-to bg-clip-text text-transparent">
                przykładowy
              </span>{" "}
              <span className="text-accent-gradient">profil</span>
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Nadal nie chcesz założyć konta? Sprawdź profil demo. Zobacz statystyki, wykres
              formy, H2H i widok rzut po rzucie. Wszystko tak, jak na Twoim koncie.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
      </main>
      <SiteFooter />
    </>
  );
}
