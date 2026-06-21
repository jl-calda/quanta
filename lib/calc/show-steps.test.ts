import { describe, expect, it } from "vitest";
import { buildSubstitutedTex } from "./show-steps";
import { math } from "./math";

describe("buildSubstitutedTex", () => {
  it("replaces leaf variables with their values", () => {
    const tex = buildSubstitutedTex(
      math.parse("a + b"),
      new Map<string, unknown>([
        ["a", 12],
        ["b", 3],
      ]),
    );
    expect(tex).toContain("12");
    expect(tex).toContain("3");
  });

  it("keeps units in substituted values", () => {
    const tex = buildSubstitutedTex(
      math.parse("F_t / 2"),
      new Map<string, unknown>([["F_t", math.evaluate("12 kN")]]),
    );
    expect(tex).toContain("12");
    expect(tex).toContain("kN");
  });

  it("leaves out-of-scope variables untouched", () => {
    const tex = buildSubstitutedTex(math.parse("a + c"), new Map([["a", 1]]));
    expect(tex).toContain("c");
  });
});
