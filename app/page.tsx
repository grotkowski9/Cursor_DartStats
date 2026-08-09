import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Link2,
  Trophy,
} from "lucide-react";
import { LandingJsonLd } from "@/components/landing-json-ld";
import { BrandLogoMark } from "@/components/brand-logo-mark";
import { AccentGlowCta } from "@/components/accent-glow-cta";
import { SiteFooter } from "@/components/site-footer";
import { siteDocumentTitle, SITE_OG_TITLE } from "@/lib/page-metadata";
import { getSiteUrl, SITE_BRAND, SITE_NAME_SHORT } from "@/lib/site-config";

export const metadata: Metadata = {
  title: siteDocumentTitle(),
  description:
    "Twój profil gracza darta: średnie, checkouty i H2H z meczów N01. Chcesz wiedzieć o której godzinie masz najlepszą formę? Wiele statystyk pod ręką. Bez excela.",
  robots: { index: true, follow: true },
  alternates: { canonical: getSiteUrl() },
  openGraph: {
    title: SITE_OG_TITLE,
    description:
      "Twój profil gracza darta: średnie, checkouty i H2H z meczów N01. Chcesz wiedzieć o której godzinie masz najlepszą formę? Wiele statystyk pod ręką. Bez excela.",
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
    text: "Żadnego ręcznego przepisywania danych po meczach i skomplikowanych formuł. Wklejasz link, a legi, lotki i checkouty lądują w profilu. Dane masz od teraz w jednym miejscu. Na swoim koncie.",
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

        <section className="relative z-10 px-6 pb-8 pt-12 md:pt-16">
          <div className="mx-auto max-w-4xl">
            <BrandLogoMark />

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
                  Zobacz jak grasz naprawdę. Wrzucaj swoje mecze z n01, a resztą zajmiemy
                  się my.
                  <br />
                  Średnie, checkouty, forma, H2H i wiele wykresów. Różne turnieje - jeden
                  profil gracza.
                </span>
              </p>

              <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <AccentGlowCta href="/login">Zaloguj się / Zarejestruj</AccentGlowCta>
                <Link
                  href="/demo/profile"
                  className="group inline-flex items-center justify-center gap-1.5 self-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-semibold text-muted-foreground transition hover:border-accent-from/40 hover:bg-accent-from/5 hover:text-foreground sm:self-auto"
                >
                  Zobacz profil demo
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </Link>
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

        <div className="relative z-10 mx-auto w-full max-w-4xl px-6" aria-hidden>
          <div className="relative">
            <div
              className="relative z-10 h-px w-full"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, transparent 0%, var(--accent-from) 35%, var(--accent-to) 65%, transparent 100%)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-12 blur-md"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, color-mix(in oklab, var(--accent-from) 26%, transparent), color-mix(in oklab, var(--accent-to) 10%, transparent), transparent)",
              }}
            />
          </div>
        </div>

        <section className="relative z-10 bg-black/10 px-6 pt-8 pb-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-primary/80">
              Co dostajesz
            </h2>
            <p className="mt-2 text-2xl font-bold">Od linku N01 do profilu gracza</p>
            <div className="mt-6 flex flex-col gap-4">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <article
                  key={title}
                  className="glass-tile group relative w-full p-5"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-4 rounded-l-[var(--radius)] transition-opacity duration-300 group-hover:opacity-0"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, color-mix(in oklab, var(--sylveon-from) 42%, transparent), color-mix(in oklab, var(--sylveon-to) 16%, transparent), transparent)",
                    }}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-2 z-0 rounded-[calc(var(--radius)+0.5rem)] opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-22"
                    style={{
                      backgroundImage:
                        "radial-gradient(ellipse at center, color-mix(in oklab, var(--sylveon-from) 55%, var(--accent-from)) 0%, color-mix(in oklab, var(--sylveon-to) 50%, var(--accent-to)) 42%, transparent 70%)",
                    }}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-0 rounded-[var(--radius)] opacity-0 shadow-[0_0_14px_3px_oklch(0.82_0.12_320_/_0.14),0_0_22px_6px_oklch(0.75_0.12_250_/_0.1)] transition-opacity duration-300 group-hover:opacity-100"
                  />
                  <Icon className="relative z-10 mb-3 h-5 w-5 text-accent-from" aria-hidden />
                  <h3 className="relative z-10 font-semibold">{title}</h3>
                  <p className="relative z-10 mt-2 text-sm leading-relaxed text-muted-foreground">
                    {text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 border-t border-white/10 px-6 py-[clamp(28px,5vw,48px)]">
          <div className="product-link">
            <p className="product-link-eyebrow">Profil demo</p>
            <h2 className="mt-4 text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-snug tracking-tight">
              Zobacz jak wygląda{" "}
              <span className="bg-gradient-to-r from-[#ff7eb6] to-[#c084fc] bg-clip-text text-transparent">
                przykładowy
              </span>{" "}
              <span className="bg-gradient-to-r from-[#7dd3fc] to-[#a78bfa] bg-clip-text text-transparent">
                profil
              </span>
            </h2>
            <p className="mx-auto mt-3 max-w-[540px] text-left text-xs leading-relaxed text-muted-foreground">
              Nadal nie chcesz założyć konta? Dziwne... ale na pewno jak obczaisz profil
              demo to zmienisz zdanie! Zobacz statystyki, wykresy i inne bajery. Wszystko
              takie, jak na Twoim koncie.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <Link href="/demo/profile" className="btn-sylveon">
                Przykładowy profil
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/demo/m/demo001"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-[#ff7eb6]/40 hover:text-foreground"
              >
                Przykładowy mecz
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
