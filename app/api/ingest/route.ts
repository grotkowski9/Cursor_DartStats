import { NextResponse } from "next/server";
import { requireAuthCustomerApi } from "@/lib/auth";
import { needsOnboarding } from "@/lib/customer";
import { ingestAndSave } from "@/lib/matches";

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

  try {
    const result = await ingestAndSave({
      url: body.url.trim(),
      overwrite: body.overwrite,
      playerIndex: body.playerIndex,
      action: body.action,
      customerId: auth.customer.customerId,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import nieudany";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
