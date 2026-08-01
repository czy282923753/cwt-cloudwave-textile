import { describe, expect, it } from "vitest";

import { assertRequestLength, preBodyRateLimitKeys, readRequestBodyWithLimit, trustedClientAddress } from "./request-guard";
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

  it("streams a missing-Content-Length and chunked body up to the exact hard limit", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3, 4]));
        controller.close();
      },
    });
    const request = new Request("http://localhost/upload", {
      method: "PUT",
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    expect(request.headers.get("content-length")).toBeNull();
    await expect(readRequestBodyWithLimit(request, 4)).resolves.toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
  });

  it("aborts an actual body that exceeds the limit by one byte", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request("http://localhost/upload", {
      method: "PUT",
      headers: { "content-length": "2" },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    await expect(readRequestBodyWithLimit(request, 2)).rejects.toThrow(/actual upload bytes/i);
    expect(cancelled).toBe(true);
  });

  it("surfaces an interrupted stream without producing a partial byte result", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1]));
        controller.error(new Error("client disconnected"));
      },
    });
    const request = new Request("http://localhost/upload", {
      method: "PUT",
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    await expect(readRequestBodyWithLimit(request, 10)).rejects.toThrow(/client disconnected/);
  });
});
