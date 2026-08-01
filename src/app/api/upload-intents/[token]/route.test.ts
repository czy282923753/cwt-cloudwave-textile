import { describe, expect, it, vi } from "vitest";

import { PUT } from "./route";

describe("Upload Intent binary API pre-body guard", () => {
  it("rejects an oversized binary request without reading its body", async () => {
    const request = new Request("http://localhost:3000/api/upload-intents/test-token/", {
      method: "PUT",
      headers: {
        origin: "http://localhost:3000",
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
