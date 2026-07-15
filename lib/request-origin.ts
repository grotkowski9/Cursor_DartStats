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

/** Origin from incoming HTTP request — works for iPhone → Mac LAN IP. */
export function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host && !host.startsWith("0.0.0.0")) {
    const fixed = fixBrokenHost(`${url.protocol}//${host}`);
    if (fixed) return fixed;
  }
  const fixed = fixBrokenHost(url.origin);
  if (fixed) return fixed;
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}
