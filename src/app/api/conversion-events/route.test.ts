import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { env } from "@/config/env";

import { POST } from "./route";

const TEST_SITE_ORIGIN = new URL(env.NEXT_PUBLIC_SITE_URL).origin;

describe("public Conversion Event API privacy schema", () => {
  it("rejects a client-supplied internal entity UUID", async () => {
    const request = new Request(new URL("/api/conversion-events/", TEST_SITE_ORIGIN), {
      method: "POST",
      headers: {
        origin: TEST_SITE_ORIGIN,
        "content-type": "application/json",
        "x-cwt-client-address": "192.0.2.10",
      },
      body: JSON.stringify({
        eventId: "evt_reject_internal_entity_0001",
        eventName: "product_view",
        routePath: "/products/test/",
        entityType: "product",
        entityId: "11111111-1111-4111-8111-111111111111",
      }),
    });
    await expect(POST(request)).resolves.toMatchObject({ status: 400 });
  });

  it("rejects a client-forged Granted field instead of treating it as authority", async () => {
    const request = new Request(new URL("/api/conversion-events/", TEST_SITE_ORIGIN), {
      method: "POST",
      headers: {
        origin: TEST_SITE_ORIGIN,
        "content-type": "application/json",
        "x-cwt-client-address": "192.0.2.10",
      },
      body: JSON.stringify({
        eventId: "evt_forged_granted_0001",
        eventName: "quote_cta_click",
        routePath: "/get-quote/",
        consentState: "granted",
      }),
    });
    await expect(POST(request)).resolves.toMatchObject({ status: 400 });
  });
});
