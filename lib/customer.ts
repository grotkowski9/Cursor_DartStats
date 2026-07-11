import { DEFAULT_CUSTOMER_ID } from "@/lib/constants";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Tables } from "@/types/database";

export type CustomerProfile = {
  customerId: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  displayName: string;
  knownNicknames: string[];
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
  "customer_id" | "first_name" | "last_name" | "nickname" | "display_name" | "known_nicknames"
>;

function rowToProfile(row: CustomerRow): CustomerProfile {
  return {
    customerId: row.customer_id,
    firstName: row.first_name,
    lastName: row.last_name,
    nickname: row.nickname,
    displayName: row.display_name,
    knownNicknames: row.known_nicknames ?? [],
  };
}

export async function getCustomerById(
  customerId: string = DEFAULT_CUSTOMER_ID,
): Promise<CustomerProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("customers")
    .select("customer_id, first_name, last_name, nickname, display_name, known_nicknames")
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) throw new Error(`getCustomerById: ${error.message}`);
  if (!data) return null;
  return rowToProfile(data);
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
