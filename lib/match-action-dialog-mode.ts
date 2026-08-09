/**
 * How edit/delete match wizards are shown on the profile card.
 *
 * - `"inline"` — panel inside the match card (default)
 * - `"modal"` — full-page portal overlay (previous UX)
 *
 * Furtka: ustaw `"modal"` i redeploy, albo checkout branch
 * `backup/match-dialogs-portal` (commit 23c49b2).
 */
export type MatchActionDialogMode = "inline" | "modal";

export const MATCH_ACTION_DIALOG_MODE: MatchActionDialogMode = "inline";
