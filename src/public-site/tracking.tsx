"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type PublicEventName =
  | "product_view"
  | "quote_cta_click"
  | "whatsapp_click"
  | "upload_started"
  | "image_upload_completed"
  | "quote_submit_success";

function sessionId(): string {
  const key = "cwt_anonymous_session";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(key, created);
  return created;
}

export interface CapturedAttribution {
  anonymousSessionId: string;
  landingPagePath: string;
  referrerOrigin: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  lastNonDirectSource: string;
  lastNonDirectMedium: string;
  lastNonDirectCampaign: string;
  submitReferrerOrigin: string;
  submitUtmSource: string;
  submitUtmMedium: string;
  submitUtmCampaign: string;
  attributionConfidence: "high" | "medium" | "low" | "unavailable";
  consentState: "unknown" | "granted" | "denied";
}

export function captureAttribution(): CapturedAttribution {
  const landingKey = "cwt_landing_page";
  const currentPath = window.location.pathname;
  const landingPagePath = window.sessionStorage.getItem(landingKey) ?? currentPath;
  window.sessionStorage.setItem(landingKey, landingPagePath);
  const params = new URLSearchParams(window.location.search);
  let referrerOrigin = "";
  try {
    referrerOrigin = document.referrer ? new URL(document.referrer).origin : "";
  } catch {
    referrerOrigin = "";
  }
  const firstReferrerKey = "cwt_first_referrer";
  const firstSourceKey = "cwt_first_utm_source";
  const firstMediumKey = "cwt_first_utm_medium";
  const firstCampaignKey = "cwt_first_utm_campaign";
  const currentSource = params.get("utm_source") ?? "";
  const currentMedium = params.get("utm_medium") ?? "";
  const currentCampaign = params.get("utm_campaign") ?? "";
  const attributionInitializedKey = "cwt_attribution_initialized";
  if (window.sessionStorage.getItem(attributionInitializedKey) !== "true") {
    window.sessionStorage.setItem(firstReferrerKey, referrerOrigin);
    window.sessionStorage.setItem(firstSourceKey, currentSource);
    window.sessionStorage.setItem(firstMediumKey, currentMedium);
    window.sessionStorage.setItem(firstCampaignKey, currentCampaign);
    window.sessionStorage.setItem(attributionInitializedKey, "true");
  }
  const lastSourceKey = "cwt_last_non_direct_source";
  const lastMediumKey = "cwt_last_non_direct_medium";
  const lastCampaignKey = "cwt_last_non_direct_campaign";
  const externalReferrer = referrerOrigin && referrerOrigin !== window.location.origin
    ? referrerOrigin
    : "";
  if (currentSource || externalReferrer) {
    window.sessionStorage.setItem(lastSourceKey, currentSource || externalReferrer);
    window.sessionStorage.setItem(
      lastMediumKey,
      currentMedium || (externalReferrer ? "referral" : ""),
    );
    window.sessionStorage.setItem(lastCampaignKey, currentCampaign);
  }
  const firstSource = window.sessionStorage.getItem(firstSourceKey) ?? "";
  const firstReferrer = window.sessionStorage.getItem(firstReferrerKey) ?? "";
  const consent = window.localStorage.getItem("cwt_analytics_consent");
  return {
    anonymousSessionId: sessionId(),
    landingPagePath,
    referrerOrigin: firstReferrer,
    utmSource: firstSource,
    utmMedium: window.sessionStorage.getItem(firstMediumKey) ?? "",
    utmCampaign: window.sessionStorage.getItem(firstCampaignKey) ?? "",
    lastNonDirectSource: window.sessionStorage.getItem(lastSourceKey) ?? "",
    lastNonDirectMedium: window.sessionStorage.getItem(lastMediumKey) ?? "",
    lastNonDirectCampaign: window.sessionStorage.getItem(lastCampaignKey) ?? "",
    submitReferrerOrigin: referrerOrigin,
    submitUtmSource: currentSource,
    submitUtmMedium: currentMedium,
    submitUtmCampaign: currentCampaign,
    attributionConfidence: firstSource
      ? "high"
      : firstReferrer
        ? "medium"
        : landingPagePath
          ? "low"
          : "unavailable",
    consentState:
      consent === "granted" || consent === "denied" ? consent : "unknown",
  };
}

export function trackPublicEvent(
  eventName: PublicEventName,
  routePath: string,
  safeProperties: Readonly<Record<string, string | number | boolean>> = {},
  entity?: Readonly<{
    entityType: "product" | "application" | "fabric_entry" | "content";
    entityPath: string;
  }>,
  capturedAttribution?: CapturedAttribution,
): void {
  const attribution = capturedAttribution ?? captureAttribution();
  if (attribution.consentState !== "granted") return;
  void fetch("/api/conversion-events/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      eventId: `evt_${crypto.randomUUID().replaceAll("-", "")}`,
      eventName,
      routePath,
      landingPagePath: attribution.landingPagePath,
      referrerOrigin: attribution.referrerOrigin,
      utmSource: attribution.utmSource || undefined,
      utmMedium: attribution.utmMedium || undefined,
      utmCampaign: attribution.utmCampaign || undefined,
      lastNonDirectSource: attribution.lastNonDirectSource || undefined,
      lastNonDirectMedium: attribution.lastNonDirectMedium || undefined,
      lastNonDirectCampaign: attribution.lastNonDirectCampaign || undefined,
      attributionConfidence: attribution.attributionConfidence,
      safeProperties,
      ...entity,
    }),
  });
}

export function TrackedLink({
  href,
  eventName,
  placement,
  className,
  children,
}: Readonly<{
  href: string;
  eventName: "quote_cta_click" | "whatsapp_click";
  placement: string;
  className?: string;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  return (
    <Link
      className={className}
      href={href}
      onClick={() => trackPublicEvent(eventName, pathname, { placement })}
    >
      {children}
    </Link>
  );
}
