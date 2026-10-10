import { NextResponse } from "next/server";
import { requireIngestCustomer } from "@/lib/sources/ingest-auth";
import { previewImportUrls } from "@/lib/sources/preview";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireIngestCustomer(request, { limit: 12 });
  if (!auth.ok) return auth.response;

  let body: { urls?: string[]; url?: string };
  try {
    body = (await request.json()) as { urls?: string[]; url?: string };
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy JSON" }, { status: 400 });
  }

  const urls = [
    ...(body.urls ?? []),
    ...(body.url ? [body.url] : []),
  ]
    .map((u) => u.trim())
    .filter(Boolean);

  if (!urls.length) {
    return NextResponse.json({ error: "Podaj przynajmniej jeden URL" }, { status: 400 });
  }

  try {
    const preview = await previewImportUrls(urls, auth.customer);
    return NextResponse.json(preview);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Preview nieudany" },
      { status: 422 },
    );
  }
}
