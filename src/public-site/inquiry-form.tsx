"use client";

import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

import { captureAttribution, trackPublicEvent } from "./tracking";

export function InquiryForm({
  compact = false,
  initialDescription = "",
}: Readonly<{ compact?: boolean; initialDescription?: string }>) {
  const pathname = usePathname();
  const idempotencyKey = useRef<string | null>(null);
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "submitting" }
    | { kind: "success"; reference: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function submit(formData: FormData): Promise<void> {
    setState({ kind: "submitting" });
    const attribution = captureAttribution();
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const files = formData
        .getAll("images")
        .filter((value): value is File => value instanceof File && value.size > 0);
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
      const stringField = (name: string): string => {
        const value = formData.get(name);
        return typeof value === "string" ? value : "";
      };
      const response = await fetch("/api/inquiries/", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": idempotencyKey.current,
          "x-cwt-upload-session": attribution.anonymousSessionId,
        },
        body: JSON.stringify({
          name: stringField("name"),
          email: stringField("email"),
          countryCode: stringField("countryCode") || null,
          whatsapp: stringField("whatsapp") || null,
          description: stringField("description") || null,
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
          analyticsConsentState: attribution.consentState,
          anonymousSessionId: attribution.anonymousSessionId,
          idempotencyKey: idempotencyKey.current,
          website: stringField("website") || null,
        }),
      });
      const result = (await response.json()) as unknown;
      if (
        !response.ok ||
        typeof result !== "object" ||
        result === null ||
        !("ok" in result) ||
        result.ok !== true ||
        !("reference" in result) ||
        typeof result.reference !== "string"
      ) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "We could not submit your request. Please try again.";
        setState({ kind: "error", message });
        return;
      }
      trackPublicEvent("quote_submit_success", pathname, { placement: compact ? "compact_form" : "quote_page" });
      setState({ kind: "success", reference: result.reference });
    } catch {
      setState({ kind: "error", message: "Connection interrupted. Please try again." });
    }
  }

  if (state.kind === "success") {
    return (
      <div className="rounded-[1.5rem] border border-emerald-600/20 bg-emerald-50 p-6 text-emerald-950" role="status">
        <h2 className="text-xl font-semibold">Requirement received</h2>
        <p className="mt-2 text-sm leading-6">Our team can now review your description or private images. Reference: {state.reference}</p>
      </div>
    );
  }

  return (
    <form action={submit} className="grid gap-4">
      <div className={compact ? "grid gap-4 sm:grid-cols-2" : "grid gap-5 sm:grid-cols-2"}>
        <label className="form-field">Name <input autoComplete="name" name="name" required /></label>
        <label className="form-field">Email <input autoComplete="email" name="email" required type="email" /></label>
        <label className="form-field">Country <input autoComplete="country" maxLength={2} name="countryCode" placeholder="Country code, optional" /></label>
        <label className="form-field">WhatsApp <input autoComplete="tel" name="whatsapp" placeholder="Optional" /></label>
      </div>
      <label className="form-field">Describe what you need <textarea defaultValue={initialDescription} name="description" placeholder="Use, feel, stretch, color, quantity—or leave blank and upload an image." rows={compact ? 3 : 5} /></label>
      <div className="form-field">
        <label htmlFor="inquiry-images">Upload fabric images</label>
        <input
          accept="image/jpeg,image/png,image/webp"
          aria-describedby="inquiry-images-help"
          id="inquiry-images"
          multiple
          name="images"
          onChange={(event) => {
            if (event.currentTarget.files?.length) {
              trackPublicEvent("upload_started", pathname, { file_count: event.currentTarget.files.length });
            }
          }}
          type="file"
        />
        <span className="text-xs font-normal text-stone-500" id="inquiry-images-help">JPG, PNG or WebP. Files remain private and use expiring access.</span>
      </div>
      <div className="hidden" aria-hidden="true"><label>Website<input autoComplete="off" name="website" tabIndex={-1} /></label></div>
      {state.kind === "error" ? <p className="text-sm text-red-700" role="alert">{state.message}</p> : null}
      <button className="button-primary justify-center" disabled={state.kind === "submitting"} type="submit">
        {state.kind === "submitting" ? "Sending securely…" : "Find Your Fabric Solution"}
      </button>
      <p className="text-xs leading-5 text-stone-500">Name and Email are required. Add either a description or at least one image.</p>
    </form>
  );
}
