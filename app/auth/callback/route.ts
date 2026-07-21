import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import {
  appendAuthCookieClear,
  resolvePostAuthNext,
  resolvePostAuthOrigin,
} from "@/lib/auth-redirect-server";
import { ensureCustomerForUser } from "@/lib/auth";
import { needsAboutOnboarding, needsOnboarding } from "@/lib/customer";

export const dynamic = "force-dynamic";

type CookieEntry = { name: string; value: string; options?: Record<string, unknown> };

export async function GET(request: NextRequest) {
  const origin = await resolvePostAuthOrigin(request);
  const next = await resolvePostAuthNext(request);
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError || !code) {
    const r = NextResponse.redirect(`${origin}/login?error=auth`);
    appendAuthCookieClear(r);
    return r;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    const r = NextResponse.redirect(`${origin}/login?error=auth`);
    appendAuthCookieClear(r);
    return r;
  }

  // Collect cookies set during session exchange — applied to final redirect below.
  const pendingCookies: CookieEntry[] = [];

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const r = NextResponse.redirect(`${origin}/login?error=auth`);
    appendAuthCookieClear(r);
    return r;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dest = next;
  if (user) {
    try {
      const customer = await ensureCustomerForUser(user);
      if (needsOnboarding(customer)) dest = "/onboarding";
      else if (needsAboutOnboarding(customer)) dest = "/onboarding/about";
    } catch {
      // non-fatal — still redirect to profile
    }
  }

  const finalResponse = NextResponse.redirect(`${origin}${dest}`);

  // Apply session cookies to the redirect so the browser stores them.
  pendingCookies.forEach(({ name, value, options }) => {
    finalResponse.cookies.set(name, value, options ?? {});
  });

  appendAuthCookieClear(finalResponse);
  return finalResponse;
}
