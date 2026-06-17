import { describe, expect, it } from "vitest";
import { formatValue, math, toDisplayUnit, SI_SYSTEM } from "@/lib/calc";
import {
  DEFAULT_USER_PREFERENCES,
  DEFAULT_WORKSPACE_SETTINGS,
  toResultFormat,
  type FormatSettings,
} from "@/lib/settings/types";
import {
  parseUserPreferences,
  parseWorkspaceSettings,
} from "@/lib/schema/settings";

const baseFormat: FormatSettings = DEFAULT_WORKSPACE_SETTINGS.format;

function fmt(over: Partial<FormatSettings> = {}) {
  return toResultFormat({ ...baseFormat, ...over });
}

describe("toResultFormat", () => {
  it("auto sigfigs lets decimals drive (no sigfigs key)", () => {
    const r = fmt({ sigFigs: "auto", decimals: 2 });
    expect(r.decimals).toBe(2);
    expect(r.sigfigs).toBeUndefined();
  });

  it("a numeric sigfigs cap drops decimals", () => {
    const r = fmt({ sigFigs: "4", decimals: 2 });
    expect(r.sigfigs).toBe(4);
    expect(r.decimals).toBeUndefined();
  });

  it("passes notation and radix through", () => {
    expect(fmt({ notation: "sci" }).notation).toBe("sci");
    expect(fmt({ notation: "eng" }).notation).toBe("eng");
    expect(fmt({ radix: "hex" }).radix).toBe("hex");
  });

  it("zeroSnap sets a zero threshold only when on", () => {
    expect(fmt({ zeroSnap: true }).zeroThreshold).toBeGreaterThan(0);
    expect(fmt({ zeroSnap: false }).zeroThreshold).toBeUndefined();
  });

  it("derives the exponential threshold from the superscript string", () => {
    expect(fmt({ expHigh: "1.0 × 10⁶" }).expThreshold).toBe(6);
    expect(fmt({ expHigh: "1e9" }).expThreshold).toBe(9);
  });
});

describe("live preview formatting (engine-driven)", () => {
  // The Units & formatting preview converts a 52 800 N sample to the system's
  // display unit and runs the real formatter — assert the rendered string.
  function preview(over: Partial<FormatSettings> = {}) {
    const sample = math.evaluate("52800 N");
    const display = toDisplayUnit(sample, undefined, SI_SYSTEM);
    return formatValue(display, fmt(over));
  }

  it("formats the SI sample as kN with the chosen decimals", () => {
    expect(preview({ decimals: 2 })).toBe("52.8 kN");
  });

  it("keeps trailing precision under scientific notation", () => {
    expect(preview({ notation: "sci", decimals: 2 })).toMatch(/^5\.28e\+?1 kN$/);
  });
});

describe("parseWorkspaceSettings", () => {
  it("falls back to defaults for an empty jsonb object", () => {
    expect(parseWorkspaceSettings({})).toEqual(DEFAULT_WORKSPACE_SETTINGS);
  });

  it("falls back to defaults for malformed input", () => {
    expect(parseWorkspaceSettings(null)).toEqual(DEFAULT_WORKSPACE_SETTINGS);
    expect(parseWorkspaceSettings("nope")).toEqual(DEFAULT_WORKSPACE_SETTINGS);
  });

  it("merges a partial row over the defaults", () => {
    const merged = parseWorkspaceSettings({ calcMode: "manual" });
    expect(merged.calcMode).toBe("manual");
    expect(merged.unitSystem).toBe("si");
    expect(merged.format.decimals).toBe(2);
  });

  it("round-trips a fully-valid row", () => {
    const custom = {
      ...DEFAULT_WORKSPACE_SETTINGS,
      calcMode: "manual" as const,
      unitSystem: "uscs" as const,
    };
    expect(parseWorkspaceSettings(custom)).toEqual(custom);
  });
});

describe("parseUserPreferences", () => {
  it("falls back to defaults for an empty object", () => {
    expect(parseUserPreferences({})).toEqual(DEFAULT_USER_PREFERENCES);
  });

  it("merges a partial preference set", () => {
    const merged = parseUserPreferences({ keymap: "default" });
    expect(merged.keymap).toBe("default");
    expect(merged.theme).toBe("light");
  });
});
