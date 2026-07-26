/**
 * Pure helpers for identity form display — safe on server and client.
 */

/** Placeholder names used at account create — UI traktuje je jak puste. */
export function isPlaceholderName(firstName: string, lastName: string): boolean {
  const f = firstName.trim().toLowerCase();
  const l = lastName.trim().toLowerCase();
  if (!f || !l) return true;
  if (f === "gracz" && l === "dart") return true;
  if (f === "test" && l === "user") return true;
  return false;
}

/** Blank placeholder DB names so the form shows gray hints instead. */
export function formNameFields(parts: {
  firstName: string;
  lastName: string;
  nickname: string | null;
  knownNicknames: string[];
}): {
  firstName: string;
  lastName: string;
  nickname: string;
  knownNicknames: string;
} {
  const placeholder = isPlaceholderName(parts.firstName, parts.lastName);
  return {
    firstName: placeholder ? "" : parts.firstName,
    lastName: placeholder ? "" : parts.lastName,
    nickname: parts.nickname?.trim() ?? "",
    // Never invent values — only show what user already saved
    knownNicknames: parts.knownNicknames.filter((n) => n.trim()).join(", "),
  };
}
