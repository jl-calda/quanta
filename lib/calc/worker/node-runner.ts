/**
 * Node PythonRunner — loads Pyodide (SymPy / NumPy / SciPy) in-process.
 *
 * This is the server-side / Node-script counterpart to the browser Web Worker.
 * It runs Python on the same Pyodide runtime so symbolic + heavy-numeric results
 * match the client and stay deterministic during server-side work.
 *
 * NODE ONLY. Every Node-specific dependency (`pyodide`, `node:module`,
 * `node:path`) is loaded via dynamic `import()` so this module never gets pulled
 * into a browser bundle, and `./backend`'s factory only reaches it when
 * `typeof window === "undefined"`. `pyodide` is also listed in
 * `serverExternalPackages` (next.config.ts) so Webpack never bundles its wasm.
 *
 * Keep the runtime in lockstep with PYODIDE_VERSION in ./pyodide.worker.ts: the
 * browser loads that version from the CDN, the Node path loads the matching
 * `pyodide` npm package. They must not drift.
 */
import type { PythonRunner } from "./python-runner";

/** The slice of the Pyodide API the Node runner uses. */
interface PyodideNode {
  loadPackage(names: string | string[]): Promise<unknown>;
  loadPackagesFromImports(code: string): Promise<unknown>;
  runPythonAsync(code: string): Promise<unknown>;
}

let runtime: Promise<PyodideNode> | null = null;
const loaded = new Set<string>();

async function getRuntime(): Promise<PyodideNode> {
  if (!runtime) {
    runtime = (async () => {
      const { loadPyodide } = await import("pyodide");
      // Resolve the installed package dir explicitly and pin `indexURL` to it.
      // Pyodide's own `import.meta.url` auto-location breaks when a bundler
      // (Webpack/Vite) relocates the module, so we point it at node_modules
      // directly. `packageCacheDir` caches downloaded wheels there too, so
      // repeat runs (and tests) are offline after the first download.
      const options: { indexURL?: string; packageCacheDir?: string } = {};
      try {
        const { createRequire } = await import("node:module");
        const path = await import("node:path");
        const require = createRequire(import.meta.url);
        const pkgDir = path.dirname(require.resolve("pyodide"));
        options.indexURL = pkgDir;
        options.packageCacheDir = path.join(pkgDir, ".cache");
      } catch {
        // Fall back to Pyodide's default auto-location + cache.
      }
      const pyodide = await loadPyodide(options);
      return pyodide as unknown as PyodideNode;
    })().catch((error) => {
      // Clear the memo so a transient first-load failure isn't permanent.
      runtime = null;
      throw error;
    });
  }
  return runtime;
}

async function loadPackages(
  pyodide: PyodideNode,
  packages?: readonly string[],
): Promise<void> {
  const missing = (packages ?? []).filter((name) => !loaded.has(name));
  if (missing.length) {
    await pyodide.loadPackage([...missing]);
    for (const name of missing) loaded.add(name);
  }
}

/** Convert a possible Python proxy into a structured value (mirrors the worker). */
function toTransferable(value: unknown): unknown {
  const proxy = value as
    | {
        toJs?: (options?: {
          dict_converter?: (entries: Iterable<[unknown, unknown]>) => unknown;
          create_proxies?: boolean;
        }) => unknown;
        destroy?: () => void;
      }
    | null;
  if (proxy && typeof proxy.toJs === "function") {
    const js = proxy.toJs({
      dict_converter: Object.fromEntries,
      create_proxies: false,
    });
    proxy.destroy?.();
    return js;
  }
  return value;
}

export function createNodeRunner(): PythonRunner {
  return {
    async ensure(packages) {
      const pyodide = await getRuntime();
      await loadPackages(pyodide, packages);
    },
    async run(code, opts) {
      const pyodide = await getRuntime();
      await loadPackages(pyodide, opts?.packages);
      if (opts?.autoLoad !== false) {
        await pyodide.loadPackagesFromImports(code);
      }
      return toTransferable(await pyodide.runPythonAsync(code));
    },
    dispose() {
      // Drop the singleton; the runtime is GC'd. (No worker to terminate.)
      runtime = null;
      loaded.clear();
    },
  };
}
