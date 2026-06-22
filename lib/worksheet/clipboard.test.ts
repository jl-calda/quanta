import { describe, expect, it } from "vitest";
import type { Region } from "./content";
import {
  CLIPBOARD_KIND,
  CLIPBOARD_VERSION,
  parseRegions,
  reidRegions,
  serializeRegions,
} from "./clipboard";

const math: Region = { id: "A", type: "math", indent: 0, source: "a := 1" };
const text: Region = { id: "B", type: "text", indent: 0, text: "Note" };
const area: Region = {
  id: "AR",
  type: "area",
  indent: 0,
  title: "Group",
  collapsed: false,
  regions: [
    { id: "X", type: "math", indent: 0, source: "x := 2" },
    { id: "Y", type: "text", indent: 1, text: "inner" },
  ],
};

describe("serializeRegions / parseRegions", () => {
  it("round-trips a mixed list including a nested area", () => {
    const regions = [math, text, area];
    const parsed = parseRegions(serializeRegions(regions));
    expect(parsed).toEqual(regions);
  });

  it("preserves ids at this layer (re-id happens on paste, not serialize)", () => {
    const parsed = parseRegions(serializeRegions([math]));
    expect(parsed?.[0].id).toBe("A");
  });

  it("does not mutate the source regions when serializing", () => {
    const original = structuredClone(area);
    serializeRegions([area]);
    expect(area).toEqual(original);
  });

  it("rejects non-JSON text", () => {
    expect(parseRegions("hello")).toBeNull();
    expect(parseRegions("")).toBeNull();
  });

  it("rejects a table's TSV/CSV clipboard text", () => {
    expect(parseRegions("a\tb\nc\td")).toBeNull();
    expect(parseRegions("a,b\nc,d")).toBeNull();
  });

  it("rejects a JSON object that isn't our envelope", () => {
    expect(parseRegions("{}")).toBeNull();
    expect(parseRegions(JSON.stringify({ regions: [math] }))).toBeNull();
  });

  it("rejects a wrong kind or version", () => {
    expect(
      parseRegions(JSON.stringify({ kind: "other", version: 1, regions: [math] })),
    ).toBeNull();
    expect(
      parseRegions(JSON.stringify({ kind: CLIPBOARD_KIND, version: 2, regions: [math] })),
    ).toBeNull();
  });

  it("rejects an envelope containing a region with an unknown type", () => {
    const bad = JSON.stringify({
      kind: CLIPBOARD_KIND,
      version: CLIPBOARD_VERSION,
      regions: [{ id: "Z", type: "bogus", indent: 0 }],
    });
    expect(parseRegions(bad)).toBeNull();
  });
});

describe("reidRegions", () => {
  it("assigns fresh ids to every region and nested area child", () => {
    const [m, t, a] = reidRegions([math, text, area]);
    expect(m.id).not.toBe("A");
    expect(t.id).not.toBe("B");
    expect(a.id).not.toBe("AR");
    if (a.type === "area") {
      expect(a.regions.map((r) => r.id)).not.toContain("X");
      expect(a.regions.map((r) => r.id)).not.toContain("Y");
    }
  });

  it("clones — the source regions keep their ids", () => {
    reidRegions([math, area]);
    expect(math.id).toBe("A");
    if (area.type === "area") expect(area.regions[0].id).toBe("X");
  });

  it("preserves non-id fields", () => {
    const [m] = reidRegions([math]);
    expect(m.type).toBe("math");
    expect((m as { source: string }).source).toBe("a := 1");
  });
});
