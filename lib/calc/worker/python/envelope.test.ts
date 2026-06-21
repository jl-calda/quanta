import { describe, expect, it } from "vitest";
import {
  PyBackendError,
  parseEnvelope,
  pyStr,
  wrapEnvelope,
} from "./envelope";

describe("pyStr", () => {
  it("produces a valid double-quoted Python literal", () => {
    expect(pyStr("x + 1")).toBe('"x + 1"');
  });
  it("escapes quotes, backslashes, and newlines", () => {
    expect(pyStr('a"b\\c\n')).toBe('"a\\"b\\\\c\\n"');
  });
});

describe("wrapEnvelope", () => {
  it("wraps the body in a function + try/except and ends in the envelope expr", () => {
    const code = wrapEnvelope("return str(1 + 1)");
    expect(code).toContain("def __quanta_op__():");
    expect(code).toContain("    return str(1 + 1)"); // body indented into the fn
    expect(code).toContain("except Exception as __quanta_exc:");
    expect(code.trimEnd().endsWith("__quanta_out")).toBe(true);
  });
  it("preserves relative indentation of multi-line bodies", () => {
    const code = wrapEnvelope("import numpy as np\nreturn np.array([1]).tolist()");
    expect(code).toContain("    import numpy as np");
    expect(code).toContain("    return np.array([1]).tolist()");
  });
});

describe("parseEnvelope", () => {
  it("returns the value of an ok envelope", () => {
    expect(parseEnvelope<string>('{"ok":true,"value":"2*x"}')).toBe("2*x");
    expect(parseEnvelope<number[]>('{"ok":true,"value":[0.8,1.4]}')).toEqual([
      0.8, 1.4,
    ]);
  });
  it("throws a typed PyBackendError on an error envelope", () => {
    let thrown: unknown;
    try {
      parseEnvelope('{"ok":false,"error":{"kind":"ValueError","message":"bad"}}');
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(PyBackendError);
    expect((thrown as PyBackendError).kind).toBe("ValueError");
    expect((thrown as PyBackendError).message).toBe("bad");
  });
  it("rejects non-string and malformed payloads", () => {
    expect(() => parseEnvelope(42)).toThrow(/expected a JSON envelope/);
    expect(() => parseEnvelope("not json")).toThrow(/malformed JSON/);
  });
});
