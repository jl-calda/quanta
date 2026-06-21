import { describe, expect, it } from "vitest";
import { evaluate } from "../evaluate";

const val = (src: string): unknown => {
  const r = evaluate(src);
  expect(r.ok, r.ok ? "" : r.error.message).toBe(true);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

describe("text family — extraction & casing", () => {
  it("LEN / LEFT / RIGHT / MID slice text", () => {
    expect(val('LEN("hello")')).toBe(5);
    expect(val('LEFT("hello", 2)')).toBe("he");
    expect(val('RIGHT("hello", 2)')).toBe("lo");
    expect(val('MID("hello", 2, 3)')).toBe("ell");
  });

  it("UPPER / LOWER / PROPER / TRIM normalise text", () => {
    expect(val('UPPER("abc")')).toBe("ABC");
    expect(val('LOWER("ABC")')).toBe("abc");
    expect(val('PROPER("hello world")')).toBe("Hello World");
    expect(val('TRIM("  a   b  ")')).toBe("a b");
  });

  it("coerces non-text arguments to text", () => {
    expect(val("LEN(12345)")).toBe(5);
  });
});

describe("text family — search & build", () => {
  it("SUBSTITUTE replaces all or the nth occurrence", () => {
    expect(val('SUBSTITUTE("a-b-c", "-", "+")')).toBe("a+b+c");
    expect(val('SUBSTITUTE("a-b-c", "-", "+", 2)')).toBe("a-b+c");
  });

  it("FIND is case-sensitive, SEARCH is not; both are 1-based", () => {
    expect(val('FIND("b", "abc")')).toBe(2);
    expect(val('SEARCH("B", "abc")')).toBe(2);
    const r = evaluate('FIND("B", "abc")');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("no-solution");
  });

  it("CONCAT / TEXTJOIN / REPT / VALUE build and parse", () => {
    expect(val('CONCAT("a", "b", "c")')).toBe("abc");
    expect(val('TEXTJOIN("-", true, "a", "", "c")')).toBe("a-c");
    expect(val('TEXTJOIN("-", false, "a", "", "c")')).toBe("a--c");
    expect(val('REPT("ab", 3)')).toBe("ababab");
    expect(val('VALUE("42")')).toBe(42);
  });
});
