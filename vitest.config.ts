import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Mirror the tsconfig `@/*` → `./*` path alias so tests can import app modules
  // (e.g. the editor reducer pulling in `@/lib/worksheet/*`) as values, not just
  // type-only. The calc-engine tests use relative imports and are unaffected.
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  // Use React's automatic JSX runtime (matching Next) so `.tsx` modules under
  // test render without a manual `import React`. Pure `.ts` tests are unaffected.
  esbuild: { jsx: "automatic" },
  test: {
    // The calc engine is pure/deterministic and identical on client, worker,
    // and Node — so it is exercised in a plain Node environment. The dashboard's
    // pure display helpers (components/dashboard/format.ts) are node-safe too
    // (their cross-module imports are type-only and erased at build).
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
  },
});
