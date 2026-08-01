import { describe, expect, it } from "vitest";

import { LocalObjectStorage, verifyLocalReadGrant } from "./local";
import { assertSafeObjectKey } from "./safe-key";

describe("local object access grants", () => {
  it("accepts a current signed URL and rejects expired or altered grants", async () => {
    const storage = new LocalObjectStorage();
    const url = new URL(
      await storage.createReadUrl("private", "2026/01/sample.jpg", 300),
      "http://localhost",
    );
    const expires = Number(url.searchParams.get("expires"));
    const signature = url.searchParams.get("signature") ?? "";
    expect(
      verifyLocalReadGrant("private", "2026/01/sample.jpg", expires, signature),
    ).toBe(true);
    expect(
      verifyLocalReadGrant("private", "2026/01/other.jpg", expires, signature),
    ).toBe(false);
    expect(
      verifyLocalReadGrant("private", "2026/01/sample.jpg", 1, signature),
    ).toBe(false);
  });

  it("rejects traversal and absolute object keys", () => {
    expect(() => assertSafeObjectKey("../private/customer.jpg")).toThrow();
    expect(() => assertSafeObjectKey("/absolute/customer.jpg")).toThrow();
  });
});
