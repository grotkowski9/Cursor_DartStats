import type { N01Match } from "@/lib/n01-parser";

/**
 * Strip storage paths and raw payload before sending matches to the browser.
 * Paths embed customer_id; rawPayload can be huge and is never needed in UI.
 */
export function toClientMatch(match: N01Match): N01Match {
  const { rawPayload: _raw, ...rest } = match;
  return {
    ...rest,
    snapshotPath: "",
    htmlSnapshotPath: null,
  };
}

export function toClientMatches(matches: N01Match[]): N01Match[] {
  return matches.map(toClientMatch);
}
