import { describe, expect, it, vi } from "vitest";

import { POST } from "./route";

describe("Upload Intent API pre-body guard", () => {
  it("rejects an oversized request without parsing JSON", async () => {
    const request = new Request("http://localhost:3000/api/upload-intents/", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-length": "999999",
        "content-type": "application/json",
      },
      body: "{}",
    });
    const json = vi.spyOn(request, "json");
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(json).not.toHaveBeenCalled();
  });
});
