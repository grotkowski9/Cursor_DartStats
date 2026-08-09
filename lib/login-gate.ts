import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const LOGIN_GATE_COOKIE = "sdp_login_gate";
export const LOGIN_GATE_SETTING_KEY = "login_gate_enabled";
/** Unlock cookie TTL — 30 days. */
export const LOGIN_GATE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

function loginGatePassword(): string {
  return (process.env.LOGIN_GATE_PASSWORD ?? "").trim();
}

/** True when Supabase app_settings.login_gate_enabled is "true". Fail-open on DB errors. */
export async function isLoginGateEnabled(): Promise<boolean> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", LOGIN_GATE_SETTING_KEY)
      .maybeSingle();

    if (error) {
      console.error("[login-gate] settings read failed", error.message);
      return false;
    }
    return (data?.value ?? "").trim().toLowerCase() === "true";
  } catch (err) {
    console.error("[login-gate] settings unavailable", err);
    return false;
  }
}

export function verifyLoginGatePassword(input: string): boolean {
  const expected = loginGatePassword();
  if (!expected) return false;
  const a = Buffer.from(input.normalize("NFKC"));
  const b = Buffer.from(expected.normalize("NFKC"));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function signUnlockPayload(expMs: number, secret: string): string {
  return createHmac("sha256", secret).update(String(expMs)).digest("hex");
}

export function createLoginGateUnlockValue(): string | null {
  const secret = loginGatePassword();
  if (!secret) return null;
  const expMs = Date.now() + LOGIN_GATE_COOKIE_MAX_AGE_SEC * 1000;
  const sig = signUnlockPayload(expMs, secret);
  return `${expMs}.${sig}`;
}

export function isValidLoginGateUnlockValue(raw: string | undefined): boolean {
  if (!raw) return false;
  const secret = loginGatePassword();
  if (!secret) return false;
  const [expStr, sig] = raw.split(".");
  if (!expStr || !sig) return false;
  const expMs = Number(expStr);
  if (!Number.isFinite(expMs) || Date.now() > expMs) return false;
  const expected = signUnlockPayload(expMs, secret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function hasLoginGateUnlock(): Promise<boolean> {
  const jar = await cookies();
  return isValidLoginGateUnlockValue(jar.get(LOGIN_GATE_COOKIE)?.value);
}

/** Gate blocks the Google UI only when enabled in DB and no valid unlock cookie. */
export async function shouldShowLoginGate(): Promise<boolean> {
  if (!(await isLoginGateEnabled())) return false;
  if (await hasLoginGateUnlock()) return false;
  return true;
}

export function loginGateCookieOptions(maxAge = LOGIN_GATE_COOKIE_MAX_AGE_SEC) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
