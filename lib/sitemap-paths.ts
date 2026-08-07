import { getDemoShareTokens } from "@/lib/demo";

/** Canonical public paths for sitemap (excludes rewrite aliases like /polityka-prywatnosci). */
export const STATIC_PUBLIC_SITEMAP_PATHS = [
  "/",
  "/login",
  "/privacy",
  "/demo/profile",
] as const;

export function getPublicSitemapPaths(): string[] {
  const paths: string[] = [...STATIC_PUBLIC_SITEMAP_PATHS];
  for (const token of getDemoShareTokens()) {
    paths.push(`/demo/m/${token}`);
  }
  return paths;
}
