import { describe, expect, it } from "vitest";

import { TRUSTED_CLIENT_ADDRESS_HEADER } from "@/security/trusted-client-address";
import { MemorySharedRateLimiter } from "@/security/shared-rate-limiter";

import { assertRequestLength, preBodyRateLimitKeys, readRequestBodyWithLimit } from "./request-guard";

describe("pre-body upload request guard", () => {
  it("rejects missing, invalid, and oversized Content-Length before body parsing", () => {
    expect(() => assertRequestLength(new Request("http://localhost/upload"), 10, { required: true })).toThrow(/required/);
    expect(() => assertRequestLength(new Request("http://localhost/upload", { headers: { "content-length": "invalid" } }), 10)).toThrow(/invalid/);
    expect(() => assertRequestLength(new Request("http://localhost/upload", { headers: { "content-length": "11" } }), 10)).toThrow(/exceeds/);
    expect(() => assertRequestLength(new Request("http://localhost/upload", { headers: { "content-length": "9" } }), 10, { exact: 10 })).toThrow(/does not match/);
    expect(assertRequestLength(new Request("http://localhost/upload", { headers: { "content-length": "10" } }), 10)).toBe(10);
  });

  it("does not trust public forwarding headers or create an unknown fallback bucket", () => {
    const first = new Request("http://localhost/upload", { headers: { "x-forwarded-for": "1.1.1.1", "x-cwt-upload-session": "session", "user-agent": "test" } });
    expect(preBodyRateLimitKeys(first)).toBeNull();
    const attested = new Request("http://localhost/upload", { headers: { [TRUSTED_CLIENT_ADDRESS_HEADER]: "192.0.2.1", "x-cwt-upload-session": "session" } });
    expect(preBodyRateLimitKeys(attested)).toEqual(["global:public-upload", "session:session", "network:192.0.2.1"]);
  });

  it("applies the request limiter before an upload body would be accepted", async () => {
    const limiter = new MemorySharedRateLimiter(1, 60_000);
    await expect(limiter.consume("global:public-upload")).resolves.toMatchObject({ kind: "allowed" });
    await expect(limiter.consume("global:public-upload")).resolves.toMatchObject({ kind: "limited" });
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
