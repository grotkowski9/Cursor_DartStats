/** Primary public URL — set NEXT_PUBLIC_SITE_URL in Vercel per deployment. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return "https://dart.sylveoncompany.pl";
}

/** Alternate domains — same app, pick canonical via NEXT_PUBLIC_SITE_URL. */
export const SITE_ALTERNATES = [
  "https://dart.sylveoncompany.pl",
  "https://n01darts.pl",
  "https://darts.pl",
] as const;

export const SITE_PUBLIC_HOSTS = [
  { href: "https://dart.sylveoncompany.pl", label: "dart.sylveoncompany.pl" },
  { href: "https://n01darts.pl", label: "n01darts.pl" },
] as const;

export const SYLVEON_URL = "https://sylveoncompany.pl";
export const SYLVEON_DART_SECTION = `${SYLVEON_URL}/#dart`;

export const SITE_NAME = "Sylveon Dart Profile";
export const SITE_NAME_SHORT = "Dart Profile";
export const SITE_BRAND = "Sylveon";

export const DEFAULT_OG_IMAGE = "/og-dart-profile.png";

/** Footer SEO copy — crawlable prose; users rarely read this. */
export const SITE_FOOTER_SEO = [
  {
    title: "Kiedy grasz najlepiej",
    body:
      "Sylveon Dart Profile pokazuje statystyki gracza darta w czasie: średnią 3 dart, first 9, checkouty i historię formy. Serwis analizuje też, o której godzinie masz najlepszą średnią oraz w który dzień tygodnia grasz najpewniej — dzięki temu widzisz nie tylko wynik meczu, ale wzorce swojej gry w 501.",
  },
  {
    title: "Import z N01, H2H i profil online",
    body:
      "Użytkownicy dobrowolnie importują mecze z n01darts.com i budują jeden profil gracza darta online zamiast ręcznego Excela. Sylveon Dart Profile zbiera wyniki z turniejów i lig, pokazuje head-to-head z tym samym przeciwnikiem oraz pozwala udostępnić statystyki jednym linkiem.",
  },
] as const;

/** Footer disclaimer — independent analytics tool, not N01 / Nakka. */
export const SITE_AFFILIATION_DISCLAIMER =
  "Sylveon Dart Profile (n01darts.pl lub dart.sylveoncompany.pl) to serwis do statystyk i w żaden sposób nie jesteśmy powiązani z operatorem platformy n01darts.com / Nakka. Użytkownicy dobrowolnie importują mecze z n01darts.com i korzystają z nich jako źródła danych. Serwis buduje profil gracza darta: pokazuje średnie, historię formy, najlepsze rzuty i wyniki w czytelnych wykresach, dzięki czemu zawodnicy nie muszą już prowadzić własnego Excela z wynikami ani ręcznie przepisywać danych meczowych.";
