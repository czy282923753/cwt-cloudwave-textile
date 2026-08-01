import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("public Conversion Event API privacy schema", () => {
  it("rejects a client-supplied internal entity UUID", async () => {
    const request = new Request("http://localhost:3000/api/conversion-events/", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
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
    const request = new Request("http://localhost:3000/api/conversion-events/", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
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
