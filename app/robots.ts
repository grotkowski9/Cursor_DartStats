import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/demo/", "/login", "/privacy"],
        disallow: ["/profile", "/onboarding", "/m/", "/api/", "/admin", "/auth/", "/logintest"],
      },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
