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

export function captureAttribution(): {
  anonymousSessionId: string;
  landingPagePath: string;
  referrerOrigin: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
} {
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
  return {
    anonymousSessionId: sessionId(),
    landingPagePath,
    referrerOrigin,
    utmSource: params.get("utm_source") ?? "",
    utmMedium: params.get("utm_medium") ?? "",
    utmCampaign: params.get("utm_campaign") ?? "",
  };
}

export function trackPublicEvent(
  eventName: PublicEventName,
  routePath: string,
  safeProperties: Readonly<Record<string, string | number | boolean>> = {},
): void {
  const attribution = captureAttribution();
  void fetch("/api/conversion-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      eventName,
      routePath,
      landingPagePath: attribution.landingPagePath,
      referrerOrigin: attribution.referrerOrigin,
      utmSource: attribution.utmSource || undefined,
      utmMedium: attribution.utmMedium || undefined,
      utmCampaign: attribution.utmCampaign || undefined,
      anonymousSessionId: attribution.anonymousSessionId,
      safeProperties,
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
