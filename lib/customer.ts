import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Database, Tables } from "@/types/database";

export type ThrowingHand = "L" | "R";

export type CustomerAboutFields = {
  city: string | null;
  dartBrand: string | null;
  dartBrandOther: string | null;
  dartModel: string | null;
  dartWeightBucket: string | null;
  throwingHand: ThrowingHand | null;
  favoritePlayerId: string | null;
  profileStatsVisible: boolean;
  newsletterOptIn: boolean;
  aboutCompletedAt: string | null;
  tourCompletedAt: string | null;
};

export type CustomerProfile = {
  customerId: string;
  authUserId: string | null;
  firstName: string;
  lastName: string;
  nickname: string | null;
  knownNicknames: string[];
  role: string;
} & CustomerAboutFields;

/** Imię „pseudonim" Nazwisko — sklejane w appce, nie w DB. */
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
  | "known_nicknames"
  | "role"
  | "city"
  | "dart_brand"
  | "dart_brand_other"
  | "dart_model"
  | "dart_weight_bucket"
  | "throwing_hand"
  | "favorite_player_id"
  | "profile_stats_visible"
  | "newsletter_opt_in"
  | "about_completed_at"
  | "tour_completed_at"
>;

function rowToProfile(row: CustomerRow): CustomerProfile {
  const hand = row.throwing_hand;
  return {
    customerId: row.customer_id,
    authUserId: row.auth_user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    nickname: row.nickname,
    knownNicknames: row.known_nicknames ?? [],
    role: row.role,
    city: row.city,
    dartBrand: row.dart_brand,
    dartBrandOther: row.dart_brand_other,
    dartModel: row.dart_model,
    dartWeightBucket: row.dart_weight_bucket,
    throwingHand: hand === "L" || hand === "R" ? hand : null,
    favoritePlayerId: row.favorite_player_id,
    profileStatsVisible: row.profile_stats_visible ?? true,
    newsletterOptIn: row.newsletter_opt_in ?? false,
    aboutCompletedAt: row.about_completed_at,
    tourCompletedAt: row.tour_completed_at,
  };
}

const CUSTOMER_SELECT =
  "customer_id, auth_user_id, first_name, last_name, nickname, known_nicknames, role, city, dart_brand, dart_brand_other, dart_model, dart_weight_bucket, throwing_hand, favorite_player_id, profile_stats_visible, newsletter_opt_in, about_completed_at, tour_completed_at";

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

export type CustomerProfilePatch = {
  firstName?: string;
  lastName?: string;
  nickname?: string | null;
  knownNicknames?: string[];
  city?: string | null;
  dartBrand?: string | null;
  dartBrandOther?: string | null;
  dartModel?: string | null;
  dartWeightBucket?: string | null;
  throwingHand?: ThrowingHand | null;
  favoritePlayerId?: string | null;
  profileStatsVisible?: boolean;
  newsletterOptIn?: boolean;
  /** When true, stamp about_completed_at (save O Tobie). */
  markAboutCompleted?: boolean;
  markTourCompleted?: boolean;
};

export async function updateCustomerProfile(
  customerId: string,
  patch: CustomerProfilePatch,
): Promise<CustomerProfile> {
  const supabase = getSupabaseAdmin();
  const update: Database["public"]["Tables"]["customers"]["Update"] = {
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
  if (patch.city !== undefined) update.city = patch.city?.trim() || null;
  if (patch.dartBrand !== undefined) update.dart_brand = patch.dartBrand?.trim() || null;
  if (patch.dartBrandOther !== undefined) {
    update.dart_brand_other = patch.dartBrandOther?.trim() || null;
  }
  if (patch.dartModel !== undefined) update.dart_model = patch.dartModel?.trim() || null;
  if (patch.dartWeightBucket !== undefined) {
    update.dart_weight_bucket = patch.dartWeightBucket?.trim() || null;
  }
  if (patch.throwingHand !== undefined) update.throwing_hand = patch.throwingHand;
  if (patch.favoritePlayerId !== undefined) {
    update.favorite_player_id = patch.favoritePlayerId?.trim() || null;
  }
  if (patch.profileStatsVisible !== undefined) {
    update.profile_stats_visible = patch.profileStatsVisible;
  }
  if (patch.newsletterOptIn !== undefined) {
    update.newsletter_opt_in = patch.newsletterOptIn;
  }
  if (patch.markAboutCompleted) {
    update.about_completed_at = new Date().toISOString();
  }
  if (patch.markTourCompleted) {
    update.tour_completed_at = new Date().toISOString();
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

export function needsAboutSoftCta(customer: CustomerProfile): boolean {
  return !customer.aboutCompletedAt;
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
