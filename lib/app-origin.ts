function fixBrokenHost(origin: string): string | null {
  try {
    const u = new URL(origin);
    if (u.hostname === "0.0.0.0" || u.hostname === "[::]") {
      return `http://localhost:${u.port || "3000"}`;
    }
    return u.origin;
  } catch {
    return null;
  }
}

/** LAN / local dev hosts (iPhone → Mac IP, localhost, etc.) */
function isLanOrLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.")
  );
}

/**
 * Base URL for auth redirects — never 0.0.0.0 (Safari blocks it).
 * Prefer the host the user actually used (e.g. 192.168.x on iPhone), not env localhost.
 */
export function getAppOrigin(requestOrigin?: string): string {
  if (requestOrigin) {
    const fixed = fixBrokenHost(requestOrigin);
    if (fixed) {
      const hostname = new URL(fixed).hostname;
      if (isLanOrLocalHost(hostname)) return fixed;
      return fixed;
    }
  }

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  return "http://localhost:3000";
}

/** Client-side: OAuth must return to the same host the user opened (phone IP, not localhost). */
export function getBrowserAppOrigin(): string {
  if (typeof window === "undefined") return getAppOrigin();
  const { origin, hostname } = window.location;
  if (hostname === "0.0.0.0") {
    return (
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000"
    );
  }
  return origin;
}
