import { NextResponse } from "next/server";
import { getMyMatches } from "@/lib/matches";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const matches = await getMyMatches();
    return NextResponse.json({ matches });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Błąd pobierania meczów";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
