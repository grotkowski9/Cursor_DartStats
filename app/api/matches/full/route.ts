import { NextResponse } from "next/server";
import { requireAuthCustomerApi } from "@/lib/auth";
import { getMyMatches } from "@/lib/matches";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuthCustomerApi();
  if (!auth.ok) return auth.response;

  try {
    const matches = await getMyMatches(auth.customer.customerId);
    return NextResponse.json({ matches });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Błąd pobierania meczów";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
