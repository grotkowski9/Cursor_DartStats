import { NextResponse } from "next/server";
import { requireIngestCustomer } from "@/lib/sources/ingest-auth";
import { expandGroupWithParticipant } from "@/lib/sources/preview";
import type { PreviewGroup } from "@/lib/sources/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireIngestCustomer(request, { limit: 20 });
  if (!auth.ok) return auth.response;

  let body: { group?: PreviewGroup; participantId?: string };
  try {
    body = (await request.json()) as { group?: PreviewGroup; participantId?: string };
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy JSON" }, { status: 400 });
  }

  if (!body.group || !body.participantId?.trim()) {
    return NextResponse.json({ error: "Wybierz zawodnika" }, { status: 400 });
  }

  try {
    const group = await expandGroupWithParticipant({
      group: body.group,
      participantId: body.participantId.trim(),
      customerId: auth.customer.customerId,
    });
    return NextResponse.json({ group });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Nie udało się przypisać zawodnika" },
      { status: 422 },
    );
  }
}
