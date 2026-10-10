import { NextResponse } from "next/server";
import { requireIngestCustomer } from "@/lib/sources/ingest-auth";
import { commitImportItems, type CommitItem } from "@/lib/sources/commit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireIngestCustomer(request, { limit: 8 });
  if (!auth.ok) return auth.response;

  let body: { items?: CommitItem[] };
  try {
    body = (await request.json()) as { items?: CommitItem[] };
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy JSON" }, { status: 400 });
  }

  const items = (body.items ?? []).filter((i) => i?.externalId && i.fetchRef);
  if (!items.length) {
    return NextResponse.json({ error: "Brak meczów do zapisu" }, { status: 400 });
  }
  if (items.length > 80) {
    return NextResponse.json({ error: "Za dużo meczów w jednym imporcie (max 80)" }, { status: 400 });
  }

  try {
    const result = await commitImportItems({
      customerId: auth.customer.customerId,
      items,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import nieudany" },
      { status: 422 },
    );
  }
}
