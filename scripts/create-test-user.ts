/**
 * Tworzy / resetuje testowe konto Auth z hasłem (bez Google).
 *
 * Wymaga `.env.local` + w Supabase: Authentication → Providers → **Email = ON**
 * (Confirm email może być wyłączone — skrypt ustawia email_confirm: true).
 *
 * Usage:
 *   npm run auth:test-user -- test@example.com --name "Anna Nowak"
 *   npm run auth:test-user -- test@example.com --password "MojeHaslo1!"
 *   npm run auth:test-user -- test@example.com --reset-password   # tylko nowe hasło
 *
 * Potem na /login: e-mail + hasło.
 * Nie używaj OWNER_EMAIL — podepniesz seed Piotra.
 */
import { config } from "dotenv";
import { randomBytes } from "crypto";

config({ path: ".env.local" });

import { createSupabaseAdminClient } from "../lib/supabase/admin";

function usage(): never {
  console.error(`Usage:
  npm run auth:test-user -- <email> [--name "Imię Nazwisko"] [--password "Haslo1!"] [--reset-password]

Nie używaj OWNER_EMAIL (seed Piotra).
W Supabase włącz Provider: Email.`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let name: string | undefined;
  let password: string | undefined;
  let resetPassword = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--name") {
      const parts: string[] = [];
      while (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
        parts.push(argv[++i]);
      }
      name = parts.join(" ") || undefined;
      continue;
    }
    if (a === "--password") {
      password = argv[++i];
      continue;
    }
    if (a === "--reset-password") {
      resetPassword = true;
      continue;
    }
    if (a === "--help" || a === "-h") usage();
    if (a.startsWith("-")) usage();
    positional.push(a);
  }

  const email = positional[0]?.trim().toLowerCase();
  if (!email || !email.includes("@")) usage();

  return { email, name, password, resetPassword };
}

function splitName(full: string | undefined): {
  firstName: string;
  lastName: string;
  fullName: string;
} {
  const parts = (full ?? "Test User").trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Test";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "User";
  return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

function defaultPassword(): string {
  return `TestDarts-${randomBytes(3).toString("hex")}!`;
}

async function findUserIdByEmail(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  email: string,
): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  const { email, name, password: passwordArg, resetPassword } = parseArgs(
    process.argv.slice(2),
  );
  const owner = (process.env.OWNER_EMAIL ?? process.env.AUTH_LINK_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (owner.includes(email)) {
    console.error(
      `✗ ${email} jest w OWNER_EMAIL — to podepnie seed Piotra. Użyj innego maila.`,
    );
    process.exit(1);
  }

  const password = passwordArg?.trim() || defaultPassword();
  if (password.length < 8) {
    console.error("✗ Hasło min. 8 znaków.");
    process.exit(1);
  }

  const { firstName, lastName, fullName } = splitName(name);
  const admin = createSupabaseAdminClient();
  let userId = await findUserIdByEmail(admin, email);

  if (userId && (resetPassword || passwordArg)) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`updateUser password: ${error.message}`);
    console.log(`✓ Zresetowano hasło dla: ${email} (${userId})`);
  } else if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        name: fullName,
        given_name: firstName,
        family_name: lastName,
      },
    });
    if (error) throw new Error(`updateUser: ${error.message}`);
    console.log(`○ User już istniał — ustawiono nowe hasło: ${email} (${userId})`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        name: fullName,
        given_name: firstName,
        family_name: lastName,
      },
    });
    if (error) throw new Error(`createUser: ${error.message}`);
    userId = data.user.id;
    console.log(`✓ Utworzono usera: ${email} (${userId})`);
    console.log(`  metadata: ${fullName}`);
  }

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";

  console.log(`
────────────────────────────────────────
Zaloguj na:  ${site}/login

E-mail:  ${email}
Hasło:   ${password}

1) Supabase → Authentication → Providers → Email = ON
2) Otwórz /login → wpisz e-mail i hasło
3) Nowe konto → /onboarding

Reset hasła później:
  npm run auth:test-user -- ${email} --reset-password
────────────────────────────────────────
`);
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("✗", msg);
  if (msg.includes("fetch failed") || msg.includes("ENOTFOUND")) {
    console.error(
      "  Sprawdź NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY w .env.local",
    );
  }
  if (msg.toLowerCase().includes("email") && msg.toLowerCase().includes("provider")) {
    console.error("  Włącz Email provider w Supabase Dashboard.");
  }
  process.exit(1);
});
