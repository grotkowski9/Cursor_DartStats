import { NextResponse } from "next/server";
import { requireAuthCustomerApi } from "@/lib/auth";
import { deleteMatch } from "@/lib/matches";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireAuthCustomerApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  try {
    const result = await deleteMatch(id, auth.customer.customerId);
    if (!result.ok) {
      if (result.reason === "invalid_id") {
        return NextResponse.json({ error: "Nieprawidłowe ID meczu" }, { status: 400 });
      }
      if (result.reason === "forbidden") {
        return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
      }
      return NextResponse.json({ error: "Mecz nie istnieje" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Błąd usuwania meczu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
