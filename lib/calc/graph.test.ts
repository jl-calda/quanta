import { describe, expect, it } from "vitest";
import { analyzeDependencies, type RegionNode } from "./graph";

const node = (index: number, name: string | null, deps: string[]): RegionNode => ({
  index,
  name,
  deps,
});

describe("analyzeDependencies", () => {
  it("orders regions so dependencies come first", () => {
    // Defined out of dependency order, but in valid reading order.
    const { order, cycles } = analyzeDependencies([
      node(0, "a", []),
      node(1, "b", ["a"]),
      node(2, "c", ["a", "b"]),
    ]);
    expect(cycles).toEqual([]);
    expect(order).toEqual([0, 1, 2]);
  });

  it("breaks ties by reading order for determinism", () => {
    const { order } = analyzeDependencies([
      node(0, "a", []),
      node(1, "b", []),
      node(2, "c", ["a", "b"]),
    ]);
    expect(order).toEqual([0, 1, 2]);
  });

  it("detects a two-node cycle and names it", () => {
    const { cycles, cyclic } = analyzeDependencies([
      node(0, "a", ["b"]),
      node(1, "b", ["a"]),
    ]);
    expect(cyclic.has(0)).toBe(true);
    expect(cyclic.has(1)).toBe(true);
    expect(cycles).toHaveLength(1);
    expect(cycles[0].sort()).toEqual(["a", "b"]);
  });

  it("detects a self-reference as a cycle", () => {
    const { cycles, cyclic } = analyzeDependencies([node(0, "a", ["a"])]);
    expect(cyclic.has(0)).toBe(true);
    expect(cycles[0]).toEqual(["a"]);
  });

  it("resolves a backward reference as ok", () => {
    const { resolved } = analyzeDependencies([
      node(0, "a", []),
      node(1, "b", ["a"]),
    ]);
    expect(resolved.get(1)).toEqual([{ name: "a", status: "ok", target: 0 }]);
  });

  it("flags a forward reference as defined-later", () => {
    const { resolved } = analyzeDependencies([
      node(0, "b", ["a"]),
      node(1, "a", []),
    ]);
    expect(resolved.get(0)![0]).toMatchObject({ name: "a", status: "later" });
  });

  it("marks a never-defined name unresolved", () => {
    const { resolved } = analyzeDependencies([node(0, "b", ["x"])]);
    expect(resolved.get(0)![0]).toMatchObject({ name: "x", status: "unresolved" });
  });

  it("resolves redefinition to the nearest earlier definition", () => {
    const { resolved } = analyzeDependencies([
      node(0, "x", []),
      node(1, "y", ["x"]),
      node(2, "x", ["x"]), // x := f(previous x) — refers back to region 0
    ]);
    expect(resolved.get(1)![0].target).toBe(0);
    expect(resolved.get(2)![0].target).toBe(0);
  });
});
