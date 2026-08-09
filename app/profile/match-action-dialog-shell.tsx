"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  MATCH_ACTION_DIALOG_MODE,
  type MatchActionDialogMode,
} from "@/lib/match-action-dialog-mode";

type Props = {
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Override global flag (tests); default = MATCH_ACTION_DIALOG_MODE */
  mode?: MatchActionDialogMode;
};

/**
 * Inline: panel in the match card. Modal: portal to document.body (full-page dim).
 */
export function MatchActionDialogShell({
  busy,
  onClose,
  children,
  mode = MATCH_ACTION_DIALOG_MODE,
}: Props) {
  const panel = (
    <div
      role="dialog"
      aria-modal={mode === "modal"}
      className={
        mode === "modal"
          ? "glass-tile w-full max-w-md overflow-hidden shadow-2xl"
          : "border-t border-white/10 bg-black/30"
      }
      onClick={mode === "modal" ? (e) => e.stopPropagation() : undefined}
    >
      {children}
    </div>
  );

  if (mode === "inline") return panel;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="presentation"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      {panel}
    </div>,
    document.body,
  );
}
