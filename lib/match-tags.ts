import type { N01Match } from "@/lib/n01-parser";

export const MAX_TAGS_PER_MATCH = 8;
export const MAX_TAG_LENGTH = 32;

export function normalizeTag(raw: string): string | null {
  const tag = raw.replace(/\s+/g, " ").trim();
  if (tag.length < 1 || tag.length > MAX_TAG_LENGTH) return null;
  return tag;
}

export function sanitizeMatchTags(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length > MAX_TAGS_PER_MATCH) return null;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") return null;
    const tag = normalizeTag(item);
    if (!tag) return null;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

export function matchTags(match: N01Match): string[] {
  return Array.isArray(match.tags) ? match.tags : [];
}

/** Catalog from THIS profile's matches only — never mixes demo snapshot with live user tags. */
export function uniqueCatalogTags(matches: N01Match[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    for (const tag of matchTags(m)) {
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
    }
  }
  return out.sort((a, b) => a.localeCompare(b, "pl"));
}

export function filterByTags(
  matches: N01Match[],
  opts: { includeTag?: string | null; excludeTag?: string | null },
): N01Match[] {
  const include = opts.includeTag?.trim() ? opts.includeTag.trim().toLowerCase() : null;
  const exclude = opts.excludeTag?.trim() ? opts.excludeTag.trim().toLowerCase() : null;
  if (!include && !exclude) return matches;
  return matches.filter((m) => {
    const keys = matchTags(m).map((t) => t.toLowerCase());
    if (include && !keys.includes(include)) return false;
    if (exclude && keys.includes(exclude)) return false;
    return true;
  });
}
