import { describe, expect, it } from "vitest";

import {
  AuthorizationError,
  hasPermission,
  requirePermission,
} from "./permissions";

describe("permission matrix", () => {
  it("keeps publishing separate from editing", () => {
    expect(hasPermission("product_editor", "products.write")).toBe(true);
    expect(hasPermission("product_editor", "products.publish")).toBe(false);
    expect(hasPermission("reviewer_publisher", "products.publish")).toBe(true);
  });

  it("prevents sales users from changing SEO", () => {
    expect(() => requirePermission("sales", "seo.manage")).toThrow(
      AuthorizationError,
    );
  });

  it("allows administrators to perform every governed action", () => {
    expect(hasPermission("admin", "users.manage")).toBe(true);
    expect(hasPermission("admin", "audit.read")).toBe(true);
  });
});
