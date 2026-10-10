import type { CustomerProfile } from "@/lib/customer";
import { autoDetectPatterns, formatCustomerDisplayName, isPlaceholderName } from "@/lib/customer";
import type { GroupIdentity, ParticipantCandidate } from "@/lib/sources/types";

export function haystackMatches(haystack: string, patterns: readonly string[]): boolean {
  const hay = haystack.toLowerCase();
  return patterns.some((p) => p.length >= 2 && hay.includes(p));
}

export function personHaystacks(parts: {
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  displayName?: string | null;
}): string[] {
  const first = parts.firstName?.trim() ?? "";
  const last = parts.lastName?.trim() ?? "";
  const nick = parts.nickname?.trim() ?? "";
  const display = parts.displayName?.trim() ?? "";
  return [display, nick, last, first && last ? `${first} ${last}` : "", first && last ? `${last} ${first}` : ""]
    .filter(Boolean);
}

export function personMatchesPatterns(
  parts: {
    firstName?: string | null;
    lastName?: string | null;
    nickname?: string | null;
    displayName?: string | null;
  },
  patterns: readonly string[],
): boolean {
  return personHaystacks(parts).some((h) => haystackMatches(h, patterns));
}

/** N01 list names like "P. Grotkowski" — narrow last-name hits by first initial. */
export function n01NameMatches(
  n01Name: string,
  customer: CustomerProfile,
  patterns: readonly string[],
): boolean {
  if (!haystackMatches(n01Name, patterns)) return false;
  const last = customer.lastName.trim().toLowerCase();
  if (!last || isPlaceholderName(customer.firstName, customer.lastName)) return true;
  const name = n01Name.toLowerCase();
  if (!name.includes(last)) return true;
  const initial = customer.firstName.trim().charAt(0).toLowerCase();
  if (!initial) return true;
  // "P. Grotkowski" / "Piotr Grotkowski"
  if (name.startsWith(`${initial}.`) || name.startsWith(`${initial} `)) return true;
  if (name.includes(customer.firstName.trim().toLowerCase())) return true;
  // Only last name in the string (no initial) — still accept; disambiguate via tpid count
  if (name === last || name.endsWith(` ${last}`)) return true;
  return false;
}

export function resolveCandidates(
  candidates: ParticipantCandidate[],
  emptyMessage: string,
): GroupIdentity {
  if (candidates.length === 0) {
    return { status: "none", message: emptyMessage, candidates: [] };
  }
  if (candidates.length === 1) {
    return {
      status: "auto",
      participantId: candidates[0].id,
      displayName: candidates[0].displayName,
    };
  }
  return { status: "ambiguous", candidates };
}

export function customerPatterns(customer: CustomerProfile): string[] {
  return autoDetectPatterns(customer);
}

export function customerDisplay(customer: CustomerProfile): string {
  return formatCustomerDisplayName(customer);
}
