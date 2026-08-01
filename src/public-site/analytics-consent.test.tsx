// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyticsConsent } from "./analytics-consent";

describe("Analytics Consent UI", () => {
  beforeEach(() => {
    window.localStorage.clear();
    let version = 0;
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) {
        return new Response(JSON.stringify({ status: "unknown", consentVersion: version }), { status: 200 });
      }
      const body = JSON.parse(String(init.body)) as { status: string; expectedVersion: number };
      expect(body.expectedVersion).toBe(version);
      version += 1;
      return new Response(JSON.stringify({ status: body.status, consentVersion: version }), { status: 200 });
    }));
  });

  it("defaults analytics off and supports allow, withdraw, and later modification", async () => {
    const user = userEvent.setup();
    render(<AnalyticsConsent />);
    expect(await screen.findByRole("dialog", { name: "Analytics privacy choices" })).not.toBeNull();
    expect(window.localStorage.getItem("cwt_analytics_consent")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Allow analytics" }));
    await waitFor(() => expect(window.localStorage.getItem("cwt_analytics_consent")).toBe("granted"));
    await user.click(screen.getByRole("button", { name: "Privacy choices" }));
    await user.click(screen.getByRole("button", { name: "Withdraw consent" }));
    await waitFor(() => expect(window.localStorage.getItem("cwt_analytics_consent")).toBe("denied"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Privacy choices" })).not.toBeNull());
  });
});
