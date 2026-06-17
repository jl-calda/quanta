import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The calc engine is pure/deterministic and identical on client, worker,
    // and Node — so it is exercised in a plain Node environment. The dashboard's
    // pure display helpers (components/dashboard/format.ts) are node-safe too
    // (their cross-module imports are type-only and erased at build).
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
  },
});
