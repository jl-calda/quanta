import { describe, expect, it } from "vitest";
import { getKeymap, keymaps } from "./keymaps";
import { detectPlatform, formatKeyToken, formatKeys, groupBindings } from "./display";

describe("keymaps — structure", () => {
  it("exposes both profiles with the Mathcad signature key", () => {
    for (const id of ["mathcad", "default"] as const) {
      const km = getKeymap(id);
      const expand = km.bindings.find((b) => b.action === "expandSelection" && b.signature);
      expect(expand, `${id} keymap should mark Space as the signature expand key`).toBeTruthy();
      expect(expand!.keys).toContain("Space");
    }
  });

  it("covers the full Mathcad math-entry set from the brief", () => {
    const actions = new Set(getKeymap("mathcad").bindings.map((b) => b.action));
    for (const a of [
      "insertAssign",
      "insertEvaluate",
      "insertFraction",
      "insertSuperscript",
      "insertSubscript",
      "insertLiteralSubscript",
      "insertIndexSubscript",
      "insertSqrt",
      "insertAbs",
      "insertGreek",
      "expandSelection",
    ]) {
      expect(actions.has(a), `missing ${a}`).toBe(true);
    }
  });

  it("wires the app accelerators the reference advertises", () => {
    const app = getKeymap("mathcad").bindings.filter((b) => b.group === "App");
    const actions = app.map((b) => b.action);
    expect(actions).toEqual(
      expect.arrayContaining(["save", "undo", "redo", "find", "commandPalette", "export", "openShortcuts"]),
    );
    // App accelerators use the platform modifier sentinel (Mod → ⌘/Ctrl).
    expect(app.find((b) => b.action === "save")!.keys).toContain("Mod");
    // `/` opens the reference — no modifier.
    expect(app.find((b) => b.action === "openShortcuts")!.keys).toEqual(["/"]);
  });

  it("keeps the two keymaps' shared (app/calc/region) bindings identical", () => {
    const shared = (id: "mathcad" | "default") =>
      keymaps[id].bindings.filter((b) => b.scope === "app").map((b) => b.action);
    expect(shared("mathcad")).toEqual(shared("default"));
  });

  it("differs only in math entry: Mathcad assigns on `:`, Default on `:=`", () => {
    expect(getKeymap("mathcad").bindings.find((b) => b.action === "insertAssign")!.chord).toBe(":");
    expect(getKeymap("default").bindings.find((b) => b.action === "insertAssign")!.chord).toBe(":=");
  });
});

describe("keymap display helpers", () => {
  it("groups bindings preserving first-seen group order", () => {
    const groups = groupBindings(getKeymap("mathcad")).map((g) => g.group);
    expect(groups).toEqual([
      "Math entry",
      "Operators & Greek",
      "Selection & navigation",
      "Regions",
      "Calculation",
      "App",
    ]);
  });

  it("renders the platform modifier as ⌘ on macOS and Ctrl elsewhere", () => {
    expect(formatKeyToken("Mod", "mac")).toBe("⌘");
    expect(formatKeyToken("Mod", "other")).toBe("Ctrl");
    expect(formatKeyToken("Shift", "other")).toBe("Shift");
  });

  it("flattens a chord into a readable, platform-aware string", () => {
    const save = getKeymap("mathcad").bindings.find((b) => b.action === "save")!;
    expect(formatKeys(save, "other")).toBe("Ctrl + S");
    expect(formatKeys(save, "mac")).toBe("⌘ + S");
  });

  it("detectPlatform is deterministic on the server (no navigator)", () => {
    expect(detectPlatform()).toBe("other");
  });
});
