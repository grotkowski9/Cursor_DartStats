import { describe, expect, it } from "vitest";
import {
  SUPPORTED_START_SCORE,
  unsupportedStartScoreMessage,
} from "@/lib/constants";

describe("501-only start score policy", () => {
  it("supports only 501", () => {
    expect(SUPPORTED_START_SCORE).toBe(501);
  });

  it("explains why non-501 is rejected", () => {
    const msg = unsupportedStartScoreMessage(301);
    expect(msg).toContain("501");
    expect(msg).toContain("301");
    expect(msg).toMatch(/zaburza/i);
    expect(msg).toMatch(/przyszło[sś]ci/i);
  });
});
