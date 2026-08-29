import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createInquiry: vi.fn(),
}));

vi.mock("@/crm/inquiry-service", () => {
  class InquiryIdempotencyConflictError extends Error {
    readonly code = "INQUIRY_IDEMPOTENCY_CONFLICT" as const;

    constructor() {
      super("Synthetic Inquiry Idempotency conflict.");
      this.name = "InquiryIdempotencyConflictError";
    }
  }
  return {
    createInquiry: mocks.createInquiry,
    InquiryIdempotencyConflictError,
  };
});
vi.mock("@/db/client", () => ({
  databaseConnection: { kind: "pglite", db: { test: true } },
}));
vi.mock("@/analytics/consent-service", () => ({
  consentSessionIdFromRequest: () => null,
  findPersistedConsent: () => Promise.resolve(null),
}));
vi.mock("@/uploads/request-guard", () => ({
  assertRequestLength: () => undefined,
  preBodyRateLimitKeys: () => [],
}));
vi.mock("@/uploads/rate-limit", () => ({
  publicUploadRateLimiter: { consume: () => Promise.resolve(true) },
}));
vi.mock("@/config/env", () => ({
  env: {
    MAX_FILES_PER_UPLOAD: 5,
    MAX_INQUIRY_JSON_BYTES: 20_000,
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  },
}));

import { InquiryIdempotencyConflictError } from "@/crm/inquiry-service";

import { POST } from "./route";

function inquiryRequest(countryCode?: unknown) {
  const idempotencyKey = "11111111-1111-4111-8111-111111111111";
  return new Request("http://localhost:3000/api/inquiries/", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
      "x-cwt-upload-session": "22222222-2222-4222-8222-222222222222",
    },
    body: JSON.stringify({
      name: "Test Buyer",
      email: "buyer@example.test",
      ...(countryCode === undefined ? {} : { countryCode }),
      description: "Please match this fabric.",
      uploadTokens: [],
      sourcePagePath: "/get-quote/",
      attributionConfidence: "unavailable",
      anonymousSessionId: "22222222-2222-4222-8222-222222222222",
      idempotencyKey,
    }),
  });
}

describe("public Inquiry Idempotency responses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createInquiry.mockReset();
  });

  it.each([
    ["cn", "CN"],
    ["", null],
    [null, null],
  ])("normalizes valid optional country input %j to %j", async (input, expected) => {
    mocks.createInquiry.mockResolvedValue({
      inquiryId: "33333333-3333-4333-8333-333333333333",
      publicReference: "CWT-COUNTRY-CODE",
      replayed: false,
    });

    const response = await POST(inquiryRequest(input));

    expect(response.status).toBe(201);
    expect(mocks.createInquiry).toHaveBeenCalledTimes(1);
    expect(mocks.createInquiry.mock.calls[0]?.[1]).toMatchObject({
      countryCode: expected,
    });
  });

  it.each(["ZZ", "China", "C"])(
    "rejects invalid country input %s before the Domain Service",
    async (countryCode) => {
      const response = await POST(inquiryRequest(countryCode));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        ok: false,
        error: "Country must be a valid ISO 3166-1 alpha-2 code.",
      });
      expect(mocks.createInquiry).not.toHaveBeenCalled();
    },
  );

  it("returns a stable 409 without exposing the original request", async () => {
    mocks.createInquiry.mockRejectedValue(new InquiryIdempotencyConflictError());
    const response = await POST(inquiryRequest());
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "This request key was already used for different Inquiry details.",
      errorCode: "INQUIRY_IDEMPOTENCY_CONFLICT",
    });
  });

  it("reports an equal request replay without pretending it was newly created", async () => {
    mocks.createInquiry.mockResolvedValue({
      inquiryId: "33333333-3333-4333-8333-333333333333",
      publicReference: "CWT-REPLAY-REFERENCE",
      replayed: true,
    });
    const response = await POST(inquiryRequest());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      reference: "CWT-REPLAY-REFERENCE",
      replayed: true,
    });
  });
});
