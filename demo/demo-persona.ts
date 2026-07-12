/**
 * Demo player persona — edit this file to swap the whole demo character.
 * Re-run `npm run build:demo` after changing nicknames (for knownNicknames in dataset).
 */
export type DemoPersona = {
  firstName: string;
  lastName: string;
  nickname: string;
  /** N01-style name in match data */
  n01Name: string;
  knownNicknames: string[];
  tagline: string;
};

export const DEMO_PERSONA: DemoPersona = {
  firstName: "Antoni",
  lastName: "Kowalski",
  nickname: "Robot",
  n01Name: "KOWALSKI Antoni / Robot",
  knownNicknames: ["Kowalski", "Robot", "Antoni", "KOWALSKI"],
  tagline: "Gracz klubowy — turnieje open, pub league, zero ściemy w statystykach.",
};

export const DEMO_MATCH_COUNT = 10;

/** Share tokens for demo matches — demo001 … demo010 */
export function demoShareToken(index: number): string {
  return `demo${String(index + 1).padStart(3, "0")}`;
}
