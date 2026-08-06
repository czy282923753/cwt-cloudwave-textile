import { describe, expect, it } from "vitest";

import { hasPermission } from "@/auth/permissions";

describe("Product Import permission", () => {
  it("grants least privilege only to Admin and Product Editor", () => {
    expect(hasPermission("admin", "products.import")).toBe(true);
    expect(hasPermission("product_editor", "products.import")).toBe(true);
    for (const role of ["content_editor", "reviewer_publisher", "sales", "analyst"] as const) {
      expect(hasPermission(role, "products.import")).toBe(false);
    }
  });
});
