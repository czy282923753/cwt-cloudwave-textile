import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { env } from "@/config/env";

import { POST } from "./route";

const TEST_SITE_ORIGIN = new URL(env.NEXT_PUBLIC_SITE_URL).origin;

describe("Upload Intent API pre-body guard", () => {
  it("rejects an oversized request without parsing JSON", async () => {
    const request = new Request(new URL("/api/upload-intents/", TEST_SITE_ORIGIN), {
      method: "POST",
      headers: {
        origin: TEST_SITE_ORIGIN,
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
