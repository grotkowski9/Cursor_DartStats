import { getSiteUrl, SITE_NAME, SYLVEON_URL } from "@/lib/site-config";

export function LandingJsonLd() {
  const url = getSiteUrl();

  const webApp = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url,
    applicationCategory: "SportsApplication",
    operatingSystem: "Web",
    description:
      "Twój profil gracza darta: średnie, checkouty i H2H z meczów N01. Chcesz wiedzieć o której godzinie masz najlepszą formę? Wiele statystyk pod ręką. Bez excela.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "PLN",
    },
    author: {
      "@type": "Organization",
      name: "Sylveon Company",
      url: SYLVEON_URL,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(webApp) }}
    />
  );
}
