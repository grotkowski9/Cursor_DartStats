import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Tables } from "@/types/database";

export type CustomerProfile = {
  customerId: string;
  authUserId: string | null;
  firstName: string;
  lastName: string;
  nickname: string | null;
  displayName: string;
  knownNicknames: string[];
  role: string;
};

/** Imię „pseudonim" Nazwisko — mirrors DB generated column. */
export function formatCustomerDisplayName(parts: {
  firstName: string;
  lastName: string;
  nickname?: string | null;
}): string {
  const nick = parts.nickname?.trim();
  if (nick) return `${parts.firstName} „${nick}" ${parts.lastName}`;
  return `${parts.firstName} ${parts.lastName}`;
}

type CustomerRow = Pick<
  Tables<"customers">,
  | "customer_id"
  | "auth_user_id"
  | "first_name"
  | "last_name"
  | "nickname"
  | "display_name"
  | "known_nicknames"
  | "role"
>;

function rowToProfile(row: CustomerRow): CustomerProfile {
  return {
    customerId: row.customer_id,
    authUserId: row.auth_user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    nickname: row.nickname,
    displayName: row.display_name,
    knownNicknames: row.known_nicknames ?? [],
    role: row.role,
  };
}

const CUSTOMER_SELECT =
  "customer_id, auth_user_id, first_name, last_name, nickname, display_name, known_nicknames, role";

export async function getCustomerById(customerId: string): Promise<CustomerProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_SELECT)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) throw new Error(`getCustomerById: ${error.message}`);
  if (!data) return null;
  return rowToProfile(data);
}

export async function getCustomerByAuthUserId(
  authUserId: string,
): Promise<CustomerProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_SELECT)
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw new Error(`getCustomerByAuthUserId: ${error.message}`);
  if (!data) return null;
  return rowToProfile(data);
}

export async function linkAuthUserToCustomer(
  customerId: string,
  authUserId: string,
): Promise<CustomerProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("customers")
    .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
    .eq("customer_id", customerId)
    .is("auth_user_id", null)
    .select(CUSTOMER_SELECT)
    .maybeSingle();
  if (error) throw new Error(`linkAuthUserToCustomer: ${error.message}`);
  if (!data) {
    // Already linked to someone else — fall through to create new customer
    const existing = await getCustomerById(customerId);
    if (existing?.authUserId && existing.authUserId !== authUserId) return null;
    if (existing?.authUserId === authUserId) return existing;
    return null;
  }
  return rowToProfile(data);
}

export async function createCustomerForUser(input: {
  authUserId: string;
  firstName: string;
  lastName: string;
  nickname?: string | null;
  knownNicknames?: string[];
}): Promise<CustomerProfile> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      auth_user_id: input.authUserId,
      first_name: input.firstName.trim() || "Gracz",
      last_name: input.lastName.trim() || "Dart",
      nickname: input.nickname?.trim() || null,
      known_nicknames: input.knownNicknames ?? [],
      role: "user",
    })
    .select(CUSTOMER_SELECT)
    .single();
  if (error) throw new Error(`createCustomerForUser: ${error.message}`);
  return rowToProfile(data);
}

export async function updateCustomerProfile(
  customerId: string,
  patch: {
    firstName?: string;
    lastName?: string;
    nickname?: string | null;
    knownNicknames?: string[];
  },
): Promise<CustomerProfile> {
  const supabase = getSupabaseAdmin();
  const update: {
    first_name?: string;
    last_name?: string;
    nickname?: string | null;
    known_nicknames?: string[];
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };
  if (patch.firstName !== undefined) update.first_name = patch.firstName.trim();
  if (patch.lastName !== undefined) update.last_name = patch.lastName.trim();
  if (patch.nickname !== undefined) {
    update.nickname = patch.nickname?.trim() || null;
  }
  if (patch.knownNicknames !== undefined) {
    update.known_nicknames = patch.knownNicknames
      .map((n) => n.trim())
      .filter(Boolean);
  }

  const { data, error } = await supabase
    .from("customers")
    .update(update)
    .eq("customer_id", customerId)
    .select(CUSTOMER_SELECT)
    .single();
  if (error) throw new Error(`updateCustomerProfile: ${error.message}`);
  return rowToProfile(data);
}

/**
 * Profil tożsamości niekompletny (1.1.9): brak wzorców N01.
 * Imię/nazwisko są wymagane w formularzu; gate ingest/profil opiera się o known_nicknames.
 */
export function needsOnboarding(customer: CustomerProfile): boolean {
  return customer.knownNicknames.filter((n) => n.trim()).length === 0;
}

/**
 * Prefill N01 patterns when empty: last name + main nick (skip placeholders).
 * Safe for server + client (no React hooks).
 */
export function suggestKnownNicknames(parts: {
  firstName: string;
  lastName: string;
  nickname: string | null;
  knownNicknames: string[];
}): string {
  if (parts.knownNicknames.filter((n) => n.trim()).length > 0) {
    return parts.knownNicknames.join(", ");
  }
  const suggestions: string[] = [];
  const last = parts.lastName.trim();
  if (last && last.toLowerCase() !== "dart") suggestions.push(last);
  const nick = parts.nickname?.trim();
  if (nick) suggestions.push(nick);
  return suggestions.join(", ");
}

/** Patterns for N01 auto-detect (lowercase). Falls back to nickname + last_name. */
export function autoDetectPatterns(customer: CustomerProfile): string[] {
  const fromDb = customer.knownNicknames
    .map((n) => n.toLowerCase().trim())
    .filter(Boolean);
  if (fromDb.length > 0) return fromDb;

  const extras = [customer.lastName, customer.nickname]
    .map((n) => n?.toLowerCase().trim())
    .filter((n): n is string => Boolean(n));
  return [...new Set(extras)];
}
