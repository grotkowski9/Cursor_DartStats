import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const NOINDEX_PREFIXES = ["/profile", "/onboarding", "/m/", "/api/"];

function applyNoindex(response: NextResponse, pathname: string) {
  const isPrivate = NOINDEX_PREFIXES.some(
    (p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p),
  );
  if (isPrivate) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return applyNoindex(supabaseResponse, request.nextUrl.pathname);
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
  const pathname = request.nextUrl.pathname;

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
      return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && user) {
    const next = request.nextUrl.searchParams.get("next") || "/profile";
    const dest = request.nextUrl.clone();
    dest.pathname = next.startsWith("/") ? next : "/profile";
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  if (pathname === "/auth/callback") {
    return applyNoindex(supabaseResponse, pathname);
  }

  return applyNoindex(supabaseResponse, pathname);
}
