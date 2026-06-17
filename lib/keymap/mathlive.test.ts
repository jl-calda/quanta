import { describe, expect, it } from "vitest";
import { getKeymap } from "./keymaps";
import { mathfieldOptionsFromKeymap } from "./mathlive";

describe("mathfieldOptionsFromKeymap — Mathcad keymap", () => {
  const config = mathfieldOptionsFromKeymap(getKeymap("mathcad"));

  it("maps a single `:` to the `:=` assignment", () => {
    expect(config.inlineShortcuts[":"]).toBe(":=");
  });

  it("includes curated engineering unit shortcuts", () => {
    expect(config.inlineShortcuts.kN).toBe("\\mathrm{kN}");
    expect(config.inlineShortcuts.MPa).toBe("\\mathrm{MPa}");
  });

  it("leaves `/` and `\\` to MathLive's native fraction/root entry", () => {
    const keys = config.keybindings.map((k) => k.key);
    expect(keys).not.toContain("ctrl+/");
    expect(keys).not.toContain("ctrl+r");
  });

  it("binds Ctrl+G for Greek entry", () => {
    expect(config.keybindings.map((k) => k.key)).toContain("ctrl+g");
  });
});

describe("mathfieldOptionsFromKeymap — Default keymap", () => {
  const config = mathfieldOptionsFromKeymap(getKeymap("default"));

  it("maps the literal `:=` (not a bare colon)", () => {
    expect(config.inlineShortcuts[":="]).toBe(":=");
    expect(config.inlineShortcuts[":"]).toBeUndefined();
  });

  it("binds explicit fraction / root / Greek chords", () => {
    const keys = config.keybindings.map((k) => k.key);
    expect(keys).toContain("ctrl+/");
    expect(keys).toContain("ctrl+r");
    expect(keys).toContain("ctrl+g");
  });

  it("still carries the unit shortcuts", () => {
    expect(config.inlineShortcuts.mm).toBe("\\mathrm{mm}");
  });
});
