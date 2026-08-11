import { describe, expect, it } from "vitest";

import {
  buildAuthorizedDraftAssociationV1,
  decodeDraftTargetColumnsV1,
  encodeDraftTargetColumnsV1,
  prepareDraftAssociationV1,
} from "./association";

const vectors = [
  {
    target: {
      type: "product_draft",
      productId: "11111111-1111-4111-8111-111111111111",
      locale: "en",
      expectedVersion: 7,
    },
    hash: "95a697f896416f7a808ef3364f99e5bc0510c5d103f44ba4ac871e5e4c9a1b3f",
  },
  {
    target: {
      type: "content_draft",
      contentId: "22222222-2222-4222-8222-222222222222",
      locale: "en",
      expectedVersion: 9,
    },
    hash: "bb107bd612e64448ba153731e6a4e77b76cf0335bb3519380a92789d48b4f378",
  },
  {
    target: {
      type: "editorial_revision",
      revisionId: "33333333-3333-4333-8333-333333333333",
      expectedVersion: 12,
    },
    hash: "052b71a6215d4661761e1e045410d864915770a7abf9ddea60bcee998edaf8ea",
  },
] as const;

describe("Draft association provenance", () => {
  it.each(vectors)("round-trips $target.type with its fixed hash", ({ target, hash }) => {
    const prepared = prepareDraftAssociationV1(target);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    const authorized = buildAuthorizedDraftAssociationV1(prepared.value);
    expect(authorized.ok).toBe(true);
    if (!authorized.ok) return;
    expect(authorized.value.snapshotHash).toBe(hash);
    const columns = encodeDraftTargetColumnsV1(authorized.value);
    expect(columns.ok).toBe(true);
    if (!columns.ok) return;
    const decoded = decodeDraftTargetColumnsV1(structuredClone(columns.value));
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    const rebuilt = buildAuthorizedDraftAssociationV1(decoded.value);
    expect(rebuilt.ok).toBe(true);
    if (!rebuilt.ok) return;
    const reencoded = encodeDraftTargetColumnsV1(rebuilt.value);
    expect(reencoded).toEqual(columns);
  });

  it.each([
    { type: "product_draft", productId: "NOT-A-UUID", locale: "en", expectedVersion: 1 },
    { type: "content_draft", contentId: "22222222-2222-4222-8222-222222222222", locale: "fr", expectedVersion: 1 },
    { type: "editorial_revision", revisionId: "33333333-3333-4333-8333-333333333333", expectedVersion: 0 },
    { type: "editorial_revision", revisionId: "33333333-3333-4333-8333-333333333333", expectedVersion: 1, extra: true },
  ])("fails closed for malformed target %#", (target) => {
    const result = prepareDraftAssociationV1(target);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("association_provenance_mismatch");
  });

  it("rejects a swapped hash and cross-kind column population", () => {
    const result = decodeDraftTargetColumnsV1({
      targetType: "product_draft",
      targetProductId: "11111111-1111-4111-8111-111111111111",
      targetContentId: "22222222-2222-4222-8222-222222222222",
      targetRevisionId: null,
      targetLocale: "en",
      expectedTargetVersion: 7,
      targetSnapshotHash: vectors[1].hash,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("association_provenance_mismatch");
  });

  it("recomputes 1000 distinct authorized JCS snapshot hashes", () => {
    const hashes = new Set<string>();
    for (let expectedVersion = 1; expectedVersion <= 1_000; expectedVersion += 1) {
      const prepared = prepareDraftAssociationV1({
        type: "product_draft",
        productId: "11111111-1111-4111-8111-111111111111",
        locale: "en",
        expectedVersion,
      });
      expect(prepared.ok).toBe(true);
      if (!prepared.ok) return;
      const authorized = buildAuthorizedDraftAssociationV1(prepared.value);
      expect(authorized.ok).toBe(true);
      if (!authorized.ok) return;
      expect(authorized.value.snapshotHash).toMatch(/^[0-9a-f]{64}$/);
      hashes.add(authorized.value.snapshotHash);
    }
    expect(hashes.size).toBe(1_000);
  });
});
