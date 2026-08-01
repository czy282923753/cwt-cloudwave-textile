import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  authorizeInquiryAssetRecord: vi.fn(),
  writeAuditLog: vi.fn(),
  createReadUrl: vi.fn(),
}));

vi.mock("@/auth/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));
vi.mock("@/crm/authorization", () => ({
  authorizeInquiryAssetRecord: mocks.authorizeInquiryAssetRecord,
}));
vi.mock("@/audit/service", () => ({ writeAuditLog: mocks.writeAuditLog }));
vi.mock("@/db/client", () => ({
  databaseConnection: { kind: "pglite", db: { test: true } },
}));
vi.mock("@/storage", () => ({
  createObjectStorage: () => ({ createReadUrl: mocks.createReadUrl }),
}));
vi.mock("@/config/env", () => ({
  env: {
    PRIVATE_URL_TTL_SECONDS: 300,
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  },
}));

import { GET } from "./route";

describe("private Inquiry Asset API authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not create a signed URL or access audit when record authorization fails", async () => {
    mocks.requireCurrentUser.mockResolvedValue({ id: "other-sales", role: "sales" });
    mocks.authorizeInquiryAssetRecord.mockRejectedValue(
      new Error("Inquiry record access denied."),
    );

    const response = await GET(
      new Request("http://localhost:3000/api/inquiry-assets/private-asset/"), {
        params: Promise.resolve({ assetId: "private-asset" }),
      },
    );
    expect(response.status).toBe(404);

    expect(mocks.authorizeInquiryAssetRecord).toHaveBeenCalledWith(
      { test: true },
      { userId: "other-sales", role: "sales" },
      "private-asset",
    );
    expect(mocks.createReadUrl).not.toHaveBeenCalled();
    expect(mocks.writeAuditLog).not.toHaveBeenCalled();
  });

  it("creates a private grant only after record authorization succeeds", async () => {
    mocks.requireCurrentUser.mockResolvedValue({ id: "owner-sales", role: "sales" });
    mocks.authorizeInquiryAssetRecord.mockResolvedValue({
      id: "private-asset",
      objectKey: "inquiry/private-asset.png",
      partition: "private",
      inquiryId: "owned-inquiry",
    });
    mocks.createReadUrl.mockResolvedValue(
      "/api/storage/private/inquiry/private-asset.png/?expires=1&signature=test",
    );

    const response = await GET(
      new Request("http://localhost:3000/api/inquiry-assets/private-asset/"),
      { params: Promise.resolve({ assetId: "private-asset" }) },
    );

    expect(response.status).toBe(307);
    expect(mocks.writeAuditLog).toHaveBeenCalledOnce();
    expect(mocks.createReadUrl).toHaveBeenCalledWith(
      "private",
      "inquiry/private-asset.png",
      300,
    );
  });
});
