import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/app-origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const origin = getAppOrigin(new URL(request.url).origin);
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}

export async function GET(request: Request) {
  return POST(request);
}
