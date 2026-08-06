import { describe, expect, it } from "vitest";

import { matchImportMedia } from "./matching";

const candidate = (sourceKey: string, relativePath: string, sha256 = sourceKey.padEnd(64, "0")) => ({ sourceKey, relativePath, sha256 });

describe("deterministic Product image matching", () => {
  it("stops at the first unambiguous tier and assigns approved roles", () => {
    const result = matchImportMedia("CWT-MESH-001", ["explicit/other.jpg"], [
      candidate("a", "CWT-MESH-001/CWT-MESH-001-01.jpg"),
      candidate("b", "CWT-MESH-001/CWT-MESH-001-02.jpg"),
      candidate("c", "explicit/other.jpg"),
    ]);
    expect(result.matched.map((item) => [item.sourceKey, item.role, item.matchTier])).toEqual([
      ["a", "hero", "product_code_folder"],
      ["b", "gallery", "product_code_folder"],
    ]);
    expect(result.unmatched.map((item) => item.sourceKey)).toEqual(["c"]);
  });

  it("proposes the deterministic first image only when no explicit Primary exists", () => {
    const result = matchImportMedia("CWT-MESH-001", [], [
      candidate("b", "CWT-MESH-001-detail-02.jpg"),
      candidate("a", "CWT-MESH-001-detail-01.jpg"),
    ]);
    expect(result.matched[0]).toMatchObject({ sourceKey: "a", role: "hero", sortOrder: 0 });
  });

  it("reports multiple Primary and duplicate-content blockers", () => {
    const result = matchImportMedia("CWT-MESH-001", [], [
      candidate("a", "CWT-MESH-001-01.jpg", "f".repeat(64)),
      candidate("b", "CWT-MESH-001-main.jpg", "f".repeat(64)),
    ]);
    expect(result.errors).toEqual(["ambiguous_primary_image", "duplicate_image_content"]);
  });

  it("requires a complete Product Code filename boundary", () => {
    const result = matchImportMedia("CWT-MESH-001", [], [
      candidate("wrong", "CWT-MESH-0010-01.jpg"),
      candidate("right", "CWT-MESH-001-detail-01.jpg"),
    ]);
    expect(result.matched.map((item) => item.sourceKey)).toEqual(["right"]);
    expect(result.unmatched.map((item) => item.sourceKey)).toEqual(["wrong"]);
  });

  it("uses explicit relative filenames before the Product Code prefix tier", () => {
    const result = matchImportMedia("CWT-MESH-001", ["selected/primary.webp"], [
      candidate("explicit", "selected/primary.webp"),
      candidate("prefix", "CWT-MESH-001-02.webp"),
    ]);
    expect(result.matched.map((item) => [item.sourceKey, item.matchTier])).toEqual([["explicit", "explicit_file"]]);
    expect(result.unmatched.map((item) => item.sourceKey)).toEqual(["prefix"]);
  });

  it("assigns Gallery, Detail, and Application roles deterministically and remains stable on retry", () => {
    const media = [
      candidate("gallery", "CWT-MESH-001-02.webp"),
      candidate("detail", "CWT-MESH-001-detail-03.webp"),
      candidate("application", "CWT-MESH-001-application-02.webp"),
      candidate("primary", "CWT-MESH-001-main.webp"),
    ];
    const first = matchImportMedia("CWT-MESH-001", [], media);
    const retry = matchImportMedia("CWT-MESH-001", [], media);
    expect(first).toEqual(retry);
    expect(first.matched.map((item) => [item.sourceKey, item.role, item.sortOrder])).toEqual([
      ["primary", "hero", 0],
      ["gallery", "gallery", 1],
      ["application", "application", 0],
      ["detail", "detail", 0],
    ]);
  });
});
