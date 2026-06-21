import { describe, expect, it } from "vitest";
import {
  parseCriteria,
  matchCriteria,
  toSerial,
  fromSerial,
  addMonths,
  lastDayOfMonth,
  flattenValues,
  truthy,
  asText,
} from "./shared";

describe("criteria parsing", () => {
  it("splits an operator from its comparand", () => {
    expect(parseCriteria(">5")).toEqual({ op: ">", operand: 5 });
    expect(parseCriteria(">=3.5")).toEqual({ op: ">=", operand: 3.5 });
    expect(parseCriteria("<>2")).toEqual({ op: "<>", operand: 2 });
    expect(parseCriteria("foo")).toEqual({ op: "=", operand: "foo" });
    expect(parseCriteria(7)).toEqual({ op: "=", operand: 7 });
  });

  it("matches numeric and text criteria", () => {
    expect(matchCriteria(6, parseCriteria(">5"))).toBe(true);
    expect(matchCriteria(5, parseCriteria(">5"))).toBe(false);
    expect(matchCriteria("A", parseCriteria("a"))).toBe(true); // case-insensitive
    expect(matchCriteria("b", parseCriteria("<>a"))).toBe(true);
  });
});

describe("serial-date core (pure, UTC)", () => {
  it("round-trips a calendar date", () => {
    expect(toSerial(2024, 1, 1)).toBe(45292);
    const p = fromSerial(45292);
    expect([p.year, p.month, p.day]).toEqual([2024, 1, 1]);
    expect(p.dow).toBe(1); // Monday
  });

  it("clamps the day when shifting into a shorter month", () => {
    // Jan 31 + 1 month → Feb 29 (2024 is a leap year)
    expect(fromSerial(addMonths(toSerial(2024, 1, 31), 1)).day).toBe(29);
    expect(lastDayOfMonth(2023, 2)).toBe(28);
    expect(lastDayOfMonth(2024, 2)).toBe(29);
  });

  it("is deterministic — no clock read", () => {
    expect(toSerial(2000, 6, 15)).toBe(toSerial(2000, 6, 15));
  });
});

describe("coercion helpers", () => {
  it("flattenValues flattens nested arrays", () => {
    expect(flattenValues([1, [2, [3, 4]], 5])).toEqual([1, 2, 3, 4, 5]);
  });

  it("truthy and asText coerce as expected", () => {
    expect(truthy(0)).toBe(false);
    expect(truthy(3)).toBe(true);
    expect(truthy("")).toBe(false);
    expect(asText(42)).toBe("42");
    expect(asText(true)).toBe("true");
  });
});
