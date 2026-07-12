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
      "Prywatny panel statystyk darta — import N01, wykresy, share meczu. Zobacz demo przed rejestracją.",
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
  ],
};

const FEATURES = [
  {
    icon: Import,
    title: "Import z N01",
    text: "Wklejasz link z n01darts.com — reszta robi się sama. Legi, lotki, checkouty.",
  },
  {
    icon: BarChart3,
    title: "Analityka, nie zgadywanie",
    text: "Średnia ważona, first 9, forma, aktywność po dniach i godzinach, histogram checkoutów.",
  },
  {
    icon: Trophy,
    title: "H2H i top listy",
    text: "Kto cię bije, kogo bijesz, najlepsze rzuty i finish — w jednym miejscu.",
  },
  {
    icon: Share2,
    title: "Share meczu",
    text: "Link do meczu z rzutem po rzucie — prywatny profil zostaje noindex.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <main className="relative overflow-hidden bg-background text-foreground">
        <div className="bg-grid absolute inset-0 z-0 opacity-20" aria-hidden />
        <div
          className="absolute left-1/2 top-[-20%] z-0 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-from/25 to-accent-to/25 blur-[140px]"
          aria-hidden
        />

        {/* Hero */}
        <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16 pt-16 md:pt-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">
            Sylveon Company · Dart &amp; Event
          </p>
          <div className="mt-6 flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card/60 text-primary backdrop-blur-xl">
                <Target className="h-7 w-7" aria-hidden />
              </div>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
                Dart{" "}
                <span className="text-accent-gradient">Profile</span> Tracker
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Twój prywatny panel statystyk. Import z N01, wykres formy, H2H —
                bez Excela i bez zmyślania średnich.{" "}
                <span className="text-foreground/90">
                  Rozmawiamy o lotkach, nie o obietnicach.
                </span>
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/demo/profile"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-from to-accent-to px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-accent-to/25 transition hover:shadow-accent-to/45"
                >
                  Profil demo — {DEMO_PERSONA.firstName} „{DEMO_PERSONA.nickname}"{" "}
                  {DEMO_PERSONA.lastName}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold transition hover:border-accent-from/40 hover:bg-accent-from/5"
                >
                  Zaloguj się / Zarejestruj
                </Link>
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-3 md:w-72">
              {[
                { n: String(matchCount), label: "meczów w demo" },
                { n: "501", label: "start score" },
                { n: "N01", label: "import linkiem" },
                { n: "H2H", label: "vs przeciwnicy" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="glass-tile flex flex-col items-center justify-center px-3 py-5 text-center"
                >
                  <span className="text-2xl font-bold text-accent-gradient">{s.n}</span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="relative z-10 border-t border-white/10 bg-black/10 px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-primary/80">
              Co dostajesz
            </h2>
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

        {/* Demo CTA */}
        <section className="relative z-10 px-6 py-16">
          <div className="mx-auto max-w-4xl rounded-3xl border border-accent-from/25 bg-gradient-to-br from-accent-from/10 via-transparent to-accent-to/10 p-8 md:p-12">
            <h2 className="text-2xl font-bold md:text-3xl">
              Zobacz, zanim założysz konto
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Profil demo ma <strong className="text-foreground">{matchCount} spotkań</strong>{" "}
              — pełne statystyki, wykresy i karty meczów z linkiem „Rzut po rzucie".
              Zanonimizowane dane, indexowalne w Google — żebyś wiedział, na co się
              piszesz.
            </p>
            <Link
              href="/demo/profile"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-from to-accent-to px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md"
            >
              Otwórz profil Antoni „Robot" Kowalski
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Sylveon cross-link SEO */}
        <section className="relative z-10 border-t border-white/10 px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-primary/80">
              Część Sylveon Company
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
              {SITE_NAME} to osobny produkt pod dartem — rozwijany przez{" "}
              <Link
                href={SYLVEON_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-primary"
              >
                Sylveon Company
              </Link>
              , firmę Piotra Grotkowskiego (iGaming, CRM, e-commerce,{" "}
              <Link
                href={SYLVEON_DART_SECTION}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-gradient font-medium"
              >
                dart &amp; event management
              </Link>
              ). Strona działa pod{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
                dart.sylveoncompany.pl
              </code>{" "}
              lub{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">darts.pl</code>{" "}
              — canonical ustawiasz w Vercel przez{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
                NEXT_PUBLIC_SITE_URL
              </code>
              .
            </p>
            <Link
              href={SYLVEON_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              sylveoncompany.pl
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <p className="mt-6 text-xs text-muted-foreground">
              Domeny alternatywne: {SITE_ALTERNATES.join(" · ")}
            </p>
          </div>
        </section>

        {/* Dev shortcut — subtle */}
        <section className="relative z-10 px-6 pb-12">
          <p className="mx-auto max-w-4xl text-center text-xs text-muted-foreground/70">
            Masz już dostęp?{" "}
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
