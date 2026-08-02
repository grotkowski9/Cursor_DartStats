/**
 * Allow only same-origin relative paths for post-auth redirects.
 * Rejects protocol-relative (`//evil.com`), backslash tricks, and absolute URLs.
 */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback = "/profile",
): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }
  try {
    const base = "https://example.invalid";
    const parsed = new URL(trimmed, base);
    if (parsed.origin !== base) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
  } catch {
    return fallback;
  }
}
