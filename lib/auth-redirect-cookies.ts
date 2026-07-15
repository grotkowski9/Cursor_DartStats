export const AUTH_ORIGIN_COOKIE = "dpt_auth_origin";
export const AUTH_NEXT_COOKIE = "dpt_auth_next";
export const AUTH_COOKIE_MAX_AGE_SEC = 600;

/** Before OAuth — remember phone/Mac origin (Supabase redirect must match allow list). */
export function setAuthRedirectCookies(origin: string, next: string): void {
  const maxAge = AUTH_COOKIE_MAX_AGE_SEC;
  const base = `path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `${AUTH_ORIGIN_COOKIE}=${encodeURIComponent(origin)}; ${base}`;
  document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; ${base}`;
}

export function clearAuthRedirectCookies(): void {
  const expired = "path=/; max-age=0; SameSite=Lax";
  document.cookie = `${AUTH_ORIGIN_COOKIE}=; ${expired}`;
  document.cookie = `${AUTH_NEXT_COOKIE}=; ${expired}`;
}
