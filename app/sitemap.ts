import type { MetadataRoute } from "next";
import { getPublicSitemapPaths } from "@/lib/sitemap-paths";
import { getSiteUrl } from "@/lib/site-config";

function sitemapPriority(path: string): number {
  if (path === "/") return 1;
  if (path === "/demo/profile") return 0.9;
  if (path.startsWith("/demo/m/")) return 0.7;
  if (path === "/privacy") return 0.6;
  if (path === "/login") return 0.5;
  return 0.5;
}

function sitemapChangeFrequency(
  path: string,
): MetadataRoute.Sitemap[number]["changeFrequency"] {
  if (path === "/") return "weekly";
  if (path.startsWith("/demo/m/")) return "monthly";
  return "weekly";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  return getPublicSitemapPaths().map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: sitemapChangeFrequency(path),
    priority: sitemapPriority(path),
  }));
}
