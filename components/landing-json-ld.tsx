import { DEMO_PERSONA } from "@/demo/demo-persona";
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

  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sylveon Company",
    url: SYLVEON_URL,
    sameAs: [SYLVEON_URL],
    description: "Doradztwo iGaming, CRM, e-commerce oraz dart & event management.",
  };

  const demoPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Profil demo — ${DEMO_PERSONA.firstName} ${DEMO_PERSONA.lastName}`,
    url: `${url}/demo/profile`,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(demoPage) }}
      />
    </>
  );
}
