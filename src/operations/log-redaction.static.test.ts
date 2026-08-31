import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const OPERATIONAL_ENTRIES = [
  "scripts/process-notification-outbox.ts",
  "scripts/process-object-cleanup.ts",
  "scripts/process-ai-runs.ts",
  "scripts/enforce-retention.ts",
  "scripts/check-work-health.ts",
] as const;

describe("operational log redaction", () => {
  it("does not dump caught error messages or payload-bearing row fields", async () => {
    const sources = await Promise.all(OPERATIONAL_ENTRIES.map(async (path) => ({
      path,
      source: await readFile(resolve(process.cwd(), path), "utf8"),
    })));
    for (const { path, source } of sources) {
      expect(source, path).not.toMatch(/error\s+instanceof\s+Error\s*\?\s*error\.message/u);
      expect(source, path).not.toMatch(/process\.(?:stdout|stderr)\.write\([^)]*(?:payload|objectKey|inquiryId|assetId|contactId)/su);
    }
  });
});
