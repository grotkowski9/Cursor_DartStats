import { AUTO_DETECT_PATTERNS } from "@/lib/constants";

export type PlayerDetectionResult =
  | { status: "auto"; playerIndex: 0 | 1 }
  | { status: "ambiguous"; players: [string, string] }
  | { status: "none"; players: [string, string] };

export function detectPlayerIndex(
  players: [string, string],
  autoPatterns: readonly string[] = AUTO_DETECT_PATTERNS,
): PlayerDetectionResult {
  const patterns = autoPatterns.map((p) => p.toLowerCase());
  const matches = players.map((name) => {
    const normalized = name.toLowerCase();
    return patterns.some((pattern) => normalized.includes(pattern));
  });

  if (matches[0] && matches[1]) {
    return { status: "ambiguous", players };
  }
  if (matches[0]) return { status: "auto", playerIndex: 0 };
  if (matches[1]) return { status: "auto", playerIndex: 1 };
  return { status: "none", players };
}

export function applyPlayerIndex(
  players: [{ name: string; isMe?: boolean }, { name: string; isMe?: boolean }],
  playerIndex: 0 | 1,
): void {
  players[0].isMe = playerIndex === 0;
  players[1].isMe = playerIndex === 1;
}
