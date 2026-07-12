/** Primary public URL — set NEXT_PUBLIC_SITE_URL in Vercel per deployment. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return "https://dart.sylveoncompany.pl";
}

/** Alternate domains — same app, pick canonical via NEXT_PUBLIC_SITE_URL. */
export const SITE_ALTERNATES = [
  "https://dart.sylveoncompany.pl",
  "https://darts.pl",
] as const;

export const SYLVEON_URL = "https://sylveoncompany.pl";
export const SYLVEON_DART_SECTION = `${SYLVEON_URL}/#dart`;

export const SITE_NAME = "Dart Profile Tracker";
export const SITE_NAME_SHORT = "Dart Profile";

export const DEFAULT_OG_IMAGE = "/og-dart-profile.png";
