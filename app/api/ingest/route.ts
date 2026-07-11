import { NextResponse } from "next/server";
import { ingestAndSave } from "@/lib/matches";

export const dynamic = "force-dynamic";

type IngestBody = {
  url?: string;
  overwrite?: boolean;
  playerIndex?: 0 | 1;
  action?: "save" | "reject";
};

export async function POST(request: Request) {
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
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import nieudany";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
