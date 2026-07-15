import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import {
  AUTH_NEXT_COOKIE,
  AUTH_ORIGIN_COOKIE,
} from "@/lib/auth-redirect-cookies";

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

/** Where to send user after OAuth — never force localhost when they used LAN IP. */
export async function resolvePostAuthOrigin(request: Request): Promise<string> {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host && !host.startsWith("0.0.0.0")) {
    const fromHost = `${url.protocol}//${host}`;
    const fixed = fixBrokenHost(fromHost);
    if (fixed) {
      const hostname = new URL(fixed).hostname;
      if (hostname.startsWith("192.168.") || hostname.startsWith("10.")) {
        return fixed;
      }
    }
  }

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(AUTH_ORIGIN_COOKIE)?.value;
  if (fromCookie) {
    const fixed = fixBrokenHost(decodeURIComponent(fromCookie));
    if (fixed) return fixed;
  }

  const fixedRequest = fixBrokenHost(url.origin);
  if (fixedRequest) return fixedRequest;

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return fromEnv ?? "http://localhost:3000";
}

export async function resolvePostAuthNext(
  request: Request,
  fallback = "/profile",
): Promise<string> {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("next");
  if (fromQuery?.startsWith("/")) return fromQuery;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(AUTH_NEXT_COOKIE)?.value;
  if (fromCookie) {
    const decoded = decodeURIComponent(fromCookie);
    if (decoded.startsWith("/")) return decoded;
  }

  return fallback;
}

function clearCookieHeader(name: string): string {
  return `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function appendAuthCookieClear(response: NextResponse): void {
  response.headers.append("Set-Cookie", clearCookieHeader(AUTH_ORIGIN_COOKIE));
  response.headers.append("Set-Cookie", clearCookieHeader(AUTH_NEXT_COOKIE));
}
