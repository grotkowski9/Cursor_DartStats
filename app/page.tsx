import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ExternalLink,
  Import,
  Share2,
  Target,
  Trophy,
} from "lucide-react";
import { LandingJsonLd } from "@/components/landing-json-ld";
import { SylveonFooter } from "@/components/sylveon-footer";
import { DEMO_PERSONA } from "@/demo/demo-persona";
import { getDemoMatches } from "@/lib/demo";
import {
  getSiteUrl,
  SITE_ALTERNATES,
  SITE_NAME,
  SYLVEON_DART_SECTION,
  SYLVEON_URL,
} from "@/lib/site-config";

const matchCount = getDemoMatches().length;

export const metadata: Metadata = {
  title: `${SITE_NAME} — statystyki darta z N01, profil gracza, analityka meczów`,
  description:
    "Importuj mecze z n01darts.com, śledź średnie, checkout, formę i H2H. Demo profil Antoni Robot Kowalski — 10 meczów. Produkt Sylveon Company.",
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
    "Sylveon Company dart",
    "turniej darta analityka",
    "dart.sylveoncompany.pl",
    "darts.pl",
  ],
};

const SYLVEON_STATS = [
  { num: "01", value: String(matchCount), label: "Meczów w profilu demo" },
  { num: "02", value: "501", label: "Start score — klasyczny setup" },
  { num: "03", value: "N01", label: "Import jednym linkiem" },
  { num: "04", value: "H2H", label: "Ty vs przeciwnicy" },
] as const;

const PILLARS = [
  {
    num: "01",
    icon: Import,
    title: "Import z N01",
    text: "Wklejasz link z n01darts.com — legi, lotki, checkouty. Bez ręcznego przepisywania tabelek po turnieju.",
    tags: ["N01", "Import", "Turnieje"],
  },
  {
    num: "02",
    icon: BarChart3,
    title: "Analityka, nie zgadywanie",
    text: "Średnia ważona, first 9, forma, aktywność po dniach i godzinach, histogram checkoutów — jak w CRM, tylko dla lotek.",
    tags: ["Forma", "Checkout", "Aktywność"],
  },
  {
    num: "03",
    icon: Trophy,
    title: "H2H i top listy",
    text: "Kto cię bije, kogo bijesz, najlepsze rzuty i finish. Dane z meczów, nie z pamięci po piwie.",
    tags: ["H2H", "Top 10", "180"],
  },
  {
    num: "04",
    icon: Share2,
    title: "Share meczu",
    text: "Link do meczu z rzutem po rzucie. Profil zostaje prywatny (noindex) — udostępniasz tylko to, co chcesz.",
    tags: ["Share", "Noindex", "Prywatność"],
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

        {/* Hero — Sylveon-style headline */}
        <section className="relative z-10 mx-auto max-w-4xl px-6 pb-20 pt-16 md:pt-28">
          <Link
            href={SYLVEON_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80 transition hover:text-primary"
          >
            Piotr Grotkowski · Sylveon Company
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Link>

          <div className="mt-8 flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <div className="relative mb-8 inline-flex dartboard-ring">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card/60 text-primary backdrop-blur-xl">
                  <Target className="h-8 w-8" aria-hidden />
                </div>
              </div>

              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl lg:text-[3.25rem]">
                Statystyki darta.
                <br />
                <span className="text-accent-gradient">
                  Rozmawiamy o lotkach,
                </span>
                <br />
                nie o obietnicach.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                <strong className="font-medium text-foreground">{SITE_NAME}</strong>{" "}
                — prywatny panel po imporcie z N01. Wykres formy, H2H, checkout,
                aktywność. Osobny produkt w ekosystemie{" "}
                <Link
                  href={SYLVEON_DART_SECTION}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-gradient font-medium"
                >
                  dart &amp; event management
                </Link>
                .
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/demo/profile"
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-from to-accent-to px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-accent-to/25 transition hover:shadow-accent-to/45"
                >
                  Zobacz demo →
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
                {DEMO_PERSONA.lastName} · {matchCount} spotkań · dane zanonimizowane
              </p>
            </div>

            {/* Sylveon numbered stats */}
            <div className="grid shrink-0 grid-cols-2 gap-4 lg:w-80">
              {SYLVEON_STATS.map((s) => (
                <article key={s.num} className="glass-tile relative overflow-hidden p-5">
                  <span className="sylveon-section-num">{s.num}</span>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-accent-gradient">
                    {s.value}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{s.label}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Pillars — numbered like sylveoncompany.pl sections */}
        <section className="relative z-10 border-t border-white/10 bg-black/15 px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <p className="sylveon-section-num">Co dostajesz</p>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">
              Od linku N01 do profilu gracza
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {PILLARS.map(({ num, icon: Icon, title, text, tags }) => (
                <article
                  key={num}
                  className="glass-tile group p-6 transition hover:border-accent-from/25"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="sylveon-section-num">{num}</span>
                    <Icon
                      className="h-5 w-5 text-accent-from opacity-80 transition group-hover:opacity-100"
                      aria-hidden
                    />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Demo CTA — board accent */}
        <section className="relative z-10 px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <div className="relative overflow-hidden rounded-3xl border border-accent-from/30 bg-gradient-to-br from-accent-from/12 via-card/40 to-accent-to/12 p-8 md:p-14">
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border border-white/10 opacity-40"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full border border-dashed border-white/10 opacity-30"
                aria-hidden
              />
              <p className="sylveon-section-num">05 · Demo</p>
              <h2 className="mt-2 text-2xl font-bold md:text-4xl">
                {matchCount} spotkań. Zero rejestracji.
              </h2>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                Profil <strong className="text-foreground">Antoni „Robot" Kowalski</strong>{" "}
                to pełna analityka — statystyki, wykres formy, H2H, karty meczów i{" "}
                <em>rzut po rzucie</em>. Zanonimizowane, indexowalne — zobacz produkt,
                zanim założysz konto.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/demo/profile"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-from to-accent-to px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-md"
                >
                  Otwórz profil demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={`/demo/m/demo001`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-medium transition hover:border-white/25"
                >
                  Od razu do meczu (demo001)
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Sylveon bridge */}
        <section className="relative z-10 border-t border-white/10 px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <p className="sylveon-section-num">06 · Sylveon Company</p>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">
              Dart to nie jedyny sport w portfolio
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
              {SITE_NAME} rozwijamy obok doradztwa iGaming, CRM, e-commerce i analityki
              danych. Turnieje, eventy, sprzęt — sekcja{" "}
              <Link
                href={SYLVEON_DART_SECTION}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-primary"
              >
                Dart &amp; Event Management
              </Link>{" "}
              na{" "}
              <Link
                href={SYLVEON_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-gradient font-medium"
              >
                sylveoncompany.pl
              </Link>{" "}
              opisuje resztę aktywności. Ten tracker = narzędzie dla graczy i organizatorów,
              którzy lubią liczby.
            </p>

            <Link
              href={SYLVEON_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium transition hover:border-accent-from/40 hover:text-primary"
            >
              Skontaktuj się na sylveoncompany.pl
              <ArrowRight className="h-4 w-4" />
            </Link>

            <p className="mt-8 text-xs text-muted-foreground">
              Domeny produktu:{" "}
              {SITE_ALTERNATES.map((d, i) => (
                <span key={d}>
                  {i > 0 ? " · " : ""}
                  <code className="rounded bg-white/10 px-1 py-0.5">{d.replace("https://", "")}</code>
                </span>
              ))}{" "}
              — canonical przez <code className="rounded bg-white/10 px-1 py-0.5">NEXT_PUBLIC_SITE_URL</code>
            </p>
          </div>
        </section>

        <section className="relative z-10 px-6 pb-12">
          <p className="mx-auto max-w-4xl text-center text-xs text-muted-foreground/70">
            Masz już dostęp dev?{" "}
            <Link href="/profile" className="hover:text-primary hover:underline">
              /profile
            </Link>{" "}
            (prywatny, noindex)
          </p>
        </section>
      </main>
      <SylveonFooter />
    </>
  );
}
