import type { N01Match } from "@/lib/n01-parser";
import type { CustomerProfile } from "@/lib/customer";
import { DEMO_PERSONA, demoShareToken, type DemoPersona } from "@/demo/demo-persona";
import { refreshDemoSnapshotDates, type DemoProfileSnapshot } from "@/lib/demo-snapshot";
import { applyDemoDates } from "@/lib/demo-dates";
import demoSnapshotJson from "@/demo/demo-profile-snapshot.json";

const demoSnapshot = demoSnapshotJson as unknown as DemoProfileSnapshot;

export function getDemoPersona(): DemoPersona {
  return DEMO_PERSONA;
}

export function personaToCustomer(persona: DemoPersona = DEMO_PERSONA): CustomerProfile {
  return {
    customerId: "demo",
    authUserId: null,
    firstName: persona.firstName,
    lastName: persona.lastName,
    nickname: persona.nickname,
    displayName: `${persona.lastName} ${persona.firstName}`,
    knownNicknames: persona.knownNicknames,
    role: "user",
  };
}

/** Statyczny snapshot — staty z JSON, daty względem „teraz”. */
export function getDemoSnapshot(): DemoProfileSnapshot {
  return refreshDemoSnapshotDates(demoSnapshot);
}

export function getDemoMatches(): N01Match[] {
  return getDemoSnapshot().matches;
}

export function getDemoMatchByShareToken(shareToken: string): N01Match | null {
  const raw = demoSnapshot.matches.find((m) => m.shareToken === shareToken);
  if (!raw) return null;
  return applyDemoDates([raw])[0];
}

export function getDemoMatchStats(shareToken: string) {
  return demoSnapshot.matchStatsByToken[shareToken] ?? null;
}

export function getDemoShareTokens(): string[] {
  return demoSnapshot.shareTokens;
}

export function getDemoSitemapPaths(): string[] {
  const paths = ["/", "/demo/profile", "/login"];
  for (const token of demoSnapshot.shareTokens) {
    paths.push(`/demo/m/${token}`);
  }
  return paths;
}

export { demoShareToken };
