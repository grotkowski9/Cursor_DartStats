import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site-config";

/** Tymczasowo pod weryfikację Google OAuth — przywróć z backups/oauth-verification-landing/page-metadata.ts */
export const SITE_DOCUMENT_TITLE = SITE_NAME;

export function siteDocumentTitle(): Metadata["title"] {
  return { absolute: SITE_NAME };
}

export const SITE_OG_TITLE = SITE_NAME;
