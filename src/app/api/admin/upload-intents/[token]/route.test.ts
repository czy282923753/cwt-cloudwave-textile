import { describe, expect, it, vi } from "vitest";

import { PUT } from "./route";

describe("Admin Upload Intent binary API pre-body guard", () => {
  it("rejects an oversized binary request before authentication or body buffering", async () => {
    const request = new Request("http://localhost:3000/api/admin/upload-intents/test-token/", {
      method: "PUT",
      headers: { origin: "http://localhost:3000", "content-length": "999999999", "content-type": "image/jpeg" },
      body: new Uint8Array([1]),
    });
    const arrayBuffer = vi.spyOn(request, "arrayBuffer");
    const formData = vi.spyOn(request, "formData");
    const response = await PUT(request, { params: Promise.resolve({ token: "test-token" }) });
    expect(response.status).toBe(400);
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(formData).not.toHaveBeenCalled();
  });
});
