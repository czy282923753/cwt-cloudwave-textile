"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  COUNTRY_CODE_ERROR_MESSAGE,
  COUNTRY_OPTIONS,
  isIsoAlpha2CountryCode,
  normalizeOptionalCountryCode,
} from "@/crm/country-codes";

import { captureAttribution, trackPublicEvent } from "./tracking";

const INQUIRY_SUBMIT_TIMEOUT_MS = 20_000;
const MAX_VISIBLE_FILE_NAME_LENGTH = 72;

interface FileSelection {
  count: number;
  status: string;
}

const EMPTY_FILE_SELECTION: FileSelection = {
  count: 0,
  status: "No files selected",
};

function safeVisibleFileName(name: string): string {
  const leafName = name.split(/[\\/]/).at(-1)?.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  const safeName = leafName || "Selected file";
  if (safeName.length <= MAX_VISIBLE_FILE_NAME_LENGTH) return safeName;
  return `${safeName.slice(0, 48)}…${safeName.slice(-20)}`;
}

function fileSelectionFrom(input: HTMLInputElement): FileSelection {
  const files = Array.from(input.files ?? []);
  if (files.length === 0) return EMPTY_FILE_SELECTION;
  if (files.length === 1) {
    return { count: 1, status: safeVisibleFileName(files[0]!.name) };
  }
  return { count: files.length, status: `${files.length} files selected` };
}

interface InquiryDraft {
  name: string;
  email: string;
  countryCode: string;
  whatsapp: string;
  description: string;
  website: string;
}

interface InquiryRequestPayload {
  name: string;
  email: string;
  countryCode: string | null;
  whatsapp: string | null;
  description: string | null;
  uploadTokens: string[];
  sourcePagePath: string;
  landingPagePath: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  lastNonDirectSource: string | null;
  lastNonDirectMedium: string | null;
  lastNonDirectCampaign: string | null;
  attributionConfidence: "high" | "medium" | "low" | "unavailable";
  anonymousSessionId: string;
  idempotencyKey: string;
  website: string | null;
}

interface FrozenInquiryAttempt {
  payload: InquiryRequestPayload;
  attachmentNames: string[];
}

type InquiryFormState =
  | { kind: "draft"; message?: string }
  | { kind: "uploading" }
  | { kind: "submitting"; attempt: FrozenInquiryAttempt }
  | { kind: "uncertain"; attempt: FrozenInquiryAttempt; message: string }
  | { kind: "definitive_error"; attempt: FrozenInquiryAttempt; message: string }
  | { kind: "success"; reference: string };

function safeResponseMessage(result: unknown, fallback: string): string {
  return typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
    ? result.error
    : fallback;
}

function isSuccessfulInquiryResult(
  result: unknown,
): result is { ok: true; reference: string; replayed?: boolean } {
  return typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    result.ok === true &&
    "reference" in result &&
    typeof result.reference === "string";
}

export function InquiryForm({
  compact = false,
  initialDescription = "",
}: Readonly<{ compact?: boolean; initialDescription?: string }>) {
  const pathname = usePathname();
  const frozenAttempt = useRef<FrozenInquiryAttempt | null>(null);
  const operationInFlight = useRef(false);
  const rejectedCountryText = useRef(false);
  const countryInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<InquiryDraft>({
    name: "",
    email: "",
    countryCode: "",
    whatsapp: "",
    description: initialDescription,
    website: "",
  });
  const [state, setState] = useState<InquiryFormState>({ kind: "draft" });
  const [countryError, setCountryError] = useState<string | null>(null);
  const [fileSelection, setFileSelection] = useState<FileSelection>(
    EMPTY_FILE_SELECTION,
  );

  useEffect(() => {
    if (state.kind === "uncertain" || state.kind === "definitive_error") {
      feedback.current?.focus();
    }
  }, [state.kind]);

  const updateDraft = (field: keyof InquiryDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const updateCountryCode = (input: HTMLInputElement) => {
    const value = input.value.toUpperCase();
    const invalid = value.length > 2 || (value !== "" && !isIsoAlpha2CountryCode(value));
    const message = invalid ? COUNTRY_CODE_ERROR_MESSAGE : "";
    rejectedCountryText.current = value.length > 2;
    input.setCustomValidity(message);
    setCountryError(message || null);
    if (value.length <= 2) updateDraft("countryCode", value);
  };

  const rejectCountryText = (input: HTMLInputElement) => {
    rejectedCountryText.current = true;
    input.setCustomValidity(COUNTRY_CODE_ERROR_MESSAGE);
    setCountryError(COUNTRY_CODE_ERROR_MESSAGE);
  };

  const syncFileSelection = (input: HTMLInputElement) => {
    setFileSelection(fileSelectionFrom(input));
  };

  const clearFiles = () => {
    if (!fileInput.current) return;
    fileInput.current.value = "";
    syncFileSelection(fileInput.current);
  };

  async function sendFrozenAttempt(attempt: FrozenInquiryAttempt): Promise<void> {
    let response: Response;
    try {
      response = await fetch("/api/inquiries/", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": attempt.payload.idempotencyKey,
          "x-cwt-upload-session": attempt.payload.anonymousSessionId,
        },
        body: JSON.stringify(attempt.payload),
        signal: AbortSignal.timeout(INQUIRY_SUBMIT_TIMEOUT_MS),
      });
    } catch {
      setState({
        kind: "uncertain",
        attempt,
        message:
          "We could not confirm the response. Retry the same submission without uploading again.",
      });
      return;
    }

    let result: unknown;
    try {
      result = await response.json();
    } catch {
      if (response.ok || response.status >= 500) {
        setState({
          kind: "uncertain",
          attempt,
          message:
            "The server response was interrupted. Retry the same submission without uploading again.",
        });
      } else {
        setState({
          kind: "definitive_error",
          attempt,
          message: "The submission was rejected. Review it and start a new inquiry.",
        });
      }
      return;
    }

    if (response.status >= 500) {
      setState({
        kind: "uncertain",
        attempt,
        message:
          "The result is not yet confirmed. Retry the same submission without uploading again.",
      });
      return;
    }

    if (!response.ok || !isSuccessfulInquiryResult(result)) {
      setState({
        kind: "definitive_error",
        attempt,
        message: safeResponseMessage(
          result,
          "The submission could not be accepted. Review it and start a new inquiry.",
        ),
      });
      return;
    }

    frozenAttempt.current = null;
    trackPublicEvent("quote_submit_success", pathname, {
      placement: compact ? "compact_form" : "quote_page",
    });
    setState({ kind: "success", reference: result.reference });
  }

  async function submitDraft(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (operationInFlight.current || frozenAttempt.current) return;
    if (rejectedCountryText.current) {
      countryInput.current?.setCustomValidity(COUNTRY_CODE_ERROR_MESSAGE);
      setCountryError(COUNTRY_CODE_ERROR_MESSAGE);
      countryInput.current?.reportValidity();
      return;
    }
    let countryCode: string | null;
    try {
      countryCode = normalizeOptionalCountryCode(draft.countryCode);
    } catch {
      countryInput.current?.setCustomValidity(COUNTRY_CODE_ERROR_MESSAGE);
      setCountryError(COUNTRY_CODE_ERROR_MESSAGE);
      countryInput.current?.reportValidity();
      return;
    }
    operationInFlight.current = true;
    setState({ kind: "uploading" });
    const attribution = captureAttribution();
    const files = Array.from(fileInput.current?.files ?? []).filter((file) => file.size > 0);
    const idempotencyKey = crypto.randomUUID();

    try {
      const uploadTokens: string[] = [];
      for (const file of files) {
        const intentResponse = await fetch("/api/upload-intents/", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-cwt-upload-session": attribution.anonymousSessionId,
          },
          body: JSON.stringify({
            anonymousSessionId: attribution.anonymousSessionId,
            fileName: file.name,
            declaredMimeType: file.type,
            declaredByteSize: file.size,
          }),
        });
        const intent = (await intentResponse.json()) as {
          ok?: boolean;
          token?: string;
          uploadUrl?: string;
          error?: string;
        };
        if (!intentResponse.ok || intent.ok !== true || !intent.token || !intent.uploadUrl) {
          throw new Error(intent.error ?? "Image upload could not be prepared.");
        }
        const uploadResponse = await fetch(intent.uploadUrl, {
          method: "PUT",
          headers: {
            "content-type": file.type,
            "x-cwt-upload-session": attribution.anonymousSessionId,
          },
          body: file,
        });
        if (!uploadResponse.ok) {
          const uploadResult = (await uploadResponse.json()) as { error?: string };
          throw new Error(uploadResult.error ?? "Image upload failed.");
        }
        uploadTokens.push(intent.token);
      }

      const attempt: FrozenInquiryAttempt = {
        attachmentNames: files.map((file) => safeVisibleFileName(file.name)),
        payload: {
          name: draft.name,
          email: draft.email,
          countryCode,
          whatsapp: draft.whatsapp || null,
          description: draft.description || null,
          uploadTokens,
          sourcePagePath: pathname,
          landingPagePath: attribution.landingPagePath || null,
          referrer: attribution.referrerOrigin || null,
          utmSource: attribution.utmSource || null,
          utmMedium: attribution.utmMedium || null,
          utmCampaign: attribution.utmCampaign || null,
          lastNonDirectSource: attribution.lastNonDirectSource || null,
          lastNonDirectMedium: attribution.lastNonDirectMedium || null,
          lastNonDirectCampaign: attribution.lastNonDirectCampaign || null,
          attributionConfidence: attribution.attributionConfidence,
          anonymousSessionId: attribution.anonymousSessionId,
          idempotencyKey,
          website: draft.website || null,
        },
      };
      frozenAttempt.current = attempt;
      setState({ kind: "submitting", attempt });
      await sendFrozenAttempt(attempt);
    } catch (error) {
      setState({
        kind: "draft",
        message:
          error instanceof Error
            ? error.message
            : "Image upload was interrupted. Please try again.",
      });
    } finally {
      operationInFlight.current = false;
    }
  }

  async function retryFrozenAttempt(): Promise<void> {
    const attempt = frozenAttempt.current;
    if (!attempt || state.kind !== "uncertain" || operationInFlight.current) return;
    operationInFlight.current = true;
    setState({ kind: "submitting", attempt });
    try {
      await sendFrozenAttempt(attempt);
    } finally {
      operationInFlight.current = false;
    }
  }

  function startNewInquiry(): void {
    if (operationInFlight.current) return;
    frozenAttempt.current = null;
    setState({
      kind: "draft",
      message:
        "A new submission will use a new request key and upload the selected images again.",
    });
  }

  if (state.kind === "success") {
    return (
      <div
        className="rounded-[1.5rem] border border-emerald-600/20 bg-emerald-50 p-6 text-emerald-950"
        role="status"
      >
        <h2 className="text-xl font-semibold">Requirement received</h2>
        <p className="mt-2 text-sm leading-6">
          Our team can now review your description or private images. Reference: {state.reference}
        </p>
      </div>
    );
  }

  const isBusy = state.kind === "uploading" || state.kind === "submitting";
  const hasFrozenResult = state.kind === "uncertain" || state.kind === "definitive_error";
  const frozenSummary = hasFrozenResult ? state.attempt : null;

  return (
    <form className="inquiry-form grid gap-5" data-inquiry-form="true" onSubmit={(event) => void submitDraft(event)}>
      <fieldset className="contents" disabled={isBusy || hasFrozenResult}>
        <div className={compact ? "grid gap-4 sm:grid-cols-2" : "grid gap-5 sm:grid-cols-2"}>
          <label className="form-field">
            Name
            <input
              autoComplete="name"
              name="name"
              onChange={(event) => updateDraft("name", event.currentTarget.value)}
              required
              value={draft.name}
            />
          </label>
          <label className="form-field">
            Email
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => updateDraft("email", event.currentTarget.value)}
              required
              type="email"
              value={draft.email}
            />
          </label>
          <div className="form-field">
            <label htmlFor="inquiry-country">Country</label>
            <input
              aria-describedby={`inquiry-country-help${countryError ? " inquiry-country-error" : ""}`}
              aria-invalid={countryError ? true : undefined}
              autoCapitalize="characters"
              autoComplete="off"
              id="inquiry-country"
              list="inquiry-country-options"
              maxLength={2}
              name="countryCode"
              onBeforeInput={(event) => {
                const input = event.currentTarget;
                const inserted = (event.nativeEvent as InputEvent).data ?? "";
                const selectedLength =
                  Math.max(0, (input.selectionEnd ?? 0) - (input.selectionStart ?? 0));
                if (input.value.length - selectedLength + inserted.length > 2) {
                  event.preventDefault();
                  rejectCountryText(input);
                }
              }}
              onBlur={(event) => {
                if (rejectedCountryText.current) {
                  rejectCountryText(event.currentTarget);
                  return;
                }
                updateCountryCode(event.currentTarget);
              }}
              onChange={(event) => updateCountryCode(event.currentTarget)}
              onPaste={(event) => {
                if (event.clipboardData.getData("text").trim().length > 2) {
                  event.preventDefault();
                  rejectCountryText(event.currentTarget);
                }
              }}
              pattern="[A-Za-z]{2}"
              placeholder="Select or enter code"
              ref={countryInput}
              spellCheck={false}
              value={draft.countryCode}
            />
            <datalist id="inquiry-country-options">
              {COUNTRY_OPTIONS.map((country) => (
                <option
                  key={country.code}
                  label={`${country.name} (${country.code})`}
                  value={country.code}
                />
              ))}
            </datalist>
            <span className="text-xs font-normal text-[#586B73]" id="inquiry-country-help">
              Select a country or enter its 2-letter code (optional).
            </span>
            {countryError ? (
              <span className="text-xs font-normal text-red-700" id="inquiry-country-error">
                {countryError}
              </span>
            ) : null}
          </div>
          <label className="form-field">
            WhatsApp
            <input
              autoComplete="tel"
              name="whatsapp"
              onChange={(event) => updateDraft("whatsapp", event.currentTarget.value)}
              placeholder="Optional"
              value={draft.whatsapp}
            />
          </label>
        </div>
        <label className="form-field">
          Describe what you need
          <textarea
            name="description"
            onChange={(event) => updateDraft("description", event.currentTarget.value)}
            placeholder="Use, feel, stretch, color, quantity—or leave blank and upload an image."
            rows={compact ? 3 : 5}
            value={draft.description}
          />
        </label>
        <div className="form-field">
          <label htmlFor="inquiry-images">Upload fabric images</label>
          <input
            accept="image/jpeg,image/png,image/webp"
            aria-describedby="inquiry-images-help inquiry-images-status"
            className="inquiry-file-input"
            id="inquiry-images"
            multiple
            name="images"
            onChange={(event) => {
              syncFileSelection(event.currentTarget);
              if (event.currentTarget.files?.length) {
                trackPublicEvent("upload_started", pathname, {
                  file_count: event.currentTarget.files.length,
                });
              }
            }}
            ref={fileInput}
            tabIndex={-1}
            type="file"
          />
          <div className="inquiry-file-picker">
            <button
              aria-controls="inquiry-images"
              aria-describedby="inquiry-images-help inquiry-images-status"
              className="button-secondary"
              onClick={() => fileInput.current?.click()}
              type="button"
            >
              Choose files
            </button>
            <span
              aria-live="polite"
              className="min-w-0 text-sm font-normal text-[#586B73]"
              data-file-selection-status="true"
              id="inquiry-images-status"
            >
              {fileSelection.status}
            </span>
            {fileSelection.count > 0 ? (
              <button
                className="text-link text-sm"
                onClick={clearFiles}
                type="button"
              >
                Clear files
              </button>
            ) : null}
          </div>
          <span className="text-xs font-normal text-[#586B73]" id="inquiry-images-help">
            JPG, PNG or WebP. Files remain private and use expiring access.
          </span>
        </div>
        <div aria-hidden="true" className="hidden">
          <label>
            Website
            <input
              autoComplete="off"
              name="website"
              onChange={(event) => updateDraft("website", event.currentTarget.value)}
              tabIndex={-1}
              value={draft.website}
            />
          </label>
        </div>
      </fieldset>

      {isBusy ? (
        <p aria-live="polite" className="text-sm text-[#586B73]" role="status">
          {state.kind === "uploading"
            ? "Uploading private images securely…"
            : "Submitting the frozen request…"}
        </p>
      ) : null}

      {state.kind === "draft" && state.message ? (
        <p className="text-sm text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}

      {hasFrozenResult && frozenSummary ? (
        <div
          aria-live="assertive"
          className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
          ref={feedback}
          role="alert"
          tabIndex={-1}
        >
          <h2 className="font-semibold">
            {state.kind === "uncertain"
              ? "Submission outcome uncertain"
              : "Submission needs a new attempt"}
          </h2>
          <p className="mt-2">{state.message}</p>
          <dl className="mt-3 grid gap-1">
            <div>
              <dt className="inline font-medium">Name: </dt>
              <dd className="inline">{frozenSummary.payload.name}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Email: </dt>
              <dd className="inline">{frozenSummary.payload.email}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Images: </dt>
              <dd className="inline">
                {frozenSummary.attachmentNames.length
                  ? frozenSummary.attachmentNames.join(", ")
                  : "None"}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            {state.kind === "uncertain" ? (
              <button
                className="button-primary"
                onClick={() => void retryFrozenAttempt()}
                type="button"
              >
                Retry same submission
              </button>
            ) : null}
            <button className="button-secondary" onClick={startNewInquiry} type="button">
              Edit and start over
            </button>
          </div>
          {state.kind === "uncertain" ? (
            <p className="mt-3 text-xs">
              Retrying reuses the same secure upload and does not create another Inquiry.
            </p>
          ) : null}
        </div>
      ) : null}

      {!hasFrozenResult ? (
        <button className="button-primary justify-center" disabled={isBusy} type="submit">
          {isBusy ? "Sending securely…" : "Find Your Fabric Solution"}
        </button>
      ) : null}
      <p className="text-xs leading-5 text-[#586B73]">
        Name and Email are required. Add either a description or at least one image.
      </p>
    </form>
  );
}
