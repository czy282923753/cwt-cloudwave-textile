import { describe, expect, it } from "vitest";

import { AdminFieldValidationError } from "./action-result";
import { invokeAdminAction } from "./invoke-admin-action";

describe("invokeAdminAction", () => {
  it("preserves Entity ID and Redirect Intent from a successful mutation", async () => {
    const result = await invokeAdminAction(
      async () => ({
        entityId: "11111111-1111-4111-8111-111111111111",
        redirectTo: "/admin/products/11111111-1111-4111-8111-111111111111/",
      }),
      new FormData(),
      "Product created.",
    );
    expect(result).toEqual({
      success: true,
      message: "Product created.",
      entityId: "11111111-1111-4111-8111-111111111111",
      redirectTo: "/admin/products/11111111-1111-4111-8111-111111111111/",
      intent: "redirect",
      refresh: false,
    });
  });

  it("returns field errors and never emits a false success or redirect", async () => {
    const result = await invokeAdminAction(
      async () => {
        throw new AdminFieldValidationError({ title: ["title is required."] });
      },
      new FormData(),
      "Content created.",
    );
    expect(result).toMatchObject({
      success: false,
      errorCode: "VALIDATION_ERROR",
      fieldErrors: { title: ["title is required."] },
      intent: "none",
    });
    expect(result).not.toHaveProperty("redirectTo");
    expect(result).not.toHaveProperty("entityId");
  });
});
