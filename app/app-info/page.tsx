import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { getSiteUrl, SITE_NAME } from "@/lib/site-config";

const privacyUrl = `${getSiteUrl()}/privacy`;

export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
  description:
    "Sylveon Dart Profile — web application for dart players. Import N01 matches, player profile, statistics, and Google Sign-In account creation.",
  applicationName: SITE_NAME,
  robots: { index: true, follow: true },
  alternates: { canonical: `${getSiteUrl()}/app-info` },
  openGraph: {
    title: SITE_NAME,
    siteName: SITE_NAME,
    description:
      "Sylveon Dart Profile — web application for dart players with Google Sign-In, N01 import, and player statistics.",
    url: `${getSiteUrl()}/app-info`,
    type: "website",
    locale: "pl_PL",
  },
};

const sectionTitle = "mt-10 text-lg font-semibold text-foreground first:mt-0";
const body = "mt-3 text-base leading-relaxed text-muted-foreground";

export default function AppInfoPage() {
  return (
    <>
      <main className="bg-background text-foreground">
        <article className="mx-auto max-w-2xl px-6 py-12 md:py-16">
          <header>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {SITE_NAME}
            </h1>
            <p className={`${body} mt-4`}>
              Oficjalna strona informacyjna aplikacji{" "}
              <strong className="font-semibold text-foreground">{SITE_NAME}</strong>.
            </p>
          </header>

          <section>
            <h2 className={sectionTitle}>O aplikacji</h2>
            <p className={body}>
              <strong className="font-semibold text-foreground">{SITE_NAME}</strong> to aplikacja
              internetowa dla graczy darta. Umożliwia założenie konta użytkownika, import meczów z
              platformy N01 (n01darts.com) oraz budowanie osobistego profilu gracza ze statystykami,
              wykresami formy, porównaniami head-to-head i analizą checkoutów.
            </p>
            <p className={body}>
              Aplikacja jest udostępniana pod adresem{" "}
              <Link href="/" className="text-primary underline-offset-2 hover:underline">
                {getSiteUrl()}
              </Link>
              . Nie wymaga logowania do przeglądania strony informacyjnej ani profilu demonstracyjnego.
            </p>
          </section>

          <section>
            <h2 className={sectionTitle}>Funkcje aplikacji</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-muted-foreground">
              <li>Import meczów darta z linków N01</li>
              <li>Profil gracza ze statystykami (średnie, checkouty, forma)</li>
              <li>Wykresy aktywności i porównania head-to-head (H2H)</li>
              <li>Udostępnianie meczów i podgląd historii gry</li>
            </ul>
          </section>

          <section>
            <h2 className={sectionTitle}>Logowanie przez Google</h2>
            <p className={body}>
              {SITE_NAME} oferuje logowanie i rejestrację za pomocą konta Google (Google Sign-In).
              Używamy tej metody wyłącznie w celu utworzenia i obsługi konta użytkownika w aplikacji.
            </p>
            <p className={body}>
              W ramach logowania Google otrzymujemy następujące dane użytkownika (zakresy OAuth:{" "}
              <code className="text-sm text-foreground/90">openid</code>,{" "}
              <code className="text-sm text-foreground/90">email</code>,{" "}
              <code className="text-sm text-foreground/90">profile</code>):
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-muted-foreground">
              <li>Adres e-mail — do identyfikacji konta i komunikacji związanej z kontem</li>
              <li>Imię i nazwisko oraz zdjęcie profilowe (jeśli udostępnione) — do personalizacji profilu gracza</li>
            </ul>
            <p className={body}>
              Nie używamy danych Google do reklam, nie sprzedajemy ich podmiotom trzecim i nie
              uzyskujemy dostępu do innych danych poza wymienionymi zakresami. Szczegóły przetwarzania
              danych opisuje polityka prywatności.
            </p>
          </section>

          <section>
            <h2 className={sectionTitle}>Polityka prywatności</h2>
            <p className={body}>
              Polityka prywatności {SITE_NAME} jest dostępna pod adresem:
            </p>
            <p className={`${body} break-all font-medium text-foreground`}>
              <Link href="/privacy" className="text-primary underline-offset-2 hover:underline">
                {privacyUrl}
              </Link>
            </p>
          </section>

          <section lang="en">
            <h2 className={sectionTitle}>About {SITE_NAME} (English)</h2>
            <p className={body}>
              <strong className="font-semibold text-foreground">{SITE_NAME}</strong> is a web
              application for dart players. It lets users create an account, import match data from
              N01 (n01darts.com), and build a personal player profile with statistics, form charts,
              head-to-head comparisons, and checkout analysis.
            </p>
          </section>

          <section lang="en">
            <h2 className={sectionTitle}>Google Sign-In (English)</h2>
            <p className={body}>
              {SITE_NAME} uses Google Sign-In only to create and manage user accounts. We request
              OAuth scopes <code className="text-sm text-foreground/90">openid</code>,{" "}
              <code className="text-sm text-foreground/90">email</code>, and{" "}
              <code className="text-sm text-foreground/90">profile</code> to receive your email
              address and basic profile information (name and profile picture, if shared) for account
              identification and player profile personalization. We do not use Google user data for
              advertising.
            </p>
            <p className={body}>
              Privacy policy:{" "}
              <Link href="/privacy" className="text-primary underline-offset-2 hover:underline">
                {privacyUrl}
              </Link>
            </p>
          </section>

          <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-8 text-sm">
            <Link href="/" className="text-primary underline-offset-2 hover:underline">
              Strona główna
            </Link>
            <Link href="/login" className="text-primary underline-offset-2 hover:underline">
              Logowanie
            </Link>
            <Link href="/privacy" className="text-primary underline-offset-2 hover:underline">
              Polityka prywatności
            </Link>
            <Link href="/demo/profile" className="text-primary underline-offset-2 hover:underline">
              Profil demo
            </Link>
          </nav>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
