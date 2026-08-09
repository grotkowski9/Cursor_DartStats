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
    title: "Średnia, checkouty i najlepsze rzuty",
    body:
      "Sylveon Dart Profile pokazuje najważniejsze statystyki darta z meczów 501: średnią 3 lotek, skuteczność checkoutów, najwyższy checkout oraz liczbę wyników 100+, 140+ i 180. Możesz analizować scoring, skuteczność końcówek i regularność gry na podstawie całej historii swoich spotkań, a nie pojedynczego wyniku. Profil pozwala sprawdzić, jak zmienia się Twoja średnia w darcie, jak często rzucasz wysokie wyniki oraz które checkouty zamykasz najskuteczniej. Dzięki temu w jednym miejscu widzisz zarówno statystyki punktowe, jak i efektywność kończenia legów, co ułatwia ocenę aktualnej formy i postępów w grze.",
  },
  {
    title: "Import z N01, historia meczów i H2H",
    body:
      "Importuj swoje mecze z n01darts.com i buduj jeden profil gracza darta online. Sylveon Dart Profile zbiera statystyki z lig, turniejów i pojedynczych spotkań, tworzy historię meczów oraz pokazuje head-to-head z każdym przeciwnikiem. H2H jest szczególnie przydatne, gdy wielokrotnie spotykasz tego samego rywala — nawet na różnych turniejach i w różnych miastach. System rozpoznaje tego samego zawodnika i łączy wszystkie wspólne mecze w jedną historię, dzięki czemu możesz sprawdzić, jak radzisz sobie z konkretnym przeciwnikiem w dłuższej perspektywie. Wszystkie wyniki i statystyki darta możesz przeglądać w jednym miejscu i udostępniać za pomocą jednego linku.",
  },
  {
    title: "Forma i postępy w darcie",
    body:
      "Analizuj swoją formę na podstawie kolejnych meczów 501 i sprawdzaj, kiedy grasz najlepiej. Sylveon Dart Profile pokazuje zmiany średniej w czasie, wyniki według dnia tygodnia i godziny gry oraz trendy w Twoich statystykach. Dzięki temu możesz śledzić postępy w darcie i zobaczyć, czy poprawiasz scoring, regularność oraz skuteczność kończenia legów.",
  },
] as const;

/** Footer disclaimer — independent analytics tool, not N01 / Nakka. */
export const SITE_AFFILIATION_DISCLAIMER =
  "Sylveon Dart Profile (n01darts.pl lub dart.sylveoncompany.pl) to serwis do statystyk i w żaden sposób nie jesteśmy powiązani z operatorem platformy n01darts.com / Nakka. Użytkownicy dobrowolnie importują mecze z n01darts.com i korzystają z nich jako źródła danych. Serwis buduje profil gracza darta: pokazuje średnie, historię formy, najlepsze rzuty i wyniki w czytelnych wykresach, dzięki czemu zawodnicy nie muszą już prowadzić własnego Excela z wynikami ani ręcznie przepisywać danych meczowych.";

export const SITE_FOOTER_LEGAL = {
  title: "Informacja prawna",
  body: SITE_AFFILIATION_DISCLAIMER,
} as const;
