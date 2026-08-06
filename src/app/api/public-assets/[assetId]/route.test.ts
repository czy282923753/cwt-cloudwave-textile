import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  get: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  databaseConnection: { kind: "pglite", db: { kind: "TEST_DB" } },
}));
vi.mock("@/public-site/public-asset-access", () => ({
  findPublicAssetForDelivery: mocks.find,
}));
vi.mock("@/storage", () => ({
  createObjectStorage: () => ({ get: mocks.get }),
}));

import { GET } from "./route";

const assetId = "10000000-0000-4000-8000-000000000001";

function request(query = "") {
  return GET(
    new Request(`http://localhost/api/public-assets/${assetId}/${query}`),
    { params: Promise.resolve({ assetId }) },
  );
}

describe("Public Asset HTTP boundary", () => {
  beforeEach(() => {
    mocks.find.mockReset();
    mocks.get.mockReset();
  });

  it("returns 404 for malformed IDs and ineligible Assets without querying storage", async () => {
    const malformed = await GET(
      new Request("http://localhost/api/public-assets/not-an-id/"),
      { params: Promise.resolve({ assetId: "not-an-id" }) },
    );
    expect(malformed.status).toBe(404);
    expect(mocks.find).not.toHaveBeenCalled();

    mocks.find.mockResolvedValueOnce(null);
    const ineligible = await request();
    expect(ineligible.status).toBe(404);
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("serves an eligible responsive variant through the controlled route", async () => {
    mocks.find.mockResolvedValueOnce({
      id: assetId,
      partition: "public",
      objectKey: "synthetic/variant.webp",
      detectedMimeType: "image/webp",
    });
    mocks.get.mockResolvedValueOnce(new Uint8Array([1, 2, 3]));
    const response = await request("?variant=960w-webp");
    expect(response.status).toBe(200);
    expect(mocks.find).toHaveBeenCalledWith(
      expect.anything(),
      assetId,
      "960w-webp",
    );
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toContain("private, no-store");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
  });

  it("returns a sanitized temporary 503 for database or storage failures", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.find.mockRejectedValueOnce(new Error("TEST internal database address"));
    const databaseFailure = await request();
    expect(databaseFailure.status).toBe(503);
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
    expect(await storageFailure.text()).not.toContain("bucket secret");
    expect(log).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });
});
