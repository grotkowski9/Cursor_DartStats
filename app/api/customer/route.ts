import { NextResponse } from "next/server";
import { requireAuthCustomerApi } from "@/lib/auth";
import { needsOnboarding, updateCustomerProfile } from "@/lib/customer";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuthCustomerApi();
  if (!auth.ok) return auth.response;
  return NextResponse.json({
    customer: auth.customer,
    needsOnboarding: needsOnboarding(auth.customer),
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthCustomerApi();
  if (!auth.ok) return auth.response;

  let body: {
    firstName?: string;
    lastName?: string;
    nickname?: string | null;
    knownNicknames?: string[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy JSON" }, { status: 400 });
  }

  const nicknames = (body.knownNicknames ?? [])
    .map((n) => n.trim())
    .filter(Boolean);
  if (nicknames.length === 0) {
    return NextResponse.json(
      { error: "Podaj co najmniej jeden wzorzec N01 (np. nazwisko)." },
      { status: 400 },
    );
  }
  if (!body.firstName?.trim() || !body.lastName?.trim()) {
    return NextResponse.json({ error: "Podaj imię i nazwisko." }, { status: 400 });
  }

  try {
    const customer = await updateCustomerProfile(auth.customer.customerId, {
      firstName: body.firstName,
      lastName: body.lastName,
      nickname: body.nickname,
      knownNicknames: nicknames,
    });
    return NextResponse.json({ customer });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
