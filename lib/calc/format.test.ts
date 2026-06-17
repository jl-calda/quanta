import { describe, expect, it } from "vitest";
import { formatValue } from "./format";
import { math } from "./math";

describe("formatValue — numbers", () => {
  it("honors a fixed number of decimals", () => {
    expect(formatValue(3.14159, { decimals: 2 })).toBe("3.14");
  });

  it("honors significant figures in decimal notation", () => {
    expect(formatValue(123.456, { notation: "decimal", sigfigs: 4 })).toBe("123.5");
  });

  it("renders scientific notation", () => {
    expect(formatValue(0.0001234, { notation: "sci", sigfigs: 3 })).toBe("1.23e-4");
  });

  it("renders engineering notation with an exponent multiple of 3", () => {
    expect(formatValue(12345, { notation: "eng", sigfigs: 5 })).toBe("12.345e+3");
  });

  it("keeps trailing zeros only when asked", () => {
    expect(formatValue(1.5, { decimals: 3 })).toBe("1.5");
    expect(formatValue(1.5, { decimals: 3, trailingZeros: true })).toBe("1.500");
  });

  it("groups thousands", () => {
    expect(
      formatValue(1234567, { notation: "decimal", decimals: 0, thousands: true }),
    ).toBe("1,234,567");
  });

  it("clamps tiny magnitudes to zero via zeroThreshold", () => {
    expect(formatValue(1e-12, { decimals: 2, zeroThreshold: 1e-9 })).toBe("0");
  });

  it("renders rationals as fractions", () => {
    expect(formatValue(0.75, { fraction: true })).toBe("3/4");
  });
});

describe("formatValue — radix", () => {
  it("renders hex / binary / octal for integers", () => {
    expect(formatValue(255, { radix: "hex" })).toBe("0xff");
    expect(formatValue(5, { radix: "bin" })).toBe("0b101");
    expect(formatValue(8, { radix: "oct" })).toBe("0o10");
  });

  it("rejects a non-integer radix as a domain error", () => {
    expect(() => formatValue(3.5, { radix: "hex" })).toThrow();
  });
});

describe("formatValue — units", () => {
  it("carries the unit label", () => {
    expect(formatValue(math.evaluate("82.425 kN"), { decimals: 1 })).toBe("82.4 kN");
  });

  it("prettifies compound units", () => {
    const moment = math.evaluate("5 kN * 3 m").to("kN m");
    expect(formatValue(moment, { decimals: 0 })).toBe("15 kN·m");
  });
});
