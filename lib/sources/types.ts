export type MatchSource = "n01" | "prd";

export type DetectedUrlKind =
  | "n01_match"
  | "n01_tournament"
  | "n01_league"
  | "prd_tournament"
  | "unknown";

export type DetectedUrl =
  | { kind: "n01_match"; url: string; tmid: string }
  | { kind: "n01_tournament"; url: string; tdid: string }
  | { kind: "n01_league"; url: string; lgid: string }
  | { kind: "prd_tournament"; url: string; slug: string }
  | { kind: "unknown"; url: string; reason: string };

export type ParticipantCandidate = {
  id: string;
  displayName: string;
  nickname?: string | null;
  city?: string | null;
  matchCount?: number;
};

export type GroupIdentity =
  | { status: "auto"; participantId: string; displayName: string }
  | { status: "none"; message: string; candidates: ParticipantCandidate[] }
  | { status: "ambiguous"; candidates: ParticipantCandidate[] };

export type MatchFetchRef =
  | { source: "n01"; tmid: string; viewUrl: string }
  | {
      source: "prd";
      matchId: string;
      tournamentId: string;
      kind: "group" | "knockout";
    };

export type PreviewMatch = {
  source: MatchSource;
  externalId: string;
  opponent: string | null;
  myScore: number | null;
  oppScore: number | null;
  startTime: number | null;
  startScore: number;
  alreadyInDb: boolean;
  shareToken: string | null;
  selected: boolean;
  fetchRef: MatchFetchRef;
  playerIndex: 0 | 1 | null;
};

export type PreviewLineError = {
  url: string;
  message: string;
};

export type PreviewGroup = {
  groupKey: string;
  source: MatchSource;
  kind: Exclude<DetectedUrlKind, "unknown">;
  title: string;
  sourceUrl: string;
  identity: GroupIdentity;
  matches: PreviewMatch[];
  error?: string;
};

export type PreviewResult = {
  groups: PreviewGroup[];
  lineErrors: PreviewLineError[];
};
