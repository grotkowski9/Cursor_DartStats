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
      "Panel statystyk darta — import meczów z N01, profil gracza, wykres formy, H2H i checkout.",
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
