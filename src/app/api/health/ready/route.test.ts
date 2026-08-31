import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ readiness: vi.fn() }));

vi.mock("@/operations/readiness-runtime", () => ({ runApplicationReadiness: mocks.readiness }));

import { GET } from "./route";

describe("readiness endpoint", () => {
  beforeEach(() => mocks.readiness.mockReset());

  it("returns a redacted 200 contract for ready dependencies", async () => {
    mocks.readiness.mockResolvedValue({
      status: "ready",
      checks: { configuration: "pass", storage: "pass", database: "pass", valkey: "pass", local_dependencies: "pass" },
    });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      status: "ready",
      checks: { configuration: "pass", storage: "pass", database: "pass", valkey: "pass", local_dependencies: "pass" },
    });
  });

  it("returns only fixed component states on failure", async () => {
    mocks.readiness.mockResolvedValue({
      status: "not_ready",
      checks: { configuration: "pass", storage: "pass", database: "fail", valkey: "pass", local_dependencies: "pass" },
    });
    const response = await GET();
    const body = JSON.stringify(await response.json());
    expect(response.status).toBe(503);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    expect(body).not.toMatch(/secret|hostname|filesystem|inquiry|contact|asset|uuid|postgres:/iu);
  });
});
