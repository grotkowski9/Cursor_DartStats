import { SUPPORTED_START_SCORE, unsupportedStartScoreMessage } from "@/lib/constants";
import { ingestAndSave, saveMatch } from "@/lib/matches";
import { existingShareTokens } from "@/lib/sources/preview";
import { fetchPrdMatch, fetchPrdTournamentById, parseAndBackupPrd } from "@/lib/sources/prd";
import type { MatchFetchRef, MatchSource } from "@/lib/sources/types";

export type CommitItem = {
  source: MatchSource;
  externalId: string;
  fetchRef: MatchFetchRef;
  overwrite?: boolean;
  playerIndex?: 0 | 1 | null;
  participantId?: string | null;
};

export type CommitItemResult = {
  externalId: string;
  status: "saved" | "skipped" | "duplicate" | "error";
  message?: string;
  shareToken?: string;
};

export async function commitImportItems(opts: {
  customerId: string;
  items: CommitItem[];
}): Promise<{ results: CommitItemResult[]; saved: number }> {
  const results: CommitItemResult[] = [];
  let saved = 0;
  const seen = new Set<string>();
  const items: CommitItem[] = [];
  for (const item of opts.items) {
    const key = `${item.source}:${item.externalId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }

  for (const item of items) {
    try {
      if (item.source === "n01") {
        const viewUrl = item.fetchRef.source === "n01" ? item.fetchRef.viewUrl : null;
        if (!viewUrl) {
          results.push({
            externalId: item.externalId,
            status: "error",
            message: "Brak URL meczu N01",
          });
          continue;
        }
        const result = await ingestAndSave({
          url: viewUrl,
          overwrite: item.overwrite,
          playerIndex:
            item.playerIndex === 0 || item.playerIndex === 1 ? item.playerIndex : undefined,
          customerId: opts.customerId,
        });
        if (result.status === "saved") {
          saved += 1;
          results.push({
            externalId: item.externalId,
            status: "saved",
            shareToken: result.match.shareToken,
          });
          continue;
        }
        if (result.status === "duplicate") {
          results.push({
            externalId: item.externalId,
            status: "duplicate",
            shareToken: result.shareToken,
            message: "już w bazie",
          });
          continue;
        }
        if (result.status === "unsupported_start_score") {
          results.push({
            externalId: item.externalId,
            status: "error",
            message: result.message,
          });
          continue;
        }
        if (result.status === "needs_identity_confirmation") {
          results.push({
            externalId: item.externalId,
            status: "error",
            message: "Wybierz, który zawodnik to Ty",
          });
          continue;
        }
        results.push({
          externalId: item.externalId,
          status: "skipped",
          message: result.status,
        });
        continue;
      }

      if (item.fetchRef.source !== "prd") {
        results.push({
          externalId: item.externalId,
          status: "error",
          message: "Brak referencji PRD",
        });
        continue;
      }

      if (!item.overwrite) {
        const existing = await existingShareTokens(opts.customerId, [item.externalId]);
        const share = existing.get(item.externalId);
        if (share) {
          results.push({
            externalId: item.externalId,
            status: "duplicate",
            shareToken: share,
            message: "już w bazie",
          });
          continue;
        }
      }

      const raw = await fetchPrdMatch(item.fetchRef.kind, item.fetchRef.matchId);
      const startScore = raw.starting_points ?? 501;
      if (startScore !== SUPPORTED_START_SCORE) {
        results.push({
          externalId: item.externalId,
          status: "error",
          message: unsupportedStartScoreMessage(startScore),
        });
        continue;
      }

      const playerId =
        item.participantId || (item.playerIndex === 1 ? raw.player2 : raw.player1);
      if (!playerId) {
        results.push({
          externalId: item.externalId,
          status: "error",
          message: "Nie wybrano zawodnika PRD",
        });
        continue;
      }

      const tournament = await fetchPrdTournamentById(item.fetchRef.tournamentId);
      const parsed = await parseAndBackupPrd({
        raw,
        tournament,
        playerId,
        customerId: opts.customerId,
      });
      await saveMatch(parsed, opts.customerId);
      saved += 1;
      results.push({
        externalId: item.externalId,
        status: "saved",
        shareToken: parsed.shareToken,
      });
    } catch (e) {
      results.push({
        externalId: item.externalId,
        status: "error",
        message: e instanceof Error ? e.message : "Import nieudany",
      });
    }
  }

  return { results, saved };
}
