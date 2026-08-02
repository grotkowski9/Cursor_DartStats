import { NextResponse } from "next/server";
import { requireAuthCustomerApi } from "@/lib/auth";
import { toClientMatch } from "@/lib/match-client";
import { deleteMatch, updateMatchEdit } from "@/lib/matches";

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

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireAuthCustomerApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy JSON" }, { status: 400 });
  }

  const raw = body as {
    playerIndex?: unknown;
    playerNames?: Partial<Record<"0" | "1", unknown>>;
  };

  const patch: {
    playerIndex?: 0 | 1;
    playerNames?: { 0?: string; 1?: string };
  } = {};

  if (raw.playerIndex === 0 || raw.playerIndex === 1) {
    patch.playerIndex = raw.playerIndex;
  } else if (raw.playerIndex !== undefined) {
    return NextResponse.json({ error: "Nieprawidłowy playerIndex" }, { status: 400 });
  }

  const n0 = raw.playerNames?.["0"];
  const n1 = raw.playerNames?.["1"];
  if (n0 !== undefined || n1 !== undefined) {
    patch.playerNames = {};
    if (typeof n0 === "string") patch.playerNames[0] = n0;
    else if (n0 !== undefined) {
      return NextResponse.json({ error: "Nieprawidłowa nazwa gracza 0" }, { status: 400 });
    }
    if (typeof n1 === "string") patch.playerNames[1] = n1;
    else if (n1 !== undefined) {
      return NextResponse.json({ error: "Nieprawidłowa nazwa gracza 1" }, { status: 400 });
    }
  }

  try {
    const result = await updateMatchEdit(id, auth.customer.customerId, patch);
    if (!result.ok) {
      if (result.reason === "invalid_id" || result.reason === "invalid_patch") {
        return NextResponse.json({ error: "Nieprawidłowe dane edycji" }, { status: 400 });
      }
      if (result.reason === "forbidden") {
        return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
      }
      return NextResponse.json({ error: "Mecz nie istnieje" }, { status: 404 });
    }
    return NextResponse.json({ match: toClientMatch(result.match) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Błąd edycji meczu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
