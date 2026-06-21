import { describe, expect, it } from "vitest";
import { regionDomId, scrollToRegion } from "./scroll-to-region";

describe("regionDomId", () => {
  it("namespaces the region id", () => {
    expect(regionDomId("abc")).toBe("region-abc");
  });
});

describe("scrollToRegion", () => {
  it("is a safe no-op when there is no DOM (node env)", () => {
    expect(() => scrollToRegion("missing")).not.toThrow();
  });
});
