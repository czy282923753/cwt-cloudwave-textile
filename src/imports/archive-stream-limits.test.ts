import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { PRODUCT_IMPORT_LIMITS } from "./contract";
import { accumulateImportArchiveCompressedBytes } from "./archive";

describe("Import archive streaming boundary", () => {
  it("accepts the exact 500 MiB streamed ceiling and rejects the next byte without allocating an archive", () => {
    expect(accumulateImportArchiveCompressedBytes(0, PRODUCT_IMPORT_LIMITS.archiveBytes))
      .toBe(500 * 1024 * 1024);
    expect(() => accumulateImportArchiveCompressedBytes(
      PRODUCT_IMPORT_LIMITS.archiveBytes,
      1,
    )).toThrow(/actual compressed bytes exceed/i);
  });

  it("keeps the archive as a tee'd stream and stages members serially through the persisted scan path", () => {
    const service = readFileSync("src/uploads/admin-upload-service.ts", "utf8");
    const start = service.indexOf("export async function completeAdminImportArchiveIntent");
    const end = service.indexOf("\ntype AssetRelationInput", start);
    const archiveFlow = service.slice(start, end);
    expect(archiveFlow).toContain("input.stream.tee()");
    expect(archiveFlow).toContain("storage.putStream(");
    expect(archiveFlow).toContain("inspectImportImageArchiveStream(inspectStream");
    expect(archiveFlow).toMatch(/for \(const \[sourceOrder, file\] of stagedMedia\.entries\(\)\)[\s\S]*await completeAdminUploadIntent/);
    expect(archiveFlow).not.toContain("arrayBuffer(");
    expect(archiveFlow).not.toContain("scanner.scan(");
    expect(archiveFlow).not.toMatch(/Promise\.all\(stagedMedia/);
  });
});
