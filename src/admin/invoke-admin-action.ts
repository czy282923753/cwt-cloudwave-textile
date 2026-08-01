"use server";

import {
  adminActionFailure,
  adminActionSuccess,
  isNextRedirect,
  type AdminActionResult,
} from "./action-result";

export type AdminMutation = (form: FormData) => Promise<void>;

export async function invokeAdminAction(
  action: AdminMutation,
  form: FormData,
  successMessage: string,
): Promise<AdminActionResult> {
  try {
    await action(form);
    return adminActionSuccess(successMessage);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return adminActionFailure(error);
  }
}
