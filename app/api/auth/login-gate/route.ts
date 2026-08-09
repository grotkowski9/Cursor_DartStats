import { NextResponse } from "next/server";
import {
  createLoginGateUnlockValue,
  isLoginGateEnabled,
  loginGateCookieOptions,
  LOGIN_GATE_COOKIE,
  verifyLoginGatePassword,
} from "@/lib/login-gate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isLoginGateEnabled())) {
    return NextResponse.json({ ok: true, open: true });
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe żądanie." }, { status: 400 });
  }

  if (!verifyLoginGatePassword(password)) {
    return NextResponse.json({ error: "Nieprawidłowe hasło." }, { status: 401 });
  }

  const unlock = createLoginGateUnlockValue();
  if (!unlock) {
    return NextResponse.json(
      { error: "Brama włączona, ale brak LOGIN_GATE_PASSWORD na serwerze." },
      { status: 503 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(LOGIN_GATE_COOKIE, unlock, loginGateCookieOptions());
  return res;
}
