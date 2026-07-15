import type { MetadataRoute } from "next";
import { getDemoSitemapPaths } from "@/lib/demo";
import { getSiteUrl } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/demo/", "/login"],
        disallow: ["/profile", "/onboarding", "/m/", "/api/", "/admin", "/auth/"],
      },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
