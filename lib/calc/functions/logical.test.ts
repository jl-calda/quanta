import { describe, expect, it } from "vitest";
import { evaluate } from "../evaluate";

const val = (src: string): unknown => {
  const r = evaluate(src);
  expect(r.ok, r.ok ? "" : r.error.message).toBe(true);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

describe("logical family — conditionals", () => {
  it("IF selects the taken branch", () => {
    expect(val("IF(3 > 2, 10, 20)")).toBe(10);
    expect(val("IF(3 < 2, 10, 20)")).toBe(20);
    expect(val("IF(2 > 3, 10)")).toBe(false); // no else → false
  });

  it("IF does NOT evaluate the untaken branch (laziness)", () => {
    // The else-branch would throw (undefined name); laziness must avoid it.
    expect(val("IF(true, 1, nope)")).toBe(1);
  });

  it("IFS returns the first true case, errors when none hold", () => {
    expect(val("IFS(false, 1, true, 2)")).toBe(2);
    const r = evaluate("IFS(false, 1, false, 2)");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("no-solution");
  });

  it("SWITCH matches a case or falls back to a trailing default", () => {
    expect(val('SWITCH(2, 1, "a", 2, "b", "z")')).toBe("b");
    expect(val('SWITCH(9, 1, "a", 2, "b", "z")')).toBe("z");
  });
});

describe("logical family — error trapping (raw-args)", () => {
  it("IFERROR recovers from a THROW in the value (e.g. a unit mismatch)", () => {
    expect(val("IFERROR(1 m + 1 s, -1)")).toBe(-1);
    expect(val("IFERROR(2 + 2, -1)")).toBe(4); // no error → the value
  });

  it("IFERROR recovers from an undefined name", () => {
    expect(val('IFERROR(missing, "n/a")')).toBe("n/a");
  });
});

describe("logical family — boolean reducers", () => {
  it("AND / OR / NOT / XOR combine truthiness", () => {
    expect(val("AND(true, 1, 2)")).toBe(true);
    expect(val("AND(true, 0)")).toBe(false);
    expect(val("OR(false, 0, 3)")).toBe(true);
    expect(val("NOT(false)")).toBe(true);
    expect(val("XOR(true, true, true)")).toBe(true); // odd count
    expect(val("XOR(true, true)")).toBe(false); // even count
  });
});
