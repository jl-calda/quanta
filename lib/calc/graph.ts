/**
 * Dependency analysis: reading-order resolution → edges → cycles → topo order.
 *
 * Each region may reference names defined by other regions. A name must be
 * defined *earlier* in reading order than its use (Functional Brief §2.1), so we
 * resolve every dependency to the nearest preceding definition. References that
 * only resolve forward are `defined-later`; references with no definition are
 * left for the evaluator (they may be a mathjs constant, else `undefined`).
 *
 * On the resulting graph we detect cycles (Tarjan SCC → "a → b → a") and
 * topologically sort the rest with a stable, reading-order tie-break so results
 * are deterministic across client, worker, and Node.
 */

export interface RegionNode {
  index: number;
  name: string | null;
  deps: string[];
}

export type DepStatus = "ok" | "later" | "unresolved";

export interface ResolvedDep {
  name: string;
  status: DepStatus;
  /** Index of the resolved defining region (for `ok`/`later`), else -1. */
  target: number;
}

export interface DepAnalysis {
  /** Evaluation order (region indices); excludes regions inside a cycle. */
  order: number[];
  /** Each detected cycle as the names that form it, e.g. `["a", "b"]`. */
  cycles: string[][];
  /** Region indices that participate in some cycle. */
  cyclic: Set<number>;
  /** Per-region resolved dependencies. */
  resolved: Map<number, ResolvedDep[]>;
}

export function analyzeDependencies(nodes: RegionNode[]): DepAnalysis {
  // name → sorted indices of regions defining it (supports redefinition).
  const defs = new Map<string, number[]>();
  for (const node of nodes) {
    if (node.name) {
      const list = defs.get(node.name) ?? [];
      list.push(node.index);
      defs.set(node.name, list);
    }
  }

  const resolved = new Map<number, ResolvedDep[]>();
  // Forward adjacency: region index → set of region indices it depends on.
  const edges = new Map<number, Set<number>>();
  for (const node of nodes) edges.set(node.index, new Set());

  for (const node of nodes) {
    const list: ResolvedDep[] = [];
    for (const dep of node.deps) {
      const where = defs.get(dep);
      if (!where) {
        list.push({ name: dep, status: "unresolved", target: -1 });
        continue;
      }
      const earlier = lastBefore(where, node.index);
      if (earlier !== -1) {
        list.push({ name: dep, status: "ok", target: earlier });
        edges.get(node.index)!.add(earlier);
      } else if (where.includes(node.index)) {
        // Self-reference with no prior definition — a one-node cycle.
        list.push({ name: dep, status: "later", target: node.index });
        edges.get(node.index)!.add(node.index);
      } else {
        const later = where[0];
        list.push({ name: dep, status: "later", target: later });
        edges.get(node.index)!.add(later);
      }
    }
    resolved.set(node.index, list);
  }

  const { cycles, cyclic } = findCycles(nodes, edges, defs);
  const order = topoSort(nodes, edges, cyclic);
  return { order, cycles, cyclic, resolved };
}

/** Largest value in the sorted array strictly less than `i`, or -1. */
function lastBefore(sorted: number[], i: number): number {
  let best = -1;
  for (const v of sorted) {
    if (v < i) best = v;
    else break;
  }
  return best;
}

/**
 * Tarjan's strongly-connected-components. Any SCC with more than one node, or a
 * single node with a self-edge, is a cycle. Returns cycles as the names that
 * define those regions, in reading order.
 */
function findCycles(
  nodes: RegionNode[],
  edges: Map<number, Set<number>>,
  defs: Map<string, number[]>,
): { cycles: string[][]; cyclic: Set<number> } {
  const indexOf = new Map<number, number>();
  const low = new Map<number, number>();
  const onStack = new Set<number>();
  const stack: number[] = [];
  let counter = 0;
  const cycles: string[][] = [];
  const cyclic = new Set<number>();

  const nameAt = (i: number): string =>
    nodes.find((n) => n.index === i)?.name ?? `region ${i}`;

  const strongConnect = (v: number): void => {
    indexOf.set(v, counter);
    low.set(v, counter);
    counter += 1;
    stack.push(v);
    onStack.add(v);

    for (const w of edges.get(v) ?? []) {
      if (!indexOf.has(w)) {
        strongConnect(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, indexOf.get(w)!));
      }
    }

    if (low.get(v) === indexOf.get(v)) {
      const component: number[] = [];
      let w: number;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        component.push(w);
      } while (w !== v);

      const selfLoop = component.length === 1 && edges.get(v)!.has(v);
      if (component.length > 1 || selfLoop) {
        component.sort((a, b) => a - b);
        for (const i of component) cyclic.add(i);
        cycles.push(component.map(nameAt));
      }
    }
  };

  // Visit in reading order for deterministic component/cycle ordering.
  for (const node of [...nodes].sort((a, b) => a.index - b.index)) {
    if (!indexOf.has(node.index)) strongConnect(node.index);
  }
  void defs;
  return { cycles, cyclic };
}

/**
 * Kahn topological sort over the dependency edges, excluding cyclic nodes.
 * Ties are broken by reading-order index, so the evaluation order — and thus
 * every result — is deterministic.
 */
function topoSort(
  nodes: RegionNode[],
  edges: Map<number, Set<number>>,
  cyclic: Set<number>,
): number[] {
  const live = nodes
    .map((n) => n.index)
    .filter((i) => !cyclic.has(i))
    .sort((a, b) => a - b);
  const liveSet = new Set(live);

  // outDegree = number of (live) dependencies still unresolved.
  const remaining = new Map<number, Set<number>>();
  const dependents = new Map<number, number[]>();
  for (const i of live) {
    const deps = new Set(
      [...(edges.get(i) ?? [])].filter((d) => liveSet.has(d) && d !== i),
    );
    remaining.set(i, deps);
    for (const d of deps) {
      const arr = dependents.get(d) ?? [];
      arr.push(i);
      dependents.set(d, arr);
    }
  }

  // Ready = no remaining dependencies; min-heap by index via a sorted array.
  const ready = live.filter((i) => remaining.get(i)!.size === 0);
  ready.sort((a, b) => a - b);
  const order: number[] = [];

  while (ready.length > 0) {
    const i = ready.shift()!;
    order.push(i);
    for (const dep of dependents.get(i) ?? []) {
      const rem = remaining.get(dep)!;
      rem.delete(i);
      if (rem.size === 0) insertSorted(ready, dep);
    }
  }
  return order;
}

function insertSorted(arr: number[], value: number): void {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  arr.splice(lo, 0, value);
}
