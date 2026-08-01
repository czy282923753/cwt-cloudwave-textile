import { describe, expect, it } from "vitest";

import { assertRequestLength, preBodyRateLimitKeys, trustedClientAddress } from "./request-guard";
import { MemoryUploadRateLimiter } from "./rate-limit";

describe("pre-body upload request guard", () => {
  it("rejects missing, invalid, and oversized Content-Length before body parsing", () => {
    expect(() => assertRequestLength(new Request("http://localhost/upload"), 10, { required: true })).toThrow(/required/);
    expect(() => assertRequestLength(new Request("http://localhost/upload", { headers: { "content-length": "invalid" } }), 10)).toThrow(/invalid/);
    expect(() => assertRequestLength(new Request("http://localhost/upload", { headers: { "content-length": "11" } }), 10)).toThrow(/exceeds/);
    expect(() => assertRequestLength(new Request("http://localhost/upload", { headers: { "content-length": "9" } }), 10, { exact: 10 })).toThrow(/does not match/);
    expect(assertRequestLength(new Request("http://localhost/upload", { headers: { "content-length": "10" } }), 10)).toBe(10);
  });

  it("does not trust a forged x-forwarded-for header when no proxy mode is configured", () => {
    const first = new Request("http://localhost/upload", { headers: { "x-forwarded-for": "1.1.1.1", "x-cwt-upload-session": "session", "user-agent": "test" } });
    const second = new Request("http://localhost/upload", { headers: { "x-forwarded-for": "9.9.9.9", "x-cwt-upload-session": "session", "user-agent": "test" } });
    expect(trustedClientAddress(first)).toBeNull();
    expect(preBodyRateLimitKeys(first)).toEqual(preBodyRateLimitKeys(second));
    expect(preBodyRateLimitKeys(first)).toContain("global:public-upload");
  });

  it("applies the request limiter before an upload body would be accepted", async () => {
    const limiter = new MemoryUploadRateLimiter(1, 60_000);
    await expect(limiter.consume("global:public-upload")).resolves.toBe(true);
    await expect(limiter.consume("global:public-upload")).resolves.toBe(false);
  });
});
