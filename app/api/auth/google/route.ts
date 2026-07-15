import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getRequestOrigin } from "@/lib/request-origin";
import {
  AUTH_NEXT_COOKIE,
  AUTH_ORIGIN_COOKIE,
  AUTH_COOKIE_MAX_AGE_SEC,
} from "@/lib/auth-redirect-cookies";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const nextParam = request.nextUrl.searchParams.get("next");
  const next = nextParam?.startsWith("/") ? nextParam : "/profile";
  const redirectTo = `${origin}/auth/callback`;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  let response = NextResponse.redirect(`${origin}/login?error=auth`);

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error || !data.url) {
    return response;
  }

  const oauthRedirect = NextResponse.redirect(data.url);
  response.cookies.getAll().forEach((cookie) => {
    oauthRedirect.cookies.set(cookie.name, cookie.value);
  });

  const maxAge = AUTH_COOKIE_MAX_AGE_SEC;
  oauthRedirect.cookies.set(AUTH_ORIGIN_COOKIE, encodeURIComponent(origin), {
    path: "/",
    maxAge,
    sameSite: "lax",
  });
  oauthRedirect.cookies.set(AUTH_NEXT_COOKIE, encodeURIComponent(next), {
    path: "/",
    maxAge,
    sameSite: "lax",
  });

  return oauthRedirect;
}
