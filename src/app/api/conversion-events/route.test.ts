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
        anonymousSessionId: "8d9bfe9b-3168-4c47-86c0-06f7e1097a60",
        consentState: "granted",
        routePath: "/products/test/",
        entityType: "product",
        entityId: "11111111-1111-4111-8111-111111111111",
      }),
    });
    await expect(POST(request)).resolves.toMatchObject({ status: 400 });
  });
});
