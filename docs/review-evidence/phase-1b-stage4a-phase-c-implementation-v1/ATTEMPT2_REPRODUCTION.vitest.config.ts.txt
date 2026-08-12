import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "../../../src"),
    },
  },
  test: {
    environment: "node",
    include: [
      "docs/review-evidence/phase-1b-stage4a-phase-c-implementation-v1/ATTEMPT2_EXACT_ORIGINAL_PCIR_H01_REPRODUCTION.test.ts",
      "docs/review-evidence/phase-1b-stage4a-phase-c-implementation-v1/ATTEMPT2_EXACT_REREVIEW_AVAILABILITY_REPRODUCTION.test.ts",
    ],
  },
});
