// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { toPublicAnalyticsPayload } from "@/analytics/public-payload";
import {
  analyticsConsents,
  auditLogs,
  conversionEvents,
  inquiries,
  notificationOutbox,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import { InquiryForm } from "./inquiry-form";
import { trackPublicEvent } from "./tracking";

vi.mock("next/navigation", () => ({
  usePathname: () => "/get-quote/",
}));

const consentSessionId = "75000000-0000-4000-8000-000000000001";
const inquirySessionId = "74000000-0000-4000-8000-000000000001";
const unsafeFirst = "campaign-1234567";
const unsafeLast = "call-13800138000";
const unsafeSubmit = "phone:138:0013:8000";

function actualRequest(
  path: "/api/inquiries/" | "/api/conversion-events/",
  init: RequestInit | undefined,
): Request {
  const body = String(init?.body ?? "");
  const headers = new Headers(init?.headers);
  headers.set("origin", "http://localhost:3000");
  headers.set("content-length", String(new TextEncoder().encode(body).byteLength));
  headers.set("cookie", `cwt_analytics_session=${consentSessionId}`);
  headers.set("user-agent", "cwt-stage5-f1-synthetic-composition");
  return new Request(`http://localhost:3000${path}`, {
    method: init?.method ?? "POST",
    headers,
    body,
  });
}

function seedUnsafeAttribution(): void {
  window.localStorage.setItem("cwt_anonymous_session", inquirySessionId);
  window.localStorage.setItem("cwt_analytics_consent", "granted");
  window.sessionStorage.setItem("cwt_landing_page", "/products/synthetic-fabric/");
  window.sessionStorage.setItem("cwt_attribution_initialized", "true");
  window.sessionStorage.setItem("cwt_first_referrer", "");
  window.sessionStorage.setItem("cwt_first_utm_source", unsafeFirst);
  window.sessionStorage.setItem("cwt_first_utm_medium", "safe-first-medium");
  window.sessionStorage.setItem("cwt_first_utm_campaign", "safe-first-campaign");
  window.sessionStorage.setItem("cwt_last_non_direct_source", unsafeLast);
  window.sessionStorage.setItem("cwt_last_non_direct_medium", "safe-last-medium");
  window.sessionStorage.setItem("cwt_last_non_direct_campaign", "safe-last-campaign");
  window.history.replaceState(
    {},
    "",
    `/get-quote/?utm_medium=safe-submit-medium&utm_campaign=${unsafeSubmit}`,
  );
}

async function completeForm(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText("Name", { exact: true }), "Composition Buyer");
  await user.type(
    screen.getByLabelText("Email", { exact: true }),
    "composition-buyer@example.test",
  );
  await user.type(
    screen.getByLabelText("Describe what you need", { exact: true }),
    "Synthetic full composition verification.",
  );
}

async function runActualInquiryComposition(uncertainRetry: boolean): Promise<void> {
  const connection = await createTestDatabase();
  globalThis.cwtDatabaseConnection = connection;
  vi.resetModules();
  const [{ POST: inquiryPost }, { POST: conversionPost }] = await Promise.all([
    import("@/app/api/inquiries/route"),
    import("@/app/api/conversion-events/route"),
  ]);
  const browserInquiryBodies: string[] = [];
  const browserConversionBodies: Array<Record<string, unknown>> = [];
  const apiResponses: unknown[] = [];
  const output: string[] = [];
  let inquiryCalls = 0;

  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    output.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    output.push(String(chunk));
    return true;
  });
  vi.spyOn(console, "error").mockImplementation((...values) => {
    output.push(values.map(String).join(" "));
  });

  try {
    await connection.db.insert(analyticsConsents).values({
      consentSessionId,
      status: "granted",
      consentVersion: 1,
      grantedAt: new Date(),
    });
    seedUnsafeAttribution();
    vi.spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce("76000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("76aa0000-abcd-4000-8abc-a1b2c3d4e5f6");
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/inquiries/") {
        inquiryCalls += 1;
        browserInquiryBodies.push(String(init?.body));
        const response = await inquiryPost(actualRequest("/api/inquiries/", init));
        apiResponses.push(await response.clone().json());
        if (uncertainRetry && inquiryCalls === 1) {
          throw new TypeError("Synthetic response loss after committed Inquiry");
        }
        return response;
      }
      if (url === "/api/conversion-events/") {
        browserConversionBodies.push(
          JSON.parse(String(init?.body)) as Record<string, unknown>,
        );
        const response = await conversionPost(
          actualRequest("/api/conversion-events/", init),
        );
        apiResponses.push(await response.clone().json());
        return response;
      }
      throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url}`);
    }));

    const user = userEvent.setup();
    render(<InquiryForm />);
    await completeForm(user);
    await user.click(screen.getByRole("button", { name: "Find Your Fabric Solution" }));
    if (uncertainRetry) {
      expect(await screen.findByText("Submission outcome uncertain")).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Retry same submission" }));
    }
    expect(await screen.findByRole("status")).toHaveTextContent("Requirement received");
    await waitFor(async () => {
      const persistedEvents = await connection.db.select().from(conversionEvents);
      expect(
        persistedEvents.some((row) => row.eventName === "quote_submit_success"),
      ).toBe(true);
    }, { timeout: 30_000 });

    const [inquiry] = await connection.db.select().from(inquiries);
    const [audit] = await connection.db.select().from(auditLogs);
    const [outbox] = await connection.db.select().from(notificationOutbox);
    const conversions = await connection.db.select().from(conversionEvents);
    const inquiryCreated = conversions.find((row) => row.eventName === "inquiry_created");
    const quoteSuccess = conversions.find((row) => row.eventName === "quote_submit_success");
    expect(inquiry).toMatchObject({
      utmSource: null,
      utmMedium: "safe-first-medium",
      lastNonDirectSource: null,
      lastNonDirectMedium: "safe-last-medium",
      submitUtmCampaign: null,
      submitUtmMedium: "safe-submit-medium",
      attributionConfidence: "low",
    });
    expect(inquiryCreated).toMatchObject({
      utmSource: null,
      utmMedium: "safe-first-medium",
      lastNonDirectSource: null,
      lastNonDirectMedium: "safe-last-medium",
      attributionConfidence: "low",
    });
    expect(quoteSuccess).toMatchObject({
      anonymousSessionId: consentSessionId,
      landingPagePath: null,
      referrerOrigin: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      lastNonDirectSource: null,
      lastNonDirectMedium: null,
      lastNonDirectCampaign: null,
      attributionConfidence: "unavailable",
    });

    expect(browserConversionBodies).toHaveLength(1);
    expect(browserConversionBodies[0]).toEqual({
      eventId: "evt_76aa0000abcd40008abca1b2c3d4e5f6",
      eventName: "quote_submit_success",
      routePath: "/get-quote/",
      safeProperties: { placement: "quote_page" },
    });
    expect(browserInquiryBodies).toHaveLength(uncertainRetry ? 2 : 1);
    if (uncertainRetry) expect(browserInquiryBodies[1]).toBe(browserInquiryBodies[0]);
    expect(conversions.filter((row) => row.eventName === "inquiry_created")).toHaveLength(1);
    expect(conversions.filter((row) => row.eventName === "quote_submit_success")).toHaveLength(1);

    const providerPayloads = conversions.map(toPublicAnalyticsPayload);
    const quoteProvider = providerPayloads.find(
      (payload) => payload.eventName === "quote_submit_success",
    );
    expect(quoteProvider).toMatchObject({
      landingPagePath: null,
      submitSourcePagePath: null,
      referrerOrigin: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
    });
    const forbiddenSinks = JSON.stringify({
      inquiry,
      audit,
      outbox,
      conversions,
      providerPayloads,
      browserConversionBodies,
      apiResponses,
      output,
    });
    for (const raw of [unsafeFirst, unsafeLast, unsafeSubmit]) {
      expect(forbiddenSinks).not.toContain(raw);
      expect(forbiddenSinks).not.toContain(
        createHash("sha256").update(raw).digest("hex"),
      );
    }
    expect(JSON.stringify({
      browserConversionBodies,
      quoteSuccess,
      quoteProvider,
    })).not.toContain(inquirySessionId);
  } finally {
    await connection.close();
    globalThis.cwtDatabaseConnection = undefined;
  }
}

afterEach(() => {
  cleanup();
  globalThis.cwtDatabaseConnection = undefined;
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("Inquiry success privacy composition", () => {
  it(
    "omits all browser success attribution on actual initial success",
    async () => {
      await runActualInquiryComposition(false);
    },
    60_000,
  );

  it(
    "emits one attribution-free browser success event after uncertain retry",
    async () => {
      await runActualInquiryComposition(true);
    },
    60_000,
  );

  it("preserves attribution for a non-Inquiry public tracking call", async () => {
    const connection = await createTestDatabase();
    globalThis.cwtDatabaseConnection = connection;
    vi.resetModules();
    const { POST: conversionPost } = await import("@/app/api/conversion-events/route");
    const browserBodies: Array<Record<string, unknown>> = [];
    try {
      await connection.db.insert(analyticsConsents).values({
        consentSessionId,
        status: "granted",
        consentVersion: 1,
        grantedAt: new Date(),
      });
      window.localStorage.setItem("cwt_anonymous_session", inquirySessionId);
      window.localStorage.setItem("cwt_analytics_consent", "granted");
      window.history.replaceState({}, "", "/products/?utm_source=safe-source");
      vi.spyOn(globalThis.crypto, "randomUUID")
        .mockReturnValue("77aa0000-abcd-4000-8abc-a1b2c3d4e5f6");
      vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        browserBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        return conversionPost(actualRequest("/api/conversion-events/", init));
      }));

      trackPublicEvent("quote_cta_click", "/products/", { placement: "product_grid" });
      await waitFor(async () => {
        expect(await connection.db.select().from(conversionEvents)).toHaveLength(1);
      }, { timeout: 10_000 });
      expect(browserBodies[0]).toMatchObject({
        eventName: "quote_cta_click",
        utmSource: "safe-source",
        lastNonDirectSource: "safe-source",
        attributionConfidence: "high",
      });
      const [stored] = await connection.db.select().from(conversionEvents)
        .where(eq(conversionEvents.eventName, "quote_cta_click"));
      expect(stored).toMatchObject({ utmSource: "safe-source" });
      expect(toPublicAnalyticsPayload(stored!).utmSource).toBe("safe-source");
    } finally {
      await connection.close();
      globalThis.cwtDatabaseConnection = undefined;
    }
  });
});
