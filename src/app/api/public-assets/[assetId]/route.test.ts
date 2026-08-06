import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  get: vi.fn(),
}));

vi.mock("@/public-site/public-asset-access", () => ({
  findPublicAssetForDelivery: mocks.find,
}));

import {
  GOVERNED_PUBLIC_ASSET_CACHE_CONTROL,
  serveGovernedPublicAsset,
} from "@/public-site/public-asset-response";

const assetId = "10000000-0000-4000-8000-000000000001";

const storage = { get: mocks.get } as never;
const db = { kind: "TEST_DB" } as never;

function request(variantKey?: string, requestedAssetId = assetId) {
  return serveGovernedPublicAsset(db, storage, requestedAssetId, variantKey);
}

function expectGovernedCache(response: Response) {
  expect(response.headers.get("cache-control")).toBe(
    GOVERNED_PUBLIC_ASSET_CACHE_CONTROL,
  );
}

describe("Public Asset HTTP boundary", () => {
  beforeEach(() => {
    mocks.find.mockReset();
    mocks.get.mockReset();
  });

  it("returns 404 for malformed IDs and ineligible Assets without querying storage", async () => {
    const malformed = await request(undefined, "not-an-id");
    expect(malformed.status).toBe(404);
    expectGovernedCache(malformed);
    expect(mocks.find).not.toHaveBeenCalled();

    mocks.find.mockResolvedValueOnce(null);
    const ineligible = await request();
    expect(ineligible.status).toBe(404);
    expectGovernedCache(ineligible);
    expect(mocks.get).not.toHaveBeenCalled();

    const unsafeVariant = await request("960w-webp.webp");
    expect(unsafeVariant.status).toBe(404);
    expectGovernedCache(unsafeVariant);
    expect(mocks.find).toHaveBeenCalledTimes(1);
  });

  it("serves original and responsive Variant responses with the exact governed cache contract", async () => {
    for (const candidate of [
      { variantKey: undefined, objectKey: "synthetic/original.jpg", mime: "image/jpeg" },
      { variantKey: "960w-webp", objectKey: "synthetic/variant.webp", mime: "image/webp" },
    ]) {
      mocks.find.mockResolvedValueOnce({
        id: assetId,
        partition: "public",
        objectKey: candidate.objectKey,
        detectedMimeType: candidate.mime,
      });
      mocks.get.mockResolvedValueOnce(new Uint8Array([1, 2, 3]));
      const response = await request(candidate.variantKey);
      expect(response.status).toBe(200);
      expect(mocks.find).toHaveBeenLastCalledWith(
        expect.anything(),
        assetId,
        candidate.variantKey,
      );
      expect(response.headers.get("content-type")).toBe(candidate.mime);
      expectGovernedCache(response);
      expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
    }
  });

  it("returns a sanitized temporary 503 for database or storage failures", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.find.mockRejectedValueOnce(new Error("TEST internal database address"));
    const databaseFailure = await request();
    expect(databaseFailure.status).toBe(503);
    expectGovernedCache(databaseFailure);
    expect(await databaseFailure.text()).toBe("Temporarily unavailable");
    expect(mocks.get).not.toHaveBeenCalled();

    mocks.find.mockResolvedValueOnce({
      id: assetId,
      partition: "public",
      objectKey: "synthetic/original.jpg",
      detectedMimeType: "image/jpeg",
    });
    mocks.get.mockRejectedValueOnce(new Error("TEST bucket secret"));
    const storageFailure = await request();
    expect(storageFailure.status).toBe(503);
    expectGovernedCache(storageFailure);
    expect(await storageFailure.text()).not.toContain("bucket secret");
    expect(log).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });
});
