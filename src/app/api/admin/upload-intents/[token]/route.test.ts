import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  completeAdminImportArchiveIntent: vi.fn(),
  completeAdminUploadIntent: vi.fn(),
  createFileScanner: vi.fn(),
  createObjectStorage: vi.fn(),
  inspectAdminUploadIntent: vi.fn(),
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/auth/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));
vi.mock("@/db/client", () => ({
  databaseConnection: { kind: "pglite", db: { test: true } },
}));
vi.mock("@/storage", () => ({
  createObjectStorage: mocks.createObjectStorage,
}));
vi.mock("@/uploads/admin-upload-service", () => ({
  completeAdminImportArchiveIntent: mocks.completeAdminImportArchiveIntent,
  completeAdminUploadIntent: mocks.completeAdminUploadIntent,
  IMPORT_ARCHIVE_MIME: "application/zip",
  inspectAdminUploadIntent: mocks.inspectAdminUploadIntent,
}));
vi.mock("@/uploads/scanner-factory", () => ({
  createFileScanner: mocks.createFileScanner,
}));

import { env } from "@/config/env";
import { PRODUCT_IMPORT_LIMITS } from "@/imports/contract";

import { PUT } from "./route";

const TEST_SITE_ORIGIN = new URL(env.NEXT_PUBLIC_SITE_URL).origin;

const actor = {
  id: "10000000-0000-4000-8000-000000000001",
  role: "admin",
  sessionId: "20000000-0000-4000-8000-000000000002",
};
const token = "test-token-sensitive-value";

function binaryRequest(
  body: BodyInit | ReadableStream<Uint8Array>,
  options: { contentLength?: string; contentType?: string } = {},
): Request {
  const headers = new Headers({
    origin: TEST_SITE_ORIGIN,
    "content-type": options.contentType ?? "image/jpeg",
  });
  if (options.contentLength !== undefined) {
    headers.set("content-length", options.contentLength);
  }
  return new Request(new URL(`/api/admin/upload-intents/${token}/`, TEST_SITE_ORIGIN), {
    method: "PUT",
    headers,
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

function chunkedBody(...chunks: number[][]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new Uint8Array(chunk));
      controller.close();
    },
  });
}

async function upload(request: Request) {
  return PUT(request, { params: Promise.resolve({ token }) });
}

describe("Admin Upload Intent binary API pre-body guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue(actor);
    mocks.inspectAdminUploadIntent.mockResolvedValue({
      declaredByteSize: 3,
      declaredMimeType: "image/jpeg",
      importPackage: false,
    });
    mocks.completeAdminUploadIntent.mockResolvedValue(
      "30000000-0000-4000-8000-000000000003",
    );
    mocks.completeAdminImportArchiveIntent.mockResolvedValue({
      packageAssetId: "40000000-0000-4000-8000-000000000004",
      media: [],
    });
    mocks.createObjectStorage.mockReturnValue({ test: "storage" });
    mocks.createFileScanner.mockReturnValue({ test: "scanner" });
  });

  it("rejects an oversized binary request before authentication or body buffering", async () => {
    const request = binaryRequest(new Uint8Array([1]), {
      contentLength: String(
        Math.max(env.MAX_PUBLIC_FILE_BYTES, PRODUCT_IMPORT_LIMITS.archiveBytes) + 1,
      ),
    });
    const arrayBuffer = vi.spyOn(request, "arrayBuffer");
    const formData = vi.spyOn(request, "formData");
    const getReader = vi.spyOn(request.body!, "getReader");
    const response = await upload(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toMatchObject({ ok: false, errorCode: "VALIDATION_ERROR" });
    expect(JSON.stringify(body)).not.toContain(token);
    expect(JSON.stringify(body)).not.toContain(actor.id);
    expect(JSON.stringify(body)).not.toContain(actor.sessionId);
    expect(mocks.requireCurrentUser).not.toHaveBeenCalled();
    expect(mocks.inspectAdminUploadIntent).not.toHaveBeenCalled();
    expect(mocks.completeAdminUploadIntent).not.toHaveBeenCalled();
    expect(mocks.completeAdminImportArchiveIntent).not.toHaveBeenCalled();
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(formData).not.toHaveBeenCalled();
    expect(getReader).not.toHaveBeenCalled();
  });

  it("rejects an invalid Content-Length before authentication or Intent inspection", async () => {
    const request = binaryRequest(new Uint8Array([1]), {
      contentLength: "invalid",
    });
    const getReader = vi.spyOn(request.body!, "getReader");
    const response = await upload(request);

    expect(response.status).toBe(400);
    expect(mocks.requireCurrentUser).not.toHaveBeenCalled();
    expect(mocks.inspectAdminUploadIntent).not.toHaveBeenCalled();
    expect(getReader).not.toHaveBeenCalled();
  });

  it("preserves authentication, Intent exact-size validation, and normal completion", async () => {
    const response = await upload(binaryRequest(new Uint8Array([1, 2, 3]), {
      contentLength: "3",
    }));

    expect(response.status).toBe(201);
    expect(mocks.requireCurrentUser).toHaveBeenCalledWith("assets.write");
    expect(mocks.inspectAdminUploadIntent).toHaveBeenCalledWith(
      { test: true },
      { userId: actor.id, role: actor.role, authSessionId: actor.sessionId },
      token,
    );
    expect(mocks.completeAdminUploadIntent).toHaveBeenCalledWith(
      { test: true },
      { test: "storage" },
      { test: "scanner" },
      { userId: actor.id, role: actor.role, authSessionId: actor.sessionId },
      { token, bytes: new Uint8Array([1, 2, 3]) },
    );
  });

  it("rejects a forged Intent-exact header before consuming the body", async () => {
    const request = binaryRequest(new Uint8Array([1, 2]), { contentLength: "2" });
    const arrayBuffer = vi.spyOn(request, "arrayBuffer");
    const getReader = vi.spyOn(request.body!, "getReader");
    const response = await upload(request);

    expect(response.status).toBe(400);
    expect(mocks.requireCurrentUser).toHaveBeenCalledOnce();
    expect(mocks.inspectAdminUploadIntent).toHaveBeenCalledOnce();
    expect(mocks.completeAdminUploadIntent).not.toHaveBeenCalled();
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(getReader).not.toHaveBeenCalled();
  });

  it("accepts missing Content-Length while bounding a chunked body by actual bytes", async () => {
    const response = await upload(binaryRequest(chunkedBody([1], [2, 3])));

    expect(response.status).toBe(201);
    expect(mocks.completeAdminUploadIntent).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      { token, bytes: new Uint8Array([1, 2, 3]) },
    );
  });

  it.each([
    ["missing", undefined],
    ["forged exact", "3"],
  ])("rejects an actual streamed-byte overflow with %s Content-Length", async (_label, contentLength) => {
    const response = await upload(binaryRequest(
      chunkedBody([1, 2], [3, 4]),
      contentLength === undefined ? {} : { contentLength },
    ));

    expect(response.status).toBe(400);
    expect(mocks.completeAdminUploadIntent).not.toHaveBeenCalled();
    expect(mocks.completeAdminImportArchiveIntent).not.toHaveBeenCalled();
  });

  it("keeps the existing Import archive ceiling available without querying it before auth", async () => {
    const archiveBytes = Math.max(env.MAX_PUBLIC_FILE_BYTES + 1, 20 * 1024 * 1024);
    mocks.inspectAdminUploadIntent.mockResolvedValue({
      declaredByteSize: archiveBytes,
      declaredMimeType: "application/zip",
      importPackage: true,
    });
    const request = binaryRequest(new Uint8Array([0x50, 0x4b]), {
      contentLength: String(archiveBytes),
      contentType: "application/zip",
    });
    const response = await upload(request);

    expect(archiveBytes).toBeLessThanOrEqual(PRODUCT_IMPORT_LIMITS.archiveBytes);
    expect(response.status).toBe(201);
    expect(mocks.completeAdminImportArchiveIntent).toHaveBeenCalledOnce();
    expect(mocks.completeAdminUploadIntent).not.toHaveBeenCalled();
  });

  it("preserves permission and Intent-state failures without consuming the body", async () => {
    mocks.requireCurrentUser.mockRejectedValueOnce(new Error("Authentication required."));
    const unauthorized = await upload(binaryRequest(new Uint8Array([1, 2, 3]), {
      contentLength: "3",
    }));
    expect(unauthorized.status).toBe(403);
    expect(mocks.inspectAdminUploadIntent).not.toHaveBeenCalled();

    mocks.inspectAdminUploadIntent.mockRejectedValueOnce(
      new Error("Admin Upload Intent is invalid, expired, or already used."),
    );
    const invalidIntent = await upload(binaryRequest(new Uint8Array([1, 2, 3]), {
      contentLength: "3",
    }));
    expect(invalidIntent.status).toBe(400);
    expect(mocks.completeAdminUploadIntent).not.toHaveBeenCalled();
    expect(mocks.completeAdminImportArchiveIntent).not.toHaveBeenCalled();
  });
});
