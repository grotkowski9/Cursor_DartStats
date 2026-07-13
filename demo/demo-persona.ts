/**
 * Demo player persona — edit this file to swap the whole demo character.
 * Re-run `npm run seed:demo` after changing nicknames or importing new demo matches.
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
  tagline: "Twój Dart Profile Tracker — Wszystkie Twoje statystyki z turniejów lokalnych w jednym miejscu.",
};

/** Share tokens for demo matches — demo001, demo002, … */
export function demoShareToken(index: number): string {
  return `demo${String(index + 1).padStart(3, "0")}`;
}
