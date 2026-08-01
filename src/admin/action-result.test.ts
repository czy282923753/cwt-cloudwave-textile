import { describe, expect, it } from "vitest";
import { ZodError, z } from "zod";

import { AuthorizationError } from "@/auth/permissions";
import { AuditWriteError } from "@/audit/service";

import {
  AdminFieldValidationError,
  adminActionFailure,
  adminActionHttpFailure,
  adminNetworkFailure,
  adminActionSuccess,
} from "./action-result";

describe("Admin Action Result", () => {
  it("returns a typed success intent", () => {
    expect(adminActionSuccess("Saved.")).toEqual({
      success: true,
      message: "Saved.",
      intent: "refresh",
      refresh: true,
    });
    expect(adminActionSuccess("Created.", {
      entityId: "entity-1",
      redirectTo: "/admin/entities/entity-1/",
    })).toEqual({
      success: true,
      message: "Created.",
      entityId: "entity-1",
      redirectTo: "/admin/entities/entity-1/",
      intent: "redirect",
      refresh: false,
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
    expect(adminActionFailure(validation)).toMatchObject({ success: false, errorCode: "VALIDATION_ERROR" });
    expect(adminActionFailure(new AuthorizationError("analyst", "products.write"))).toMatchObject({ success: false, errorCode: "FORBIDDEN" });
    expect(adminActionFailure(Object.assign(new Error("stale revision"), { name: "RedirectConflictError" }))).toMatchObject({ success: false, errorCode: "CONFLICT" });
    const unknown = adminActionHttpFailure(new Error("duplicate key value violates unique constraint secret_table_key"));
    expect(unknown).toMatchObject({ errorCode: "CONFLICT", status: 400 });
    expect(unknown.error).not.toContain("secret_table_key");
  });

  it("preserves multiple field errors and classifies audit and network failures", () => {
    expect(adminActionFailure(new AdminFieldValidationError({
      name: ["name is required."],
      slug: ["slug is required."],
    }))).toMatchObject({
      success: false,
      errorCode: "VALIDATION_ERROR",
      fieldErrors: {
        name: ["name is required."],
        slug: ["slug is required."],
      },
    });
    expect(adminActionFailure(new AuditWriteError("audit insert failed"))).toMatchObject({
      success: false,
      errorCode: "AUDIT_FAILURE",
    });
    expect(adminNetworkFailure()).toMatchObject({
      success: false,
      errorCode: "NETWORK_ERROR",
    });
  });
});
