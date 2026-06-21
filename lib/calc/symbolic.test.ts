import { describe, expect, it } from "vitest";
import { isSymbolic } from "./symbolic";

describe("isSymbolic", () => {
  it("flags CAS function calls (the symbolic-evaluate operators)", () => {
    expect(isSymbolic("diff(x^2, x)")).toBe(true);
    expect(isSymbolic("integrate(x, x)")).toBe(true);
    expect(isSymbolic("simplify((x+1)^2 - x^2)")).toBe(true);
    expect(isSymbolic("solve(x^2 - 4, x)")).toBe(true);
    expect(isSymbolic("factor(x^2 - 1)")).toBe(true);
    expect(isSymbolic("series(sin(x), x)")).toBe(true);
    expect(isSymbolic("limit(sin(x)/x, x, 0)")).toBe(true);
    // substitute joins the set so the producer + export consumer agree on it.
    expect(isSymbolic("substitute(x^2, x, 3)")).toBe(true);
  });

  it("flags symbolic regions through a name := prefix", () => {
    expect(isSymbolic("g := diff(x^2, x)")).toBe(true);
  });

  it("leaves the numeric path untouched", () => {
    expect(isSymbolic("2 + 2")).toBe(false);
    expect(isSymbolic("N_Rd := 0.75 * A_s * f_ub")).toBe(false);
    expect(isSymbolic("sin(x) + cos(x)")).toBe(false);
    expect(isSymbolic("")).toBe(false);
    // A variable merely spelled like a CAS name is not a call — stays numeric.
    expect(isSymbolic("simplify + 1")).toBe(false);
  });
});
