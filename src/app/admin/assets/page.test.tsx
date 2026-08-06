import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createObjectStorage: vi.fn(() => ({ kind: "test-storage" })),
  listAdminAssets: vi.fn(),
  listAdminContents: vi.fn(),
  listAdminFabricEntries: vi.fn(),
  listAdminProducts: vi.fn(),
  listRetryableAdminUploadBatches: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("CONTROLLED_NOT_FOUND");
  }),
  redirect: vi.fn((destination: string) => {
    throw new Error(`CONTROLLED_REDIRECT:${destination}`);
  }),
  resolveCurrentUser: vi.fn(),
}));

vi.mock("@/admin/data", () => ({
  listAdminAssets: mocks.listAdminAssets,
  listAdminContents: mocks.listAdminContents,
  listAdminFabricEntries: mocks.listAdminFabricEntries,
  listAdminProducts: mocks.listAdminProducts,
}));

vi.mock("@/auth/current-user", () => ({
  resolveCurrentUser: mocks.resolveCurrentUser,
}));

vi.mock("@/db/client", () => ({
  databaseConnection: { kind: "pglite", db: { kind: "test-db" } },
}));

vi.mock("@/storage", () => ({
  createObjectStorage: mocks.createObjectStorage,
}));

vi.mock("@/uploads/admin-upload-service", () => ({
  listRetryableAdminUploadBatches: mocks.listRetryableAdminUploadBatches,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
  useRouter: vi.fn(),
}));

import AdminAssetsPage from "./page";

type TestedRole = "admin" | "product_editor" | "content_editor" | "reviewer_publisher" | "sales" | "analyst";

function user(role: TestedRole) {
  return {
    id: `${role}-user`,
    role,
    sessionId: `${role}-session`,
    displayName: `TEST ${role}`,
  };
}

function expectNoAssetLibraryQueries(): void {
  expect(mocks.listRetryableAdminUploadBatches).not.toHaveBeenCalled();
  expect(mocks.listAdminAssets).not.toHaveBeenCalled();
  expect(mocks.listAdminProducts).not.toHaveBeenCalled();
  expect(mocks.listAdminContents).not.toHaveBeenCalled();
  expect(mocks.listAdminFabricEntries).not.toHaveBeenCalled();
}

describe("Asset Library page authorization boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listAdminAssets.mockResolvedValue([]);
    mocks.listAdminContents.mockResolvedValue([]);
    mocks.listAdminFabricEntries.mockResolvedValue([]);
    mocks.listAdminProducts.mockResolvedValue([]);
    mocks.listRetryableAdminUploadBatches.mockResolvedValue([]);
  });

  it("returns a controlled not-found for an authenticated Analyst before every record query", async () => {
    mocks.resolveCurrentUser.mockResolvedValue(user("analyst"));

    await expect(AdminAssetsPage()).rejects.toThrow("CONTROLLED_NOT_FOUND");

    expect(mocks.notFound).toHaveBeenCalledOnce();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expectNoAssetLibraryQueries();
  });

  it("preserves the anonymous login redirect before every record query", async () => {
    mocks.resolveCurrentUser.mockResolvedValue(null);

    await expect(AdminAssetsPage()).rejects.toThrow(
      "CONTROLLED_REDIRECT:/operations-login",
    );

    expect(mocks.redirect).toHaveBeenCalledWith("/operations-login");
    expect(mocks.notFound).not.toHaveBeenCalled();
    expectNoAssetLibraryQueries();
  });

  it("preserves Asset Library access and resource-scoped association candidates", async () => {
    const matrix = [
      { role: "admin", products: true, contents: true, retryable: true },
      { role: "product_editor", products: true, contents: false, retryable: true },
      { role: "content_editor", products: false, contents: true, retryable: true },
      { role: "reviewer_publisher", products: true, contents: true, retryable: false },
      { role: "sales", products: false, contents: false, retryable: false },
    ] as const;

    for (const expected of matrix) {
      vi.clearAllMocks();
      mocks.listAdminAssets.mockResolvedValue([]);
      mocks.listAdminContents.mockResolvedValue([]);
      mocks.listAdminFabricEntries.mockResolvedValue([]);
      mocks.listAdminProducts.mockResolvedValue([]);
      mocks.listRetryableAdminUploadBatches.mockResolvedValue([]);
      mocks.resolveCurrentUser.mockResolvedValue(user(expected.role));

      await expect(AdminAssetsPage()).resolves.toBeTruthy();

      expect(mocks.notFound).not.toHaveBeenCalled();
      expect(mocks.redirect).not.toHaveBeenCalled();
      expect(mocks.listAdminAssets).toHaveBeenCalledOnce();
      expect(mocks.listAdminFabricEntries).toHaveBeenCalledOnce();
      expect(mocks.listAdminProducts).toHaveBeenCalledTimes(expected.products ? 1 : 0);
      expect(mocks.listAdminContents).toHaveBeenCalledTimes(expected.contents ? 1 : 0);
      expect(mocks.listRetryableAdminUploadBatches).toHaveBeenCalledTimes(
        expected.retryable ? 1 : 0,
      );
    }
  });
});
