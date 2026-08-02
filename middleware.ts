import { NextResponse, type NextRequest } from "next/server";
import { applySecurityHeaders } from "@/lib/security-headers";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Jeśli Supabase wróci z ?code= na główną stronę — przekieruj do /auth/callback
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/" && searchParams.has("code")) {
    const dest = request.nextUrl.clone();
    dest.pathname = "/auth/callback";
    return applySecurityHeaders(NextResponse.redirect(dest));
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/profile",
    "/profile/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/login",
    "/logintest",
    "/auth/callback",
    "/m/:path*",
    "/api/:path*",
  ],
};
