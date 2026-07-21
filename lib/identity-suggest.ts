/**
 * Prefill N01 patterns when empty: last name + main nick (skip placeholders).
 * Pure helper — safe on server and client (no React, no Supabase).
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
