import { NextResponse } from "next/server";
import { requireAuthCustomerApi } from "@/lib/auth";
import { needsOnboarding } from "@/lib/customer";
import { rateLimit } from "@/lib/rate-limit";
import type { CustomerProfile } from "@/lib/customer";

export async function requireIngestCustomer(
  request: Request,
  opts?: { limit?: number },
): Promise<
  | { ok: true; customer: CustomerProfile }
  | { ok: false; response: NextResponse }
> {
  const auth = await requireAuthCustomerApi();
  if (!auth.ok) return auth;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limit = opts?.limit ?? 20;
  const rlUser = rateLimit(`ingest:user:${auth.customer.customerId}`, {
    limit,
    windowMs: 60_000,
  });
  const rlIp = rateLimit(`ingest:ip:${ip}`, { limit: limit * 2, windowMs: 60_000 });
  if (!rlUser.ok || !rlIp.ok) {
    const retry = Math.max(rlUser.retryAfterSec, rlIp.retryAfterSec);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Za dużo importów — spróbuj za chwilę." },
        { status: 429, headers: { "Retry-After": String(retry) } },
      ),
    };
  }

  if (needsOnboarding(auth.customer)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Uzupełnij profil przed importem meczów.",
          code: "needs_onboarding",
          redirect: "/onboarding",
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, customer: auth.customer };
}
