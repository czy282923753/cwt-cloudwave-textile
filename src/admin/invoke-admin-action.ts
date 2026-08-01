"use server";

import {
  adminActionFailure,
  adminActionSuccess,
  type AdminActionResult,
  type AdminMutationOutcome,
} from "./action-result";

export type AdminMutation = (form: FormData) => Promise<AdminMutationOutcome>;

export async function invokeAdminAction(
  action: AdminMutation,
  form: FormData,
  successMessage: string,
): Promise<AdminActionResult> {
  try {
    const outcome = await action(form);
    return adminActionSuccess(successMessage, outcome);
  } catch (error) {
    return adminActionFailure(error);
  }
}
