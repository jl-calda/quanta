import { describe, expect, it } from "vitest";
import { evaluate } from "../evaluate";
import {
  ALL,
  TREE,
  GROUP_OF_CAT,
  resolveRelated,
  categoryLabel,
  categoryCount,
} from "./tree";
import { searchItems, itemsInCategory, highlightMatch } from "./search";
import { runExample } from "./examples";
import type { RefGroup } from "./types";

describe("catalog integrity", () => {
  it("has unique ids across the whole catalog", () => {
    const ids = ALL.map((it) => it.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("places every item in a real category whose group matches its kind", () => {
    const kindGroup: Record<string, RefGroup> = {
      function: "FUNCTIONS",
      unit: "UNITS",
      constant: "CONSTANTS",
    };
    for (const it of ALL) {
      const group = GROUP_OF_CAT[it.cat];
      expect(group, `category "${it.cat}" of ${it.id} is in the tree`).toBeDefined();
      expect(group).toBe(kindGroup[it.kind]);
      expect(categoryLabel(it.cat)).not.toBe("");
    }
  });

  it("resolves every related token to a real item", () => {
    for (const it of ALL) {
      for (const token of it.related) {
        expect(resolveRelated(token), `${it.id} → related "${token}"`).toBeDefined();
      }
    }
  });

  it("has at least one item in every tree category", () => {
    for (const subs of Object.values(TREE)) {
      for (const sub of subs) {
        expect(categoryCount(sub.id), `category "${sub.id}"`).toBeGreaterThan(0);
      }
    }
  });
});

describe("worked examples run live (anti-drift)", () => {
  const withExample = ALL.filter((it) => it.example);

  it("covers a meaningful set of items", () => {
    expect(withExample.length).toBeGreaterThanOrEqual(6);
  });

  it("evaluates every example cleanly with a non-empty result", () => {
    for (const it of withExample) {
      const run = runExample(it.example!);
      expect(run.ok, `${it.id}: ${run.error ?? ""}`).toBe(true);
      const result = run.lines[run.lines.length - 1];
      expect(result.status).toBe("current");
      expect(result.formatted.length).toBeGreaterThan(0);
    }
  });

  it("pins known results so a regression would surface", () => {
    const pin = (id: string) => {
      const it = ALL.find((x) => x.id === id)!;
      const run = runExample(it.example!);
      return run.lines[run.lines.length - 1].formatted;
    };
    expect(pin("sqrt")).toBe("12.53 mm");
    expect(pin("mean")).toBe("12.85 kN");
    expect(pin("max")).toBe("0.85");
    expect(pin("interp")).toBe("0.90 kPa");
    expect(pin("g0")).toBe("735.5 N");
  });
});

describe("search & filter", () => {
  it("finds interp by name, case-insensitively, and across fields", () => {
    expect(searchItems("interp").some((it) => it.id === "interp")).toBe(true);
    expect(searchItems("INTERP").some((it) => it.id === "interp")).toBe(true);
    // tag match: "Pressure / stress" only appears in the tag field
    expect(searchItems("pressure").every((it) => it.kind === "unit")).toBe(true);
  });

  it("returns nothing for an empty query and filters by category", () => {
    expect(searchItems("   ")).toHaveLength(0);
    expect(itemsInCategory("lookup").every((it) => it.cat === "lookup")).toBe(true);
    expect(itemsInCategory("lookup").length).toBeGreaterThan(0);
  });

  it("splits text around the first match and passes through misses", () => {
    expect(highlightMatch("interp(vx, vy, x)", "vx")).toEqual({
      pre: "interp(",
      match: "vx",
      post: ", vy, x)",
    });
    expect(highlightMatch("mean(A)", "zzz")).toBeNull();
    expect(highlightMatch("mean(A)", "")).toBeNull();
  });
});

describe("insert payloads are engine-valid for units & constants", () => {
  it("evaluates every unit and constant insert string without a parse error", () => {
    for (const it of ALL) {
      if (it.kind === "function") continue;
      const res = evaluate(it.insert);
      expect(res.ok, `${it.id} inserts "${it.insert}"`).toBe(true);
    }
  });
});
