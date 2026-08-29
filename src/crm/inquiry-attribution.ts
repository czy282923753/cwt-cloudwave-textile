import { normalizePath } from "@/seo/path";

export const ATTRIBUTION_OMISSION_REASONS = [
  "empty",
  "oversize",
  "invalid_path",
  "private_path",
  "invalid_origin",
  "same_origin",
  "invalid_token",
  "email_like",
  "uuid_like",
  "file_like",
  "digit_budget",
] as const;

export type AttributionOmissionReason =
  (typeof ATTRIBUTION_OMISSION_REASONS)[number];

export type AttributionFieldName =
  | "landing_page_path"
  | "referrer"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "last_non_direct_source"
  | "last_non_direct_medium"
  | "last_non_direct_campaign"
  | "submit_referrer"
  | "submit_utm_source"
  | "submit_utm_medium"
  | "submit_utm_campaign";

export interface AttributionOmission {
  field: AttributionFieldName;
  reason: AttributionOmissionReason;
}

export interface InquiryAttributionInput {
  sourcePagePath: string;
  landingPagePath?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  lastNonDirectSource?: string | null;
  lastNonDirectMedium?: string | null;
  lastNonDirectCampaign?: string | null;
  submitReferrer?: string | null;
  submitUtmSource?: string | null;
  submitUtmMedium?: string | null;
  submitUtmCampaign?: string | null;
}

export interface SanitizedInquiryAttribution {
  sourcePagePath: string;
  landingPagePath: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  lastNonDirectSource: string | null;
  lastNonDirectMedium: string | null;
  lastNonDirectCampaign: string | null;
  submitReferrer: string | null;
  submitUtmSource: string | null;
  submitUtmMedium: string | null;
  submitUtmCampaign: string | null;
  attributionConfidence: "high" | "medium" | "low" | "unavailable";
  omissions: readonly AttributionOmission[];
}

const TOKEN_GRAMMAR = /^[A-Za-z0-9][A-Za-z0-9 ._:-]*$/;
const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FILE_LIKE = /(?:^|[ ._:-])[^ ._:-]+\.(?:jpe?g|png|webp|avif|pdf|docx?|xlsx?|zip)$/i;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const PRIVATE_PATH = /^\/(?:api\/storage|api\/inquiry-assets|admin)(?:\/|$)/i;
const NORMALIZED_PUBLIC_PATH = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*$/;

function normalizeObservedString(
  value: string | null | undefined,
): { value: string | null; reason?: AttributionOmissionReason } {
  if (value === null || value === undefined) return { value: null };
  const normalized = value.normalize("NFC").trim();
  return normalized ? { value: normalized } : { value: null, reason: "empty" };
}

function isCalendarValid(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day;
}

export function remainingAsciiDigitCount(token: string): number {
  const masked = [...token];
  const pattern = /\d{4}-\d{2}-\d{2}/g;
  for (const match of token.matchAll(pattern)) {
    const start = match.index;
    const end = start + match[0].length;
    const before = token[start - 1];
    const after = token[end];
    if ((before && /\d/.test(before)) || (after && /\d/.test(after))) continue;
    const [year, month, day] = match[0].split("-").map(Number);
    if (!isCalendarValid(year!, month!, day!)) continue;
    for (let index = start; index < end; index += 1) masked[index] = " ";
  }
  return masked.reduce((count, character) => count + (/\d/.test(character) ? 1 : 0), 0);
}

function tokenOmissionReason(
  token: string,
  maximumLength: number,
): AttributionOmissionReason | null {
  if (token.length > maximumLength) return "oversize";
  if (CONTROL_CHARACTER.test(token) || !TOKEN_GRAMMAR.test(token)) {
    return EMAIL_LIKE.test(token) ? "email_like" : "invalid_token";
  }
  if (UUID_LIKE.test(token)) return "uuid_like";
  if (PRIVATE_PATH.test(token)) return "private_path";
  if (FILE_LIKE.test(token)) return "file_like";
  if (remainingAsciiDigitCount(token) >= 7) return "digit_budget";
  return null;
}

export function sanitizeAttributionToken(
  value: string | null | undefined,
  maximumLength = 100,
): { value: string | null; reason?: AttributionOmissionReason } {
  const normalized = normalizeObservedString(value);
  if (!normalized.value) return normalized;
  const reason = tokenOmissionReason(normalized.value, maximumLength);
  return reason ? { value: null, reason } : { value: normalized.value };
}

function normalizePublicPath(
  value: string,
): { value: string | null; reason?: AttributionOmissionReason } {
  if (
    CONTROL_CHARACTER.test(value) ||
    value.includes("?") ||
    value.includes("#") ||
    value.includes("://")
  ) {
    return { value: null, reason: "invalid_path" };
  }
  let normalized: string;
  try {
    normalized = normalizePath(value);
  } catch {
    return { value: null, reason: "invalid_path" };
  }
  if (normalized.length > 500) return { value: null, reason: "oversize" };
  if (PRIVATE_PATH.test(normalized)) return { value: null, reason: "private_path" };
  if (!NORMALIZED_PUBLIC_PATH.test(normalized)) {
    return { value: null, reason: "invalid_path" };
  }
  return { value: normalized };
}

export function normalizeRequiredSourcePagePath(value: string): string {
  const normalized = normalizeObservedString(value);
  if (!normalized.value) throw new Error("A valid source page path is required.");
  if (
    CONTROL_CHARACTER.test(normalized.value) ||
    normalized.value.includes("?") ||
    normalized.value.includes("#") ||
    normalized.value.includes("://")
  ) {
    throw new Error("A valid source page path is required.");
  }
  let canonical: string;
  try {
    canonical = normalizePath(normalized.value);
  } catch {
    throw new Error("A valid source page path is required.");
  }
  const result = normalizePublicPath(canonical);
  if (!result.value) throw new Error("A valid source page path is required.");
  return result.value;
}

function sanitizeOptionalPath(
  value: string | null | undefined,
): { value: string | null; reason?: AttributionOmissionReason } {
  const normalized = normalizeObservedString(value);
  if (!normalized.value) return normalized;
  return normalizePublicPath(normalized.value);
}

function canonicalSiteOrigin(siteOrigin: string | null | undefined): string | null {
  if (!siteOrigin) return null;
  try {
    return new URL(siteOrigin).origin;
  } catch {
    return null;
  }
}

export function sanitizeAttributionOrigin(
  value: string | null | undefined,
  options: Readonly<{ omitSameOrigin?: boolean; siteOrigin?: string | null }> = {},
): { value: string | null; reason?: AttributionOmissionReason } {
  const normalized = normalizeObservedString(value);
  if (!normalized.value) return normalized;
  if (CONTROL_CHARACTER.test(normalized.value)) {
    return { value: null, reason: "invalid_origin" };
  }
  let parsed: URL;
  try {
    parsed = new URL(normalized.value);
  } catch {
    return { value: null, reason: "invalid_origin" };
  }
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/"
  ) {
    return { value: null, reason: "invalid_origin" };
  }
  const origin = parsed.origin;
  if (origin.length > 200) return { value: null, reason: "oversize" };
  if (UUID_LIKE.test(parsed.hostname) || parsed.hostname.split(".").some((label) => UUID_LIKE.test(label))) {
    return { value: null, reason: "uuid_like" };
  }
  if ((parsed.hostname.match(/\d/g) ?? []).length >= 7) {
    return { value: null, reason: "digit_budget" };
  }
  if (options.omitSameOrigin && origin === canonicalSiteOrigin(options.siteOrigin)) {
    return { value: null, reason: "same_origin" };
  }
  return { value: origin };
}

function sanitizeLastNonDirectSource(
  value: string | null | undefined,
  siteOrigin: string | null | undefined,
): { value: string | null; reason?: AttributionOmissionReason } {
  const normalized = normalizeObservedString(value);
  if (!normalized.value) return normalized;
  if (/^https?:/i.test(normalized.value)) {
    return sanitizeAttributionOrigin(normalized.value, {
      omitSameOrigin: true,
      siteOrigin: siteOrigin ?? null,
    });
  }
  return sanitizeAttributionToken(normalized.value, 200);
}

export function sanitizeInquiryAttribution(
  input: InquiryAttributionInput,
  options: Readonly<{ siteOrigin?: string | null }> = {},
): SanitizedInquiryAttribution {
  const omissions: AttributionOmission[] = [];
  const retain = (
    field: AttributionFieldName,
    result: { value: string | null; reason?: AttributionOmissionReason },
  ): string | null => {
    if (result.reason) omissions.push({ field, reason: result.reason });
    return result.value;
  };

  const landingPagePath = retain(
    "landing_page_path",
    sanitizeOptionalPath(input.landingPagePath),
  );
  const referrer = retain("referrer", sanitizeAttributionOrigin(input.referrer));
  const utmSource = retain("utm_source", sanitizeAttributionToken(input.utmSource));
  const utmMedium = retain("utm_medium", sanitizeAttributionToken(input.utmMedium));
  const utmCampaign = retain("utm_campaign", sanitizeAttributionToken(input.utmCampaign));
  const lastNonDirectSource = retain(
    "last_non_direct_source",
    sanitizeLastNonDirectSource(input.lastNonDirectSource, options.siteOrigin),
  );
  const lastNonDirectMedium = retain(
    "last_non_direct_medium",
    sanitizeAttributionToken(input.lastNonDirectMedium),
  );
  const lastNonDirectCampaign = retain(
    "last_non_direct_campaign",
    sanitizeAttributionToken(input.lastNonDirectCampaign),
  );
  const submitReferrer = retain(
    "submit_referrer",
    sanitizeAttributionOrigin(input.submitReferrer),
  );
  const submitUtmSource = retain(
    "submit_utm_source",
    sanitizeAttributionToken(input.submitUtmSource),
  );
  const submitUtmMedium = retain(
    "submit_utm_medium",
    sanitizeAttributionToken(input.submitUtmMedium),
  );
  const submitUtmCampaign = retain(
    "submit_utm_campaign",
    sanitizeAttributionToken(input.submitUtmCampaign),
  );

  return {
    sourcePagePath: normalizeRequiredSourcePagePath(input.sourcePagePath),
    landingPagePath,
    referrer,
    utmSource,
    utmMedium,
    utmCampaign,
    lastNonDirectSource,
    lastNonDirectMedium,
    lastNonDirectCampaign,
    submitReferrer,
    submitUtmSource,
    submitUtmMedium,
    submitUtmCampaign,
    attributionConfidence: utmSource
      ? "high"
      : referrer
        ? "medium"
        : landingPagePath
          ? "low"
          : "unavailable",
    omissions,
  };
}
