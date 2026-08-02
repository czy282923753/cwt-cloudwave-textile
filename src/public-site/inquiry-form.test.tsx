// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InquiryForm } from "./inquiry-form";

const captureAttribution = vi.fn(() => ({
  anonymousSessionId: "anonymous-session-1",
  landingPagePath: "/get-quote/",
  referrerOrigin: "",
  utmSource: "test",
  utmMedium: "integration",
  utmCampaign: "frozen-attempt",
  lastNonDirectSource: "test",
  lastNonDirectMedium: "integration",
  lastNonDirectCampaign: "frozen-attempt",
  attributionConfidence: "high" as const,
  consentState: "denied" as const,
}));
const trackPublicEvent = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/get-quote/",
}));

vi.mock("./tracking", () => ({
  captureAttribution: () => captureAttribution(),
  trackPublicEvent: (...arguments_: unknown[]) => trackPublicEvent(...arguments_),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function completeRequiredFields(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText("Name", { exact: true }), "Frozen Attempt Buyer");
  await user.type(
    screen.getByLabelText("Email", { exact: true }),
    "frozen-attempt@example.test",
  );
}

describe("Inquiry Form frozen retry identity", () => {
  beforeEach(() => {
    vi.spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce("10000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("10000000-0000-4000-8000-000000000002");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    captureAttribution.mockClear();
    trackPublicEvent.mockClear();
  });

  it("replays the exact attachment request after response loss without another upload", async () => {
    const user = userEvent.setup();
    const inquiryBodies: string[] = [];
    let intentRequests = 0;
    let uploadRequests = 0;
    let inquiryRequests = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/upload-intents/" && init?.method === "POST") {
        intentRequests += 1;
        return jsonResponse({
          ok: true,
          token: "private-upload-token-one",
          uploadUrl: "/api/upload-intents/private-upload-token-one/",
        });
      }
      if (url === "/api/upload-intents/private-upload-token-one/" && init?.method === "PUT") {
        uploadRequests += 1;
        return jsonResponse({ ok: true });
      }
      if (url === "/api/inquiries/" && init?.method === "POST") {
        inquiryRequests += 1;
        inquiryBodies.push(String(init.body));
        if (inquiryRequests === 1) throw new TypeError("response connection lost");
        return jsonResponse({ ok: true, reference: "CWT-REPLAY", replayed: true });
      }
      throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url}`);
    }));

    render(<InquiryForm />);
    await completeRequiredFields(user);
    await user.upload(
      screen.getByLabelText("Upload fabric images", { exact: true }),
      new File([new Uint8Array([137, 80, 78, 71])], "fabric-reference.png", {
        type: "image/png",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Find Your Fabric Solution" }));

    const uncertain = await screen.findByRole("alert");
    expect(uncertain).toHaveFocus();
    expect(uncertain).toHaveTextContent("Submission outcome uncertain");
    expect(uncertain).toHaveTextContent("fabric-reference.png");
    expect(screen.getByLabelText("Name", { exact: true })).toHaveValue("Frozen Attempt Buyer");
    expect(document.body).not.toHaveTextContent("private-upload-token-one");

    await user.click(screen.getByRole("button", { name: "Retry same submission" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Requirement received");
    expect(intentRequests).toBe(1);
    expect(uploadRequests).toBe(1);
    expect(inquiryRequests).toBe(2);
    expect(inquiryBodies[1]).toBe(inquiryBodies[0]);
    expect(JSON.parse(inquiryBodies[0]!)).toMatchObject({
      idempotencyKey: "10000000-0000-4000-8000-000000000001",
      uploadTokens: ["private-upload-token-one"],
    });
  });

  it("treats a 409 as definitive and creates a new key and upload only after explicit restart", async () => {
    const user = userEvent.setup();
    const inquiryPayloads: Array<{ idempotencyKey: string; uploadTokens: string[] }> = [];
    let intentRequests = 0;
    let uploadRequests = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/upload-intents/" && init?.method === "POST") {
        intentRequests += 1;
        const token = `private-upload-token-${intentRequests}`;
        return jsonResponse({ ok: true, token, uploadUrl: `/api/upload-intents/${token}/` });
      }
      if (url.startsWith("/api/upload-intents/private-upload-token-") && init?.method === "PUT") {
        uploadRequests += 1;
        return jsonResponse({ ok: true });
      }
      if (url === "/api/inquiries/" && init?.method === "POST") {
        inquiryPayloads.push(JSON.parse(String(init.body)) as {
          idempotencyKey: string;
          uploadTokens: string[];
        });
        if (inquiryPayloads.length === 1) {
          return jsonResponse({ error: "This request key conflicts with another submission." }, 409);
        }
        return jsonResponse({ ok: true, reference: "CWT-NEW", replayed: false }, 201);
      }
      throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url}`);
    }));

    render(<InquiryForm />);
    await completeRequiredFields(user);
    await user.upload(
      screen.getByLabelText("Upload fabric images", { exact: true }),
      new File(["image"], "new-attempt.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: "Find Your Fabric Solution" }));

    const definitive = await screen.findByRole("alert");
    expect(definitive).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Retry same submission" })).not.toBeInTheDocument();
    expect(intentRequests).toBe(1);
    expect(uploadRequests).toBe(1);

    await user.click(screen.getByRole("button", { name: "Edit and start over" }));
    expect(screen.getByRole("button", { name: "Find Your Fabric Solution" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Find Your Fabric Solution" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Requirement received");
    expect(intentRequests).toBe(2);
    expect(uploadRequests).toBe(2);
    expect(inquiryPayloads).toHaveLength(2);
    expect(inquiryPayloads[0]).toMatchObject({
      idempotencyKey: "10000000-0000-4000-8000-000000000001",
      uploadTokens: ["private-upload-token-1"],
    });
    expect(inquiryPayloads[1]).toMatchObject({
      idempotencyKey: "10000000-0000-4000-8000-000000000002",
      uploadTokens: ["private-upload-token-2"],
    });
  });

  it("does not freeze an incomplete upload and blocks duplicate retry requests", async () => {
    const user = userEvent.setup();
    let mode: "upload_failure" | "uncertain" = "upload_failure";
    let inquiryRequests = 0;
    let resolveRetry: ((response: Response) => void) | undefined;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/upload-intents/" && init?.method === "POST") {
        return mode === "upload_failure"
          ? jsonResponse({ error: "The image could not be prepared." }, 400)
          : jsonResponse({
              ok: true,
              token: "private-upload-token-retry",
              uploadUrl: "/api/upload-intents/private-upload-token-retry/",
            });
      }
      if (url === "/api/upload-intents/private-upload-token-retry/" && init?.method === "PUT") {
        return jsonResponse({ ok: true });
      }
      if (url === "/api/inquiries/" && init?.method === "POST") {
        inquiryRequests += 1;
        if (inquiryRequests === 1) throw new TypeError("response unavailable");
        return new Promise<Response>((resolve) => {
          resolveRetry = resolve;
        });
      }
      throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url}`);
    }));

    render(<InquiryForm />);
    await completeRequiredFields(user);
    await user.upload(
      screen.getByLabelText("Upload fabric images", { exact: true }),
      new File(["image"], "retry.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: "Find Your Fabric Solution" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be prepared");
    expect(screen.queryByRole("button", { name: "Retry same submission" })).not.toBeInTheDocument();
    expect(inquiryRequests).toBe(0);

    mode = "uncertain";
    await user.click(screen.getByRole("button", { name: "Find Your Fabric Solution" }));
    expect(await screen.findByText("Submission outcome uncertain")).toBeVisible();
    const retry = screen.getByRole("button", { name: "Retry same submission" });
    fireEvent.click(retry);
    fireEvent.click(retry);
    await waitFor(() => expect(inquiryRequests).toBe(2));
    expect(resolveRetry).toBeDefined();
    resolveRetry!(jsonResponse({ ok: true, reference: "CWT-ONE-RETRY", replayed: true }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Requirement received");
    });
    expect(inquiryRequests).toBe(2);
  });
});
