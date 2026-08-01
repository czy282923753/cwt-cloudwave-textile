import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // PGlite integration suites each boot an isolated PostgreSQL runtime. Running
    // many of those runtimes in parallel causes host-contention timeouts and does
    // not add concurrency coverage; concurrency is exercised inside the suites.
    maxWorkers: 1,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["src/**/*.d.ts", "src/test/**"],
    },
  },
});
