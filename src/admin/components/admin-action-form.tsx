"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type FormHTMLAttributes,
  type ReactNode,
} from "react";

import {
  adminNetworkFailure,
  type AdminActionResult,
} from "@/admin/action-result";
import {
  invokeAdminAction,
  type AdminMutation,
} from "@/admin/invoke-admin-action";

type AdminActionFormProps = Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "action" | "onSubmit" | "children"
> & {
  action: AdminMutation;
  beforeSubmit?: (form: HTMLFormElement) => boolean;
  children: ReactNode;
  successMessage?: string;
};

export function AdminActionForm({
  action,
  beforeSubmit,
  children,
  successMessage = "Changes saved.",
  ...formProps
}: Readonly<AdminActionFormProps>) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AdminActionResult | null>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    for (const element of form.querySelectorAll<HTMLElement>("[aria-invalid='true']")) {
      element.removeAttribute("aria-invalid");
      element.removeAttribute("aria-describedby");
    }
    if (result && !result.success) {
      for (const field of Object.keys(result.fieldErrors)) {
        const control = form.elements.namedItem(field);
        if (control instanceof HTMLElement) {
          control.setAttribute("aria-invalid", "true");
          control.setAttribute("aria-describedby", `admin-field-error-${field}`);
        }
      }
      errorSummaryRef.current?.focus();
    }
  }, [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || pending) return;
    const form = event.currentTarget;
    if (beforeSubmit && !beforeSubmit(form)) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    submittingRef.current = true;
    setPending(true);
    setResult(null);
    const data = new FormData(form);
    try {
      const nextResult = await invokeAdminAction(action, data, successMessage);
      setResult(nextResult);
      if (nextResult.success && nextResult.intent === "refresh") {
        setTimeout(() => router.refresh(), 0);
      }
      if (nextResult.success && nextResult.intent === "redirect" && nextResult.redirectTo) {
        const redirectTo = nextResult.redirectTo;
        setTimeout(() => router.push(redirectTo), 0);
      }
    } catch {
      setResult(adminNetworkFailure());
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  }

  return (
    <form {...formProps} aria-busy={pending} onSubmit={submit} ref={formRef}>
      <fieldset className="contents" disabled={pending}>
        {children}
      </fieldset>
      <div aria-live="polite" className="mt-3 text-sm" role="status">
        {pending ? "Saving…" : result?.success ? result.message : null}
      </div>
      {result && !result.success ? (
        <div
          aria-live="assertive"
          className="mt-3 rounded-lg border border-red-300/40 bg-red-950/30 p-3 text-sm text-red-100"
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
        >
          <p className="font-semibold">{result.message}</p>
          <p>{result.formError}</p>
          {Object.entries(result.fieldErrors).length ? (
            <ul className="mt-2 list-disc pl-5">
              {Object.entries(result.fieldErrors).flatMap(([field, messages]) =>
                messages.map((message, index) => (
                  <li id={index === 0 ? `admin-field-error-${field}` : undefined} key={`${field}:${message}`}>
                    {field}: {message}
                  </li>
                )),
              )}
            </ul>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
