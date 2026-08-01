import { describe, expect, it } from "vitest";

import { conversionEvents } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import { assertPiiFreeProperties, recordConversionEvent } from "./conversion-service";

describe("Conversion Events privacy boundary", () => {
  it("stores allowlisted behavioral context without PII", async () => {
    const connection = await createTestDatabase();
    await recordConversionEvent(connection.db, {
      eventName: "quote_cta_click",
      anonymousSessionId: "8d9bfe9b-3168-4c47-86c0-06f7e1097a60",
      routePath: "/products/test-product",
      safeProperties: { placement: "product_hero", viewport: "mobile" },
    });
    const rows = await connection.db.select().from(conversionEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.safeProperties).toEqual({
      placement: "product_hero",
      viewport: "mobile",
    });
    await connection.close();
  });

  it("blocks PII-like keys and values", () => {
    expect(() => assertPiiFreeProperties({ email: "hidden" })).toThrow();
    expect(() =>
      assertPiiFreeProperties({ label: "buyer@example.test" }),
    ).toThrow();
    expect(() => assertPiiFreeProperties({ label: "+1 555 123 4567" })).toThrow();
  });
});
