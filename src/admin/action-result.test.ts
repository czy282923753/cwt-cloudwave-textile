import { describe, expect, it } from "vitest";
import { ZodError, z } from "zod";

import { AuthorizationError } from "@/auth/permissions";

import {
  adminActionFailure,
  adminActionHttpFailure,
  adminActionSuccess,
} from "./action-result";

describe("Admin Action Result", () => {
  it("returns a typed success intent", () => {
    expect(adminActionSuccess("Saved.")).toEqual({
      success: true,
      message: "Saved.",
      intent: "refresh",
    });
  });

  it("classifies validation, permission, conflict, and unknown failures without raw database errors", () => {
    let validation: ZodError;
    try {
      z.object({ name: z.string().min(1) }).parse({ name: "" });
      throw new Error("Expected validation failure.");
    } catch (error) {
      if (!(error instanceof ZodError)) throw error;
      validation = error;
    }
    expect(adminActionFailure(validation)).toMatchObject({ success: false, errorKind: "validation" });
    expect(adminActionFailure(new AuthorizationError("analyst", "products.write"))).toMatchObject({ success: false, errorKind: "permission" });
    expect(adminActionFailure(Object.assign(new Error("stale revision"), { name: "RedirectConflictError" }))).toMatchObject({ success: false, errorKind: "conflict" });
    const unknown = adminActionHttpFailure(new Error("duplicate key value violates unique constraint secret_table_key"));
    expect(unknown).toMatchObject({ errorKind: "unknown", status: 500 });
    expect(unknown.error).not.toContain("secret_table_key");
  });
});
