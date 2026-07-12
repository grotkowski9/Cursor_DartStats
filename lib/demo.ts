import type { N01Match } from "@/lib/n01-parser";
import type { CustomerProfile } from "@/lib/customer";
import { DEMO_PERSONA, demoShareToken, type DemoPersona } from "@/demo/demo-persona";
import demoMatchesJson from "@/demo/demo-matches.json";

const demoMatches = demoMatchesJson as N01Match[];

export function getDemoPersona(): DemoPersona {
  return DEMO_PERSONA;
}

export function personaToCustomer(persona: DemoPersona = DEMO_PERSONA): CustomerProfile {
  return {
    customerId: "demo",
    firstName: persona.firstName,
    lastName: persona.lastName,
    nickname: persona.nickname,
    displayName: `${persona.lastName} ${persona.firstName}`,
    knownNicknames: persona.knownNicknames,
  };
}

export function getDemoMatches(): N01Match[] {
  return demoMatches;
}

export function getDemoMatchByShareToken(shareToken: string): N01Match | null {
  return demoMatches.find((m) => m.shareToken === shareToken) ?? null;
}

export function getDemoShareTokens(): string[] {
  return demoMatches.map((m) => m.shareToken);
}

export function getDemoSitemapPaths(): string[] {
  const paths = ["/", "/demo/profile", "/login"];
  for (const token of getDemoShareTokens()) {
    paths.push(`/demo/m/${token}`);
  }
  return paths;
}

export { demoShareToken };
