import { getSiteUrl } from "@/lib/site-config";

/** Pełny URL do udostępnienia meczu (zawsze /m/{token} lub /demo/m/{token}). */
export function getMatchShareUrl(shareToken: string, matchPathPrefix = "/m/"): string {
  const path = `${matchPathPrefix}${shareToken}`.replace(/([^:]\/)\/+/g, "$1");
  const base =
    typeof window !== "undefined" ? window.location.origin : getSiteUrl();
  return new URL(path, base).href;
}
