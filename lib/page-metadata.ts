import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site-config";

/** Jedyny tytuł karty przeglądarki na wszystkich podstronach — bez imion, bez różnic per route. */
export const SITE_DOCUMENT_TITLE = "Twoje statystyki darta";

export function siteDocumentTitle(): Metadata["title"] {
  return { absolute: `${SITE_NAME} | ${SITE_DOCUMENT_TITLE}` };
}

export const SITE_OG_TITLE = `${SITE_NAME} | ${SITE_DOCUMENT_TITLE}`;
