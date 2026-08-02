import { NextResponse } from "next/server";
import { requireAuthCustomerApi } from "@/lib/auth";
import { needsOnboarding } from "@/lib/customer";
import { ingestAndSave } from "@/lib/matches";
import { toClientMatch } from "@/lib/match-client";
import { checkN01MatchUrl, N01_ONLY_MESSAGE } from "@/lib/n01-url";
import { rateLimit } from "@/lib/rate-limit";
import type { N01Match } from "@/lib/n01-parser";

export const dynamic = "force-dynamic";

type IngestBody = {
  url?: string;
  overwrite?: boolean;
  playerIndex?: 0 | 1;
  action?: "save" | "reject";
};

export async function POST(request: Request) {
  const auth = await requireAuthCustomerApi();
  if (!auth.ok) return auth.response;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rlUser = rateLimit(`ingest:user:${auth.customer.customerId}`, {
    limit: 20,
    windowMs: 60_000,
  });
  const rlIp = rateLimit(`ingest:ip:${ip}`, { limit: 40, windowMs: 60_000 });
  if (!rlUser.ok || !rlIp.ok) {
    const retry = Math.max(rlUser.retryAfterSec, rlIp.retryAfterSec);
    return NextResponse.json(
      { error: "Za dużo importów — spróbuj za chwilę." },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  if (needsOnboarding(auth.customer)) {
    return NextResponse.json(
      {
        error: "Uzupełnij profil przed importem meczów.",
        code: "needs_onboarding",
        redirect: "/onboarding",
      },
      { status: 403 },
    );
  }

  let body: IngestBody;
  try {
    body = (await request.json()) as IngestBody;
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy JSON" }, { status: 400 });
  }

  if (body.action === "reject") {
    return NextResponse.json({ status: "rejected" });
  }

  if (!body.url?.trim()) {
    return NextResponse.json({ error: "Podaj URL meczu z n01darts.com" }, { status: 400 });
  }

  const urlCheck = checkN01MatchUrl(body.url);
  if (!urlCheck.ok) {
    return NextResponse.json(
      {
        error:
          urlCheck.kind === "empty"
            ? "Podaj URL meczu z n01darts.com"
            : N01_ONLY_MESSAGE,
      },
      { status: 400 },
    );
  }

  try {
    const result = await ingestAndSave({
      url: urlCheck.url,
      overwrite: body.overwrite,
      playerIndex: body.playerIndex,
      action: body.action,
      customerId: auth.customer.customerId,
    });
    if (result.status === "saved") {
      return NextResponse.json({
        ...result,
        match: toClientMatch(result.match as N01Match),
      });
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import nieudany";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
