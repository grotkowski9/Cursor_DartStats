import type { MetadataRoute } from "next";
import { getDemoSitemapPaths } from "@/lib/demo";
import { getSiteUrl } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  return getDemoSitemapPaths().map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : path.startsWith("/demo/m/") ? "monthly" : "weekly",
    priority: path === "/" ? 1 : path === "/demo/profile" ? 0.9 : path === "/login" ? 0.5 : 0.7,
  }));
}
