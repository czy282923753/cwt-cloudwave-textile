import { ZodError } from "zod";

import { AuthorizationError } from "@/auth/permissions";
import { AuditWriteError } from "@/audit/service";

export type AdminActionErrorCode =
  | "VALIDATION_ERROR"
  | "FORBIDDEN"
  | "CONFLICT"
  | "NOT_FOUND"
  | "AUDIT_FAILURE"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export interface AdminMutationOutcome {
  entityId?: string;
  redirectTo?: string;
  refresh?: boolean;
}

export type AdminActionResult =
  | {
      success: true;
      message: string;
      entityId?: string;
      intent: "refresh" | "redirect" | "none";
      redirectTo?: string;
      refresh: boolean;
    }
  | {
      success: false;
      message: string;
      formError: string;
      fieldErrors: Readonly<Record<string, readonly string[]>>;
      errorCode: AdminActionErrorCode;
      intent: "none";
    };

export class AdminFieldValidationError extends Error {
  constructor(
    public readonly fieldErrors: Readonly<Record<string, readonly string[]>>,
    message = "Some submitted fields are invalid.",
  ) {
    super(message);
    this.name = "AdminFieldValidationError";
  }
}

export function adminActionSuccess(
  message = "Changes saved.",
  outcome: AdminMutationOutcome = {},
): AdminActionResult {
  const refresh = outcome.refresh ?? !outcome.redirectTo;
  return {
    success: true,
    message,
    ...(outcome.entityId ? { entityId: outcome.entityId } : {}),
    ...(outcome.redirectTo ? { redirectTo: outcome.redirectTo } : {}),
    intent: outcome.redirectTo ? "redirect" : refresh ? "refresh" : "none",
    refresh,
  };
}

function isNamedError(error: unknown): error is Error {
  return error instanceof Error;
}

function isInfrastructureError(message: string): boolean {
  return /\b(duplicate key|violates? (?:a )?(?:check|foreign key|not-null|unique) constraint|constraint ["']|database|postgres|sqlstate|syntax error|relation ["'].*["'] does not exist|connection (?:refused|closed|terminated)|query failed)\b/i.test(message);
}

export function adminActionFailure(error: unknown): AdminActionResult {
  if (error instanceof AdminFieldValidationError) {
    return {
      success: false,
      message: "Check the highlighted information and try again.",
      formError: error.message,
      fieldErrors: error.fieldErrors,
      errorCode: "VALIDATION_ERROR",
      intent: "none",
    };
  }
  if (error instanceof ZodError) {
    const flattened = error.flatten();
    return {
      success: false,
      message: "Check the highlighted information and try again.",
      formError: flattened.formErrors[0] ?? "Some fields are invalid.",
      fieldErrors: flattened.fieldErrors,
      errorCode: "VALIDATION_ERROR",
      intent: "none",
    };
  }
  if (error instanceof AuthorizationError || (isNamedError(error) && error.name === "AuthorizationError")) {
    return {
      success: false,
      message: "You do not have permission to perform this operation.",
      formError: "Permission denied. Ask an administrator if this access is required.",
      fieldErrors: {},
      errorCode: "FORBIDDEN",
      intent: "none",
    };
  }
  const message = isNamedError(error) ? error.message : "";
  const name = isNamedError(error) ? error.name : "";
  if (/\b(authentication required|session (?:is )?(?:invalid|expired)|sign in)\b/i.test(message)) {
    return {
      success: false,
      message: "You do not have permission to perform this operation.",
      formError: "Your session is unavailable or expired. Sign in and try again.",
      fieldErrors: {},
      errorCode: "FORBIDDEN",
      intent: "none",
    };
  }
  if (error instanceof AuditWriteError || name === "AuditWriteError" || /\baudit (?:log )?(?:write|insert|failure|failed)\b/i.test(message)) {
    return {
      success: false,
      message: "The operation was rolled back because its Audit record could not be saved.",
      formError: "No partial business change was committed. Try again or contact an administrator.",
      fieldErrors: {},
      errorCode: "AUDIT_FAILURE",
      intent: "none",
    };
  }
  if (
    name.includes("Conflict") ||
    /\b(conflict|collision|stale|already exists|already in use|changed before|optimistic|duplicate key|unique constraint)\b/i.test(message)
  ) {
    return {
      success: false,
      message: "This record changed or conflicts with another record.",
      formError: "Refresh the page, review the latest data, and try again.",
      fieldErrors: {},
      errorCode: "CONFLICT",
      intent: "none",
    };
  }
  if (isInfrastructureError(message)) {
    return {
      success: false,
      message: "The operation failed safely; no partial change was committed.",
      formError: "Try again. If the problem continues, contact an administrator.",
      fieldErrors: {},
      errorCode: "UNKNOWN_ERROR",
      intent: "none",
    };
  }
  if (/\bnot found\b/i.test(message)) {
    return {
      success: false,
      message: "The requested record was not found.",
      formError: "Refresh the page and confirm that the record still exists.",
      fieldErrors: {},
      errorCode: "NOT_FOUND",
      intent: "none",
    };
  }
  if (
    name.includes("Validation") ||
    /\b(required|invalid|incomplete|must|cannot|only|requires|not found|unavailable|exceeds|outside|does not match|size limit)\b/i.test(message)
  ) {
    return {
      success: false,
      message: "The operation could not be completed with the submitted data.",
      formError: message.slice(0, 300) || "Review the form and try again.",
      fieldErrors: {},
      errorCode: "VALIDATION_ERROR",
      intent: "none",
    };
  }
  return {
    success: false,
    message: "The operation failed safely; no partial change was committed.",
    formError: "Try again. If the problem continues, contact an administrator.",
    fieldErrors: {},
    errorCode: "UNKNOWN_ERROR",
    intent: "none",
  };
}

export function adminNetworkFailure(): AdminActionResult {
  return {
    success: false,
    message: "The server could not be reached.",
    formError: "Check your connection and try again.",
    fieldErrors: {},
    errorCode: "NETWORK_ERROR",
    intent: "none",
  };
}

export function adminActionHttpFailure(error: unknown): {
  error: string;
  errorCode: AdminActionErrorCode;
  status: number;
} {
  const result = adminActionFailure(error);
  if (result.success) throw new Error("Expected an Admin Action failure.");
  return {
    error: `${result.message} ${result.formError}`,
    errorCode: result.errorCode,
    status: result.errorCode === "FORBIDDEN"
      ? 403
      : result.errorCode === "NOT_FOUND"
        ? 404
        : result.errorCode === "UNKNOWN_ERROR" || result.errorCode === "AUDIT_FAILURE"
          ? 500
          : 400,
  };
}
