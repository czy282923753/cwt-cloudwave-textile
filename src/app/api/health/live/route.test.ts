import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("liveness endpoint", () => {
  it("returns only the process liveness contract", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    expect(await response.json()).toEqual({ status: "live" });
  });
});
