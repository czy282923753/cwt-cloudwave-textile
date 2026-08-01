import { ZodError } from "zod";

import { AuthorizationError } from "@/auth/permissions";

export type AdminActionErrorKind =
  | "validation"
  | "permission"
  | "conflict"
  | "network"
  | "unknown";

export type AdminActionResult =
  | {
      success: true;
      message: string;
      entityId?: string;
      intent: "refresh" | "redirect" | "none";
      redirectTo?: string;
    }
  | {
      success: false;
      message: string;
      formError: string;
      fieldErrors: Readonly<Record<string, readonly string[]>>;
      errorKind: AdminActionErrorKind;
      intent: "none";
    };

export function adminActionSuccess(message = "Changes saved."): AdminActionResult {
  return { success: true, message, intent: "refresh" };
}

function isNamedError(error: unknown): error is Error {
  return error instanceof Error;
}

function isInfrastructureError(message: string): boolean {
  return /\b(duplicate key|violates? (?:a )?(?:check|foreign key|not-null|unique) constraint|constraint ["']|database|postgres|sqlstate|syntax error|relation ["'].*["'] does not exist|connection (?:refused|closed|terminated)|query failed)\b/i.test(message);
}

export function adminActionFailure(error: unknown): AdminActionResult {
  if (error instanceof ZodError) {
    const flattened = error.flatten();
    return {
      success: false,
      message: "Check the highlighted information and try again.",
      formError: flattened.formErrors[0] ?? "Some fields are invalid.",
      fieldErrors: flattened.fieldErrors,
      errorKind: "validation",
      intent: "none",
    };
  }
  if (error instanceof AuthorizationError || (isNamedError(error) && error.name === "AuthorizationError")) {
    return {
      success: false,
      message: "You do not have permission to perform this operation.",
      formError: "Permission denied. Ask an administrator if this access is required.",
      fieldErrors: {},
      errorKind: "permission",
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
      errorKind: "permission",
      intent: "none",
    };
  }
  if (isInfrastructureError(message)) {
    return {
      success: false,
      message: "The operation failed safely; no partial change was committed.",
      formError: "Try again. If the problem continues, contact an administrator.",
      fieldErrors: {},
      errorKind: "unknown",
      intent: "none",
    };
  }
  if (
    name.includes("Conflict") ||
    /\b(conflict|collision|stale|already exists|already in use|changed before|optimistic)\b/i.test(message)
  ) {
    return {
      success: false,
      message: "This record changed or conflicts with another record.",
      formError: "Refresh the page, review the latest data, and try again.",
      fieldErrors: {},
      errorKind: "conflict",
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
      errorKind: "validation",
      intent: "none",
    };
  }
  return {
    success: false,
    message: "The operation failed safely; no partial change was committed.",
    formError: "Try again. If the problem continues, contact an administrator.",
    fieldErrors: {},
    errorKind: "unknown",
    intent: "none",
  };
}

export function adminNetworkFailure(): AdminActionResult {
  return {
    success: false,
    message: "The server could not be reached.",
    formError: "Check your connection and try again.",
    fieldErrors: {},
    errorKind: "network",
    intent: "none",
  };
}

export function adminActionHttpFailure(error: unknown): {
  error: string;
  errorKind: AdminActionErrorKind;
  status: number;
} {
  const result = adminActionFailure(error);
  if (result.success) throw new Error("Expected an Admin Action failure.");
  return {
    error: `${result.message} ${result.formError}`,
    errorKind: result.errorKind,
    status: result.errorKind === "permission" ? 403 : result.errorKind === "unknown" ? 500 : 400,
  };
}

export function isNextRedirect(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  return typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT");
}
