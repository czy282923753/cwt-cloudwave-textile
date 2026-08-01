"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
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
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminActionResult | null>(null);

  useEffect(() => {
    if (result && !result.success) errorSummaryRef.current?.focus();
  }, [result]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || pending) return;
    const form = event.currentTarget;
    if (beforeSubmit && !beforeSubmit(form)) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    submittingRef.current = true;
    setResult(null);
    const data = new FormData(form);
    startTransition(async () => {
      try {
        const nextResult = await invokeAdminAction(action, data, successMessage);
        setResult(nextResult);
        if (nextResult.success && nextResult.intent === "refresh") router.refresh();
      } catch {
        setResult(adminNetworkFailure());
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <form {...formProps} aria-busy={pending} onSubmit={submit}>
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
                messages.map((message) => <li key={`${field}:${message}`}>{field}: {message}</li>),
              )}
            </ul>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
