import { describe, expect, it, vi } from "vitest";

import { env } from "@/config/env";

import { PUT } from "./route";

const TEST_SITE_ORIGIN = new URL(env.NEXT_PUBLIC_SITE_URL).origin;

describe("Upload Intent binary API pre-body guard", () => {
  it("rejects an oversized binary request without reading its body", async () => {
    const request = new Request(new URL("/api/upload-intents/test-token/", TEST_SITE_ORIGIN), {
      method: "PUT",
      headers: {
        origin: TEST_SITE_ORIGIN,
        "content-length": "999999999",
        "content-type": "image/jpeg",
        "x-cwt-upload-session": "11111111-1111-4111-8111-111111111111",
      },
      body: new Uint8Array([1]),
    });
    const arrayBuffer = vi.spyOn(request, "arrayBuffer");
    const response = await PUT(request, {
      params: Promise.resolve({ token: "test-token" }),
    });
    expect(response.status).toBe(400);
    expect(arrayBuffer).not.toHaveBeenCalled();
  });
});
