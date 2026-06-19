import { describe, expect, it } from "vitest";
import { formatValue } from "@/lib/calc";
import {
  applyConditionalRules,
  applyResultFormat,
  previewResult,
} from "./formatting";
import { findRegion } from "./flatten";
import { singleColumnRow, type CondRule, type WorksheetContent } from "./content";

function sheet(): WorksheetContent {
  return {
    version: 1,
    rows: [
      singleColumnRow([
        { id: "m1", indent: 0, type: "math", source: "a := 3.14159" },
        { id: "m2", indent: 0, type: "math", source: "b := 2.71828" },
        { id: "t1", indent: 0, type: "text", text: "note" },
      ]),
    ],
  };
}

describe("applyResultFormat", () => {
  it("region scope writes only the named region", () => {
    const next = applyResultFormat(sheet(), "region", { decimals: 2 }, "m1");
    expect(findRegion(next, "m1")).toMatchObject({ format: { decimals: 2 } });
    expect((findRegion(next, "m2") as { format?: unknown }).format).toBeUndefined();
  });

  it("worksheet scope writes every math region, not text", () => {
    const next = applyResultFormat(sheet(), "worksheet", { sigfigs: 4 });
    expect(findRegion(next, "m1")).toMatchObject({ format: { sigfigs: 4 } });
    expect(findRegion(next, "m2")).toMatchObject({ format: { sigfigs: 4 } });
    expect("format" in (findRegion(next, "t1") as object)).toBe(false);
  });

  it("preview equals the committed output (same renderer)", () => {
    const fmt = { decimals: 2 } as const;
    const preview = previewResult(3.14159, fmt);
    const next = applyResultFormat(sheet(), "region", fmt, "m1");
    const region = findRegion(next, "m1") as { format?: typeof fmt };
    // What the canvas renders after commit == what the dialog previewed.
    expect(formatValue(3.14159, region.format)).toBe(preview);
    expect(preview).toBe("3.14");
  });
});

describe("applyConditionalRules", () => {
  const rules: CondRule[] = [{ op: ">", value: 1, style: { label: "FAIL", color: "red" } }];

  it("region scope sets rules; empty clears them", () => {
    const set = applyConditionalRules(sheet(), "region", rules, "m1");
    expect((findRegion(set, "m1") as { conditional?: unknown }).conditional).toHaveLength(1);
    const cleared = applyConditionalRules(set, "region", [], "m1");
    expect((findRegion(cleared, "m1") as { conditional?: unknown }).conditional).toBeUndefined();
  });

  it("worksheet scope sets rules on every math region", () => {
    const set = applyConditionalRules(sheet(), "worksheet", rules);
    expect((findRegion(set, "m1") as { conditional?: unknown }).conditional).toHaveLength(1);
    expect((findRegion(set, "m2") as { conditional?: unknown }).conditional).toHaveLength(1);
  });
});
