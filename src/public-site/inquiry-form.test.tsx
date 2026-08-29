// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InquiryForm } from "./inquiry-form";

vi.mock("next/navigation", () => ({
  usePathname: () => "/get-quote/",
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
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem("cwt_anonymous_session", "anonymous-session-1");
    window.localStorage.setItem("cwt_analytics_consent", "denied");
    window.history.replaceState(
      {},
      "",
      "/get-quote/?utm_source=test&utm_medium=integration&utm_campaign=frozen-attempt",
    );
    vi.spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce("10000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("10000000-0000-4000-8000-000000000002")
      .mockReturnValueOnce("10000000-0000-4000-8000-000000000003");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("offers code-valued English country options, uppercases valid codes, and blocks invalid text", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return jsonResponse({ ok: true, reference: "CWT-COUNTRY" }, 201);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<InquiryForm />);
    const country = screen.getByLabelText("Country", { exact: true });
    expect(country).toHaveAttribute("maxlength", "2");
    expect(country).toHaveAttribute("list", "inquiry-country-options");
    expect(document.querySelector('#inquiry-country-options option[value="CN"]'))
      .toHaveAttribute("label", "China (CN)");
    expect(screen.getByText("Select a country or enter its 2-letter code (optional)."))
      .toBeVisible();

    fireEvent.change(country, { target: { value: "China" } });
    await waitFor(() => expect(country).not.toHaveValue("China"));
    expect(country).toBeInvalid();

    await user.clear(country);
    await user.type(country, "cn");
    expect(country).toHaveValue("CN");
    expect(country).toBeValid();

    await user.clear(country);
    await user.type(country, "zz");
    expect(country).toHaveValue("ZZ");
    expect(country).toBeInvalid();
    expect(screen.getByText("Country must be a valid ISO 3166-1 alpha-2 code."))
      .toBeVisible();

    await completeRequiredFields(user);
    await user.type(
      screen.getByLabelText("Describe what you need", { exact: true }),
      "Country validation test.",
    );
    await user.click(screen.getByRole("button", { name: "Find Your Fabric Solution" }));
    expect(fetchMock).not.toHaveBeenCalled();

    await user.clear(country);
    await user.type(country, "cn");
    await user.click(screen.getByRole("button", { name: "Find Your Fabric Solution" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Requirement received");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      countryCode: "CN",
    });
  });

  it("keeps the custom English file chooser synchronized with the real FileList", async () => {
    const user = userEvent.setup();
    render(<InquiryForm />);

    const fileInput = screen.getByLabelText("Upload fabric images", {
      exact: true,
    }) as HTMLInputElement;
    const chooseFiles = screen.getByRole("button", { name: "Choose files" });
    expect(chooseFiles).toHaveAttribute("type", "button");
    expect(fileInput).toHaveClass("inquiry-file-input");
    expect(screen.getByText("No files selected")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(document.body).not.toHaveTextContent("选择文件");
    expect(document.body).not.toHaveTextContent("未选择任何文件");

    await user.upload(
      fileInput,
      new File(["first"], "first-reference.png", { type: "image/png" }),
    );
    expect(fileInput.files).toHaveLength(1);
    expect(screen.getByText("first-reference.png")).toBeVisible();

    await user.upload(fileInput, [
      new File(["first"], "first-reference.png", { type: "image/png" }),
      new File(["second"], "second-reference.webp", { type: "image/webp" }),
    ]);
    expect(fileInput.files).toHaveLength(2);
    expect(screen.getByText("2 files selected")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Clear files" }));
    expect(fileInput.files).toHaveLength(0);
    expect(screen.getByText("No files selected")).toBeVisible();
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
      submitUtmSource: "test",
      submitUtmMedium: "integration",
      submitUtmCampaign: "frozen-attempt",
    });
  });

  it("uses one real tracking observation for initial success and omits Submit/session data from analytics", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("cwt_analytics_consent", "granted");
    const consentReads = vi.spyOn(Storage.prototype, "getItem");
    const inquiryBodies: Array<Record<string, unknown>> = [];
    const analyticsBodies: Array<Record<string, unknown>> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/inquiries/") {
        inquiryBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        return jsonResponse({ ok: true, reference: "CWT-TRACKED-SUCCESS" }, 201);
      }
      if (url === "/api/conversion-events/") {
        analyticsBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        return jsonResponse({ ok: true }, 201);
      }
      throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url}`);
    }));

    render(<InquiryForm />);
    await completeRequiredFields(user);
    await user.type(
      screen.getByLabelText("Describe what you need", { exact: true }),
      "One-observation initial success.",
    );
    await user.click(screen.getByRole("button", { name: "Find Your Fabric Solution" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Requirement received");
    await waitFor(() => expect(analyticsBodies).toHaveLength(1));
    expect(inquiryBodies).toHaveLength(1);
    expect(inquiryBodies[0]).toMatchObject({
      submitUtmSource: "test",
      submitUtmMedium: "integration",
      submitUtmCampaign: "frozen-attempt",
    });
    expect(analyticsBodies[0]).not.toHaveProperty("submitUtmSource");
    expect(analyticsBodies[0]).not.toHaveProperty("submitUtmMedium");
    expect(analyticsBodies[0]).not.toHaveProperty("submitUtmCampaign");
    expect(analyticsBodies[0]).not.toHaveProperty("anonymousSessionId");
    for (const field of [
      "landingPagePath",
      "referrerOrigin",
      "utmSource",
      "utmMedium",
      "utmCampaign",
      "lastNonDirectSource",
      "lastNonDirectMedium",
      "lastNonDirectCampaign",
      "attributionConfidence",
    ]) {
      expect(analyticsBodies[0]).not.toHaveProperty(field);
    }
    expect(consentReads.mock.calls.filter(([key]) => key === "cwt_analytics_consent"))
      .toHaveLength(1);
  });

  it("reuses the real frozen tracking object across uncertain retry and one success event", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("cwt_analytics_consent", "granted");
    const consentReads = vi.spyOn(Storage.prototype, "getItem");
    const inquiryBodies: string[] = [];
    const inquiryHeaders: Array<HeadersInit | undefined> = [];
    const analyticsBodies: Array<Record<string, unknown>> = [];
    let inquiryRequests = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/inquiries/") {
        inquiryRequests += 1;
        inquiryBodies.push(String(init?.body));
        inquiryHeaders.push(init?.headers);
        if (inquiryRequests === 1) throw new TypeError("Synthetic response loss");
        return jsonResponse({ ok: true, reference: "CWT-FROZEN-TRACKING", replayed: true });
      }
      if (url === "/api/conversion-events/") {
        analyticsBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        return jsonResponse({ ok: true }, 201);
      }
      throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url}`);
    }));

    render(<InquiryForm />);
    await completeRequiredFields(user);
    await user.type(
      screen.getByLabelText("Describe what you need", { exact: true }),
      "Frozen tracking retry.",
    );
    await user.click(screen.getByRole("button", { name: "Find Your Fabric Solution" }));
    expect(await screen.findByText("Submission outcome uncertain")).toBeVisible();

    window.localStorage.setItem("cwt_analytics_consent", "denied");
    window.history.replaceState(
      {},
      "",
      "/get-quote/?utm_source=changed&utm_medium=changed&utm_campaign=changed",
    );
    await user.click(screen.getByRole("button", { name: "Retry same submission" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Requirement received");
    await waitFor(() => expect(analyticsBodies).toHaveLength(1));

    expect(inquiryBodies).toHaveLength(2);
    expect(inquiryBodies[1]).toBe(inquiryBodies[0]);
    const firstHeaders = new Headers(inquiryHeaders[0]);
    const secondHeaders = new Headers(inquiryHeaders[1]);
    expect(secondHeaders.get("idempotency-key")).toBe(firstHeaders.get("idempotency-key"));
    expect(secondHeaders.get("x-cwt-upload-session"))
      .toBe(firstHeaders.get("x-cwt-upload-session"));
    expect(JSON.parse(inquiryBodies[0]!)).toMatchObject({
      submitUtmSource: "test",
      submitUtmMedium: "integration",
      submitUtmCampaign: "frozen-attempt",
      uploadTokens: [],
    });
    expect(analyticsBodies[0]).not.toHaveProperty("submitUtmSource");
    expect(analyticsBodies[0]).not.toHaveProperty("anonymousSessionId");
    for (const field of [
      "landingPagePath",
      "referrerOrigin",
      "utmSource",
      "utmMedium",
      "utmCampaign",
      "lastNonDirectSource",
      "lastNonDirectMedium",
      "lastNonDirectCampaign",
      "attributionConfidence",
    ]) {
      expect(analyticsBodies[0]).not.toHaveProperty(field);
    }
    expect(consentReads.mock.calls.filter(([key]) => key === "cwt_analytics_consent"))
      .toHaveLength(1);
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
    expect(screen.getByText("retry.png")).toBeVisible();
    expect((screen.getByLabelText("Upload fabric images", { exact: true }) as HTMLInputElement).files)
      .toHaveLength(1);
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
