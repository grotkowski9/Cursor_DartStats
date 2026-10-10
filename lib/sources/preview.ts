import { SUPPORTED_START_SCORE } from "@/lib/constants";
import type { CustomerProfile } from "@/lib/customer";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { detectSourceUrl, splitInputUrls } from "@/lib/sources/detect-url";
import {
  buildN01CompetitionGroup,
  fetchN01FinishedMatches,
  fetchN01LeagueTdids,
  fetchN01LeagueTitle,
  fetchN01MatchSummary,
  fetchN01TournamentTitle,
  matchesForParticipant,
  pickN01Identity,
  previewMatchesFromN01,
  previewSingleN01Match,
  uniqueN01Players,
} from "@/lib/sources/n01-competition";
import {
  buildPrdPreviewGroup,
  fetchPrdParticipants,
  fetchPrdPlayerMatches,
  fetchPrdTournamentBySlug,
  pickPrdIdentity,
  previewMatchesFromPrd,
} from "@/lib/sources/prd";
import type {
  DetectedUrl,
  GroupIdentity,
  ParticipantCandidate,
  PreviewGroup,
  PreviewLineError,
  PreviewMatch,
  PreviewResult,
} from "@/lib/sources/types";

function withAllCandidates(identity: GroupIdentity, all: ParticipantCandidate[]): GroupIdentity {
  if (identity.status === "none") return { ...identity, candidates: all };
  return identity;
}

export async function existingShareTokens(
  customerId: string,
  externalIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!externalIds.length) return map;
  const supabase = getSupabaseAdmin();
  const CHUNK = 80;
  for (let i = 0; i < externalIds.length; i += CHUNK) {
    const chunk = externalIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("matches")
      .select("n01_tmid, share_token")
      .eq("customer_id", customerId)
      .in("n01_tmid", chunk);
    if (error) throw new Error(`preview existing: ${error.message}`);
    for (const row of data ?? []) map.set(row.n01_tmid, row.share_token);
  }
  return map;
}

export function applyExistingToMatches(
  matches: PreviewMatch[],
  existing: Map<string, string>,
): PreviewMatch[] {
  return matches.map((m) => {
    const share = existing.get(m.externalId) ?? m.shareToken;
    const already = Boolean(share);
    return {
      ...m,
      alreadyInDb: already,
      shareToken: share ?? null,
      selected: already ? false : m.selected,
    };
  });
}

export function dedupePreviewMatches(matches: PreviewMatch[]): PreviewMatch[] {
  const seen = new Set<string>();
  const out: PreviewMatch[] = [];
  for (const m of matches) {
    const key = `${m.source}:${m.externalId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

/** Prefer tournament/league groups over a standalone match URL for the same id. */
export function dedupePreviewGroups(groups: PreviewGroup[]): PreviewGroup[] {
  const keepIn = new Map<string, string>();
  for (const g of groups) {
    if (g.kind === "n01_match") continue;
    for (const m of g.matches) {
      const key = `${m.source}:${m.externalId}`;
      if (!keepIn.has(key)) keepIn.set(key, g.groupKey);
    }
  }
  for (const g of groups) {
    if (g.kind !== "n01_match") continue;
    for (const m of g.matches) {
      const key = `${m.source}:${m.externalId}`;
      if (!keepIn.has(key)) keepIn.set(key, g.groupKey);
    }
  }
  return groups
    .map((g) => ({
      ...g,
      matches: g.matches.filter(
        (m) => keepIn.get(`${m.source}:${m.externalId}`) === g.groupKey,
      ),
    }))
    .filter(
      (g) =>
        g.matches.length > 0 ||
        Boolean(g.error) ||
        g.kind !== "n01_match",
    );
}

async function previewDetected(
  detected: DetectedUrl,
  customer: CustomerProfile,
  customerId: string,
): Promise<{ groups: PreviewGroup[]; lineError?: PreviewLineError }> {
  if (detected.kind === "unknown") {
    const msg =
      detected.reason === "empty"
        ? "Pusta linia"
        : detected.reason === "not_url"
          ? "To nie jest prawidłowy URL"
          : detected.reason === "prd_not_tournament"
            ? "Podaj link do strony turnieju PRD (/turnieje/…)"
            : detected.reason === "n01_unsupported"
              ? "Ten link N01 nie jest meczem, turniejem ani ligą"
              : "Nieobsługiwany link";
    return { groups: [], lineError: { url: detected.url, message: msg } };
  }

  if (detected.kind === "n01_match") {
    const summary = await fetchN01MatchSummary(detected.tmid).catch(() => null);
    const existing = await existingShareTokens(customerId, [detected.tmid]);
    return {
      groups: [previewSingleN01Match({ tmid: detected.tmid, url: detected.url, summary, customer, existing })],
    };
  }

  if (detected.kind === "n01_tournament") {
    try {
      const [title, list] = await Promise.all([
        fetchN01TournamentTitle(detected.tdid),
        fetchN01FinishedMatches(detected.tdid),
      ]);
      const identity = withAllCandidates(pickN01Identity(list, customer), uniqueN01Players(list));
      const participantId = identity.status === "auto" ? identity.participantId : null;
      const mine = participantId ? matchesForParticipant(list, participantId) : [];
      const tmids = mine.map((m) => String(m.tmid)).filter(Boolean);
      const existing = await existingShareTokens(customerId, tmids);
      const matches = participantId
        ? applyExistingToMatches(previewMatchesFromN01({ matches: mine, participantId, existing }), existing)
        : [];
      return {
        groups: [
          buildN01CompetitionGroup({
            groupKey: `n01-tdid:${detected.tdid}`,
            kind: "n01_tournament",
            title,
            sourceUrl: detected.url,
            identity,
            matches: dedupePreviewMatches(matches),
          }),
        ],
      };
    } catch (e) {
      return {
        groups: [
          buildN01CompetitionGroup({
            groupKey: `n01-tdid:${detected.tdid}`,
            kind: "n01_tournament",
            title: detected.tdid,
            sourceUrl: detected.url,
            identity: {
              status: "none",
              message: e instanceof Error ? e.message : "Błąd N01",
              candidates: [],
            },
            matches: [],
            error: e instanceof Error ? e.message : "Błąd N01",
          }),
        ],
      };
    }
  }

  if (detected.kind === "n01_league") {
    try {
      const [title, tdids] = await Promise.all([
        fetchN01LeagueTitle(detected.lgid),
        fetchN01LeagueTdids(detected.lgid),
      ]);
      const lists = await Promise.all(tdids.map((tdid) => fetchN01FinishedMatches(tdid)));
      const all = lists.flat();
      const identity = withAllCandidates(pickN01Identity(all, customer), uniqueN01Players(all));
      const participantId = identity.status === "auto" ? identity.participantId : null;
      const mine = participantId ? matchesForParticipant(all, participantId) : [];
      const existing = await existingShareTokens(
        customerId,
        mine.map((m) => String(m.tmid)).filter(Boolean),
      );
      const matches = participantId
        ? applyExistingToMatches(
            previewMatchesFromN01({ matches: mine, participantId, existing, ttype: "league" }),
            existing,
          )
        : [];
      return {
        groups: [
          buildN01CompetitionGroup({
            groupKey: `n01-lgid:${detected.lgid}`,
            kind: "n01_league",
            title,
            sourceUrl: detected.url,
            identity,
            matches: dedupePreviewMatches(matches),
          }),
        ],
      };
    } catch (e) {
      return {
        groups: [
          buildN01CompetitionGroup({
            groupKey: `n01-lgid:${detected.lgid}`,
            kind: "n01_league",
            title: detected.lgid,
            sourceUrl: detected.url,
            identity: {
              status: "none",
              message: e instanceof Error ? e.message : "Błąd N01",
              candidates: [],
            },
            matches: [],
            error: e instanceof Error ? e.message : "Błąd N01",
          }),
        ],
      };
    }
  }

  try {
    const tournament = await fetchPrdTournamentBySlug(detected.slug);
    const participants = await fetchPrdParticipants(tournament.id);
    const identity = pickPrdIdentity(participants, customer);
    const participantId = identity.status === "auto" ? identity.participantId : null;
    let matches: PreviewMatch[] = [];
    if (participantId) {
      const { group, knockout } = await fetchPrdPlayerMatches(tournament.id, participantId);
      const preview = previewMatchesFromPrd({
        tournament,
        sourceUrl: detected.url,
        playerId: participantId,
        group,
        knockout,
        existing: new Map(),
      });
      const existing = await existingShareTokens(
        customerId,
        preview.map((m) => m.externalId),
      );
      matches = applyExistingToMatches(preview, existing);
    }
    const group = buildPrdPreviewGroup({
      tournament,
      sourceUrl: detected.url,
      identity:
        identity.status === "none"
          ? { ...identity, candidates: participants }
          : identity,
      matches: dedupePreviewMatches(matches),
    });
    return { groups: [group] };
  } catch (e) {
    return {
      groups: [],
      lineError: {
        url: detected.url,
        message: e instanceof Error ? e.message : "Błąd PRD",
      },
    };
  }
}

export async function expandGroupWithParticipant(opts: {
  group: PreviewGroup;
  participantId: string;
  customerId: string;
}): Promise<PreviewGroup> {
  const detected = detectSourceUrl(opts.group.sourceUrl);
  if (detected.kind === "n01_tournament") {
    const list = await fetchN01FinishedMatches(detected.tdid);
    const mine = matchesForParticipant(list, opts.participantId);
    const existing = await existingShareTokens(
      opts.customerId,
      mine.map((m) => String(m.tmid)).filter(Boolean),
    );
    const picked = list
      .flatMap((m) => m.statsData ?? [])
      .find((p) => String(p.tpid ?? p.name ?? "") === opts.participantId);
    return {
      ...opts.group,
      identity: {
        status: "auto",
        participantId: opts.participantId,
        displayName: picked?.name ?? opts.participantId,
      },
      matches: applyExistingToMatches(
        previewMatchesFromN01({ matches: mine, participantId: opts.participantId, existing }),
        existing,
      ),
    };
  }
  if (detected.kind === "n01_league") {
    const tdids = await fetchN01LeagueTdids(detected.lgid);
    const lists = await Promise.all(tdids.map((tdid) => fetchN01FinishedMatches(tdid)));
    const all = lists.flat();
    const mine = matchesForParticipant(all, opts.participantId);
    const existing = await existingShareTokens(
      opts.customerId,
      mine.map((m) => String(m.tmid)).filter(Boolean),
    );
    const picked = all
      .flatMap((m) => m.statsData ?? [])
      .find((p) => String(p.tpid ?? p.name ?? "") === opts.participantId);
    return {
      ...opts.group,
      identity: {
        status: "auto",
        participantId: opts.participantId,
        displayName: picked?.name ?? opts.participantId,
      },
      matches: applyExistingToMatches(
        previewMatchesFromN01({
          matches: mine,
          participantId: opts.participantId,
          existing,
          ttype: "league",
        }),
        existing,
      ),
    };
  }
  if (detected.kind === "prd_tournament") {
    const tournament = await fetchPrdTournamentBySlug(detected.slug);
    const { group, knockout } = await fetchPrdPlayerMatches(tournament.id, opts.participantId);
    const preview = previewMatchesFromPrd({
      tournament,
      sourceUrl: opts.group.sourceUrl,
      playerId: opts.participantId,
      group,
      knockout,
      existing: new Map(),
    });
    const existing = await existingShareTokens(
      opts.customerId,
      preview.map((m) => m.externalId),
    );
    const participants = await fetchPrdParticipants(tournament.id);
    const picked = participants.find((p) => p.id === opts.participantId);
    return {
      ...opts.group,
      identity: {
        status: "auto",
        participantId: opts.participantId,
        displayName: picked?.displayName ?? opts.participantId,
      },
      matches: applyExistingToMatches(preview, existing),
    };
  }
  if (detected.kind === "n01_match") {
    const slot = opts.participantId === "slot-1" ? 1 : 0;
    return {
      ...opts.group,
      identity: {
        status: "auto",
        participantId: opts.participantId,
        displayName: opts.group.matches[0]?.opponent
          ? `slot ${slot}`
          : opts.participantId,
      },
      matches: opts.group.matches.map((m) => ({
        ...m,
        playerIndex: slot,
        selected: !m.alreadyInDb,
      })),
    };
  }
  return opts.group;
}

export function mergePreviewGroups(groups: PreviewGroup[]): PreviewGroup[] {
  const byKey = new Map<string, PreviewGroup>();
  for (const g of groups) {
    const prev = byKey.get(g.groupKey);
    if (!prev) {
      byKey.set(g.groupKey, { ...g, matches: dedupePreviewMatches(g.matches) });
      continue;
    }
    byKey.set(g.groupKey, {
      ...prev,
      matches: dedupePreviewMatches([...prev.matches, ...g.matches]),
      error: prev.error ?? g.error,
    });
  }
  return dedupePreviewGroups([...byKey.values()]);
}

export async function previewImportUrls(
  rawUrls: string[] | string,
  customer: CustomerProfile,
): Promise<PreviewResult> {
  const urls = Array.isArray(rawUrls) ? rawUrls.map((u) => u.trim()).filter(Boolean) : splitInputUrls(rawUrls);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const u of urls) {
    if (seen.has(u)) continue;
    seen.add(u);
    unique.push(u);
  }

  const groups: PreviewGroup[] = [];
  const lineErrors: PreviewLineError[] = [];

  for (const url of unique) {
    const detected = detectSourceUrl(url);
    try {
      const part = await previewDetected(detected, customer, customer.customerId);
      groups.push(...part.groups);
      if (part.lineError) lineErrors.push(part.lineError);
    } catch (e) {
      lineErrors.push({
        url,
        message: e instanceof Error ? e.message : "Import preview nieudany",
      });
    }
  }

  const merged = mergePreviewGroups(groups);
  for (const g of merged) {
    g.matches = g.matches.filter((m) => m.startScore === SUPPORTED_START_SCORE);
  }
  return { groups: merged, lineErrors };
}
