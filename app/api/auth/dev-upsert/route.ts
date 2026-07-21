import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function allowed(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_DEV_TEST_LOGIN === "true"
  );
}

async function findUserIdByEmail(
  email: string,
): Promise<string | null> {
  const admin = getSupabaseAdmin();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

/**
 * Dev-only: utwórz / zresetuj konto e-mail+hasło i skasuj customer,
 * żeby każde logowanie z formularza dawało świeży onboarding.
 */
export async function POST(request: Request) {
  if (!allowed()) {
    return NextResponse.json({ error: "Niedostępne" }, { status: 403 });
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!email.includes("@") || password.length < 6) {
    return NextResponse.json(
      { error: "Podaj e-mail i hasło (min. 6 znaków)." },
      { status: 400 },
    );
  }

  const owner = (process.env.OWNER_EMAIL ?? process.env.AUTH_LINK_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (owner.includes(email)) {
    return NextResponse.json(
      { error: "Nie używaj OWNER_EMAIL — to konto seed Piotra." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const meta = {
    full_name: "Test User",
    name: "Test User",
    given_name: "Test",
    family_name: "User",
  };

  let userId = await findUserIdByEmail(email);
  let created = false;

  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: meta,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: meta,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    userId = data.user.id;
    created = true;
  }

  // Świeży customer przy każdym logowaniu testowym
  const { error: delError } = await admin
    .from("customers")
    .delete()
    .eq("auth_user_id", userId);
  if (delError) {
    return NextResponse.json(
      { error: `Nie udało się zresetować profilu: ${delError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    created,
    resetProfile: true,
    email,
  });
}
