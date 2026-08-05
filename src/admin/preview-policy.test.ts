import { describe, expect, it } from "vitest";

import {
  contentPreviewMediaFromSnapshot,
  productPreviewMediaFromSnapshot,
  snapshotContainsPreviewAsset,
} from "./preview-policy";

const first = "10000000-0000-4000-8000-000000000001";
const second = "10000000-0000-4000-8000-000000000002";

describe("authenticated Draft Preview media policy", () => {
  it("projects Product Structure media without changing live relations", () => {
    const snapshot = {
      kind: "structure",
      assetIds: [first, second],
      heroAssetId: first,
      media: [
        { assetId: first, role: "hero", sortOrder: 0, altText: "Hero", caption: null, isVisible: true },
        { assetId: second, role: "gallery", sortOrder: 1, altText: null, caption: null, isVisible: false },
      ],
      unrelated: "ignored",
    };
    expect(productPreviewMediaFromSnapshot(snapshot)).toHaveLength(2);
    expect(snapshotContainsPreviewAsset("product", snapshot, first)).toBe(true);
    expect(snapshotContainsPreviewAsset("product", snapshot, second)).toBe(false);
  });

  it("accepts only Content revision media and ignores malformed or unrelated snapshots", () => {
    const snapshot = {
      kind: "content_blocks_v1",
      media: [{
        assetId: first,
        role: "inline",
        sortOrder: 0,
        altText: "Inline",
        caption: null,
        isVisible: true,
        blockKey: "inline-one",
      }],
      document: { version: 1, blocks: [] },
    };
    expect(contentPreviewMediaFromSnapshot(snapshot)?.[0]).toMatchObject({
      assetId: first,
      blockKey: "inline-one",
    });
    expect(snapshotContainsPreviewAsset("content", snapshot, first)).toBe(true);
    expect(productPreviewMediaFromSnapshot(snapshot)).toBeNull();
    expect(contentPreviewMediaFromSnapshot({ ...snapshot, media: [{ assetId: "not-a-uuid" }] }))
      .toBeNull();
  });
});
