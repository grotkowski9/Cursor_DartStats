import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { applySecurityHeaders } from "@/lib/security-headers";

const NOINDEX_PREFIXES = ["/profile", "/onboarding", "/m/", "/api/", "/auth/"];

function finalize(response: NextResponse, pathname: string): NextResponse {
  const isPrivate = NOINDEX_PREFIXES.some(
    (p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p),
  );
  if (isPrivate) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return applySecurityHeaders(response);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return finalize(supabaseResponse, pathname);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const isAuthApi =
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/");
  const isProtectedPage =
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/");

  if ((isProtectedPage || isAuthApi) && !user) {
    if (pathname.startsWith("/api/")) {
      return finalize(
        NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 }),
        pathname,
      );
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return finalize(NextResponse.redirect(loginUrl), pathname);
  }

  if (pathname === "/login" && user) {
    const next = request.nextUrl.searchParams.get("next") || "/profile";
    const dest = request.nextUrl.clone();
    dest.pathname = next.startsWith("/") ? next : "/profile";
    dest.search = "";
    return finalize(NextResponse.redirect(dest), pathname);
  }

  return finalize(supabaseResponse, pathname);
}
