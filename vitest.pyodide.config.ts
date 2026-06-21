import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * On-demand config for the Pyodide Node integration smoke (`npm run test:pyodide`).
 *
 * Kept OUT of the default suite: it boots the real Pyodide runtime in Node and
 * downloads the SymPy / SciPy wheels from the CDN on first run (network needed),
 * which the fast, offline `npm test` must never depend on. The default
 * vitest.config.ts only includes lib/** + components/**, so this never runs there.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["scripts/**/*.smoke.test.ts"],
    // Load the built `pyodide` package natively instead of transforming its
    // source — Vite's transform rewrites `import.meta.url` and breaks Pyodide's
    // runtime file location.
    server: { deps: { external: [/[\\/]node_modules[\\/]pyodide[\\/]/] } },
    // Pyodide boot + first-time wheel download is slow; give it room.
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
