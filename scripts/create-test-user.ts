/**
 * Tworzy testowe konto Auth (bez Google) i wypisuje magic link do zalogowania.
 *
 * Wymaga `.env.local` z NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * W Supabase Dashboard → Authentication → URL Configuration dodaj Redirect URL:
 *   {SITE}/auth/callback  (np. http://localhost:3000/auth/callback)
 *
 * Usage:
 *   npm run auth:test-user -- test@example.com
 *   npm run auth:test-user -- test@example.com --name "Anna Nowak"
 *   npm run auth:test-user -- test@example.com --link-only   # tylko link, user już istnieje
 *
 * Otwórz wypisany URL w przeglądarce (ta sama maszyna co Site URL).
 * Nie używaj maila z OWNER_EMAIL — podepniesz się pod seed Piotra.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { createSupabaseAdminClient } from "../lib/supabase/admin";

function usage(): never {
  console.error(`Usage:
  npm run auth:test-user -- <email> [--name "Imię Nazwisko"] [--link-only] [--site http://localhost:3000]

Nie używaj OWNER_EMAIL (seed Piotra).`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let name: string | undefined;
  let linkOnly = false;
  let site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";

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
    if (a === "--site") {
      site = (argv[++i] ?? site).replace(/\/$/, "");
      continue;
    }
    if (a === "--link-only") {
      linkOnly = true;
      continue;
    }
    if (a === "--help" || a === "-h") usage();
    if (a.startsWith("-")) usage();
    positional.push(a);
  }

  const email = positional[0]?.trim().toLowerCase();
  if (!email || !email.includes("@")) usage();

  return { email, name, linkOnly, site };
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

async function findUserIdByEmail(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  email: string,
): Promise<string | null> {
  // listUsers is paginated — for test accounts we scan first pages
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
  const { email, name, linkOnly, site } = parseArgs(process.argv.slice(2));
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

  const redirectTo = `${site}/auth/callback`;
  const { firstName, lastName, fullName } = splitName(name);
  const admin = createSupabaseAdminClient();

  let userId = await findUserIdByEmail(admin, email);

  if (!linkOnly) {
    if (userId) {
      console.log(`○ User już istnieje: ${email} (${userId})`);
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
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
  } else if (!userId) {
    console.error(`✗ Brak usera ${email}. Uruchom bez --link-only.`);
    process.exit(1);
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (linkError) throw new Error(`generateLink: ${linkError.message}`);

  const actionLink = linkData.properties.action_link;
  if (!actionLink) throw new Error("Brak action_link w odpowiedzi Supabase");

  console.log(`
────────────────────────────────────────
Magic link (otwórz w przeglądarce):

${actionLink}

Redirect po sukcesie: ${redirectTo}
→ potem /onboarding (nowe konto) albo /profile

Uwagi:
• Redirect URL musi być na liście w Supabase Auth → URL Configuration.
• Nie odświeżaj karty w trakcie wymiany kodu.
• Link jednorazowy / wygasa — jak padnie: npm run auth:test-user -- ${email} --link-only
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
  process.exit(1);
});
