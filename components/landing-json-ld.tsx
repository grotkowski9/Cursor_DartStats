import { getSiteUrl, SITE_META_DESCRIPTION, SITE_NAME, SYLVEON_URL } from "@/lib/site-config";

export function LandingJsonLd() {
  const url = getSiteUrl();

  const webApp = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url,
    applicationCategory: "SportsApplication",
    operatingSystem: "Web",
    description: SITE_META_DESCRIPTION,
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
