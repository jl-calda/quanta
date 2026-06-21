import { describe, expect, it } from "vitest";
import { evaluate } from "../evaluate";

const val = (src: string): unknown => {
  const r = evaluate(src);
  expect(r.ok, r.ok ? "" : r.error.message).toBe(true);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

describe("date family — construction & parts", () => {
  it("DATE builds the Excel-style serial; parts read back", () => {
    expect(val("DATE(2024, 1, 1)")).toBe(45292);
    expect(val("YEAR(DATE(2024, 3, 15))")).toBe(2024);
    expect(val("MONTH(DATE(2024, 3, 15))")).toBe(3);
    expect(val("DAY(DATE(2024, 3, 15))")).toBe(15);
  });

  it("WEEKDAY honours the return-type flag", () => {
    expect(val("WEEKDAY(DATE(2024, 1, 1))")).toBe(2); // Mon, Sun=1 scheme
    expect(val("WEEKDAY(DATE(2024, 1, 1), 2)")).toBe(1); // Mon=1 scheme
    expect(val("WEEKDAY(DATE(2024, 1, 1), 3)")).toBe(0); // Mon=0 scheme
  });
});

describe("date family — arithmetic", () => {
  it("DAYS / DATEDIF measure spans", () => {
    expect(val("DAYS(DATE(2024, 1, 10), DATE(2024, 1, 1))")).toBe(9);
    expect(val('DATEDIF(DATE(2024, 1, 1), DATE(2025, 3, 1), "M")')).toBe(14);
    expect(val('DATEDIF(DATE(2024, 1, 1), DATE(2026, 6, 1), "Y")')).toBe(2);
  });

  it("EDATE / EOMONTH shift by months and clamp the day", () => {
    expect(val("DAY(EDATE(DATE(2024, 1, 31), 1))")).toBe(29); // Feb 2024 (leap) clamp
    expect(val("DAY(EOMONTH(DATE(2024, 2, 10), 0))")).toBe(29);
    expect(val("MONTH(EOMONTH(DATE(2024, 1, 15), 1))")).toBe(2);
  });

  it("DATEVALUE parses an ISO date back to its serial", () => {
    expect(val('DATEVALUE("2024-01-01")')).toBe(45292);
    const r = evaluate('DATEVALUE("nope")');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("domain");
  });
});
