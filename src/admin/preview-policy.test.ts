import { describe, expect, it } from "vitest";

import {
  canAccessEditorialResource,
  contentPreviewMediaFromSnapshot,
  productPreviewMediaFromSnapshot,
  snapshotContainsPreviewAsset,
} from "./preview-policy";

const first = "10000000-0000-4000-8000-000000000001";
const second = "10000000-0000-4000-8000-000000000002";

describe("authenticated Draft Preview media policy", () => {
  it("enforces the resource-level editor and Preview role matrix", () => {
    for (const resource of ["product", "content", "static_page"] as const) {
      expect(canAccessEditorialResource("admin", resource, "preview")).toBe(true);
      expect(canAccessEditorialResource("reviewer_publisher", resource, "preview")).toBe(true);
      expect(canAccessEditorialResource("sales", resource, "preview")).toBe(false);
      expect(canAccessEditorialResource("analyst", resource, "preview")).toBe(false);
    }
    expect(canAccessEditorialResource("product_editor", "product", "write")).toBe(true);
    expect(canAccessEditorialResource("product_editor", "product", "preview")).toBe(true);
    expect(canAccessEditorialResource("product_editor", "content", "preview")).toBe(false);
    expect(canAccessEditorialResource("content_editor", "content", "write")).toBe(true);
    expect(canAccessEditorialResource("content_editor", "static_page", "preview")).toBe(true);
    expect(canAccessEditorialResource("product_editor", "static_page", "preview")).toBe(false);
    expect(canAccessEditorialResource("content_editor", "product", "preview")).toBe(false);
    expect(canAccessEditorialResource("reviewer_publisher", "product", "apply")).toBe(true);
    expect(canAccessEditorialResource("reviewer_publisher", "content", "apply")).toBe(true);
    expect(canAccessEditorialResource("sales", "product", "preview")).toBe(false);
    expect(canAccessEditorialResource("sales", "static_page", "manage")).toBe(false);
    expect(canAccessEditorialResource("analyst", "content", "preview")).toBe(false);
  });

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

  it("finds Product media inside the single unified Published Draft", () => {
    const snapshot = {
      kind: "editorial_blocks",
      name: "TEST Product",
      shortDescription: null,
      document: { version: 1, blocks: [] },
      expectedEditorDocumentVersion: 1,
      pendingChanges: [{
        kind: "structure",
        assetIds: [first],
        heroAssetId: first,
        media: [{ assetId: first, role: "hero", sortOrder: 0, altText: "Hero", caption: null, isVisible: true }],
      }],
    };
    expect(snapshotContainsPreviewAsset("product", snapshot, first)).toBe(true);
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
