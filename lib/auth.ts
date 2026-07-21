import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import {
  createCustomerForUser,
  getCustomerByAuthUserId,
  linkAuthUserToCustomer,
  needsOnboarding,
  type CustomerProfile,
} from "@/lib/customer";
import { SEED_CUSTOMER_ID } from "@/lib/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthContext = {
  user: User;
  customer: CustomerProfile;
};

function ownerEmails(): string[] {
  const raw = process.env.OWNER_EMAIL ?? process.env.AUTH_LINK_EMAIL ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Prefill imię/nazwisko z metadanych Google (given/family, potem full_name/name). */
export function nameFromGoogleMetadata(meta: Record<string, unknown>): {
  firstName: string;
  lastName: string;
} {
  const given = typeof meta.given_name === "string" ? meta.given_name.trim() : "";
  const family = typeof meta.family_name === "string" ? meta.family_name.trim() : "";
  if (given || family) {
    return {
      firstName: given || "Gracz",
      lastName: family || "Dart",
    };
  }

  const fullName =
    typeof meta.full_name === "string"
      ? meta.full_name
      : typeof meta.name === "string"
        ? meta.name
        : "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "Gracz",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : "Dart",
  };
}

/** Resolve or create customer for authenticated Supabase user. */
export async function ensureCustomerForUser(user: User): Promise<CustomerProfile> {
  const existing = await getCustomerByAuthUserId(user.id);
  if (existing) return existing;

  const email = user.email?.toLowerCase();
  if (email && ownerEmails().includes(email)) {
    const linked = await linkAuthUserToCustomer(SEED_CUSTOMER_ID, user.id);
    if (linked) return linked;
  }

  const { firstName, lastName } = nameFromGoogleMetadata(
    (user.user_metadata ?? {}) as Record<string, unknown>,
  );

  return createCustomerForUser({
    authUserId: user.id,
    firstName,
    lastName,
    nickname: null,
    knownNicknames: [],
  });
}

export async function getAuthUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Server pages: require login + customer; redirect to onboarding when needed. */
export async function requireAuthCustomer(opts?: {
  allowIncompleteOnboarding?: boolean;
}): Promise<AuthContext> {
  const user = await getAuthUser();
  if (!user) redirect("/login?next=/profile");

  const customer = await ensureCustomerForUser(user);
  if (!opts?.allowIncompleteOnboarding && needsOnboarding(customer)) {
    redirect("/onboarding");
  }
  return { user, customer };
}

/** API routes: 401 JSON when unauthenticated. */
export async function requireAuthCustomerApi(): Promise<
  | { ok: true; user: User; customer: CustomerProfile }
  | { ok: false; response: NextResponse }
> {
  const user = await getAuthUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 }),
    };
  }
  const customer = await ensureCustomerForUser(user);
  return { ok: true, user, customer };
}
