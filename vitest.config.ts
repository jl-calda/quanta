import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The calc engine is pure/deterministic and identical on client, worker,
    // and Node — so it is exercised in a plain Node environment.
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
