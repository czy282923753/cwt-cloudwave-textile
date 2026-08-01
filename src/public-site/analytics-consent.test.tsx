// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { AnalyticsConsent } from "./analytics-consent";

describe("Analytics Consent UI", () => {
  beforeEach(() => window.localStorage.clear());

  it("defaults analytics off and supports allow, withdraw, and later modification", async () => {
    const user = userEvent.setup();
    render(<AnalyticsConsent />);
    expect(await screen.findByRole("dialog", { name: "Analytics privacy choices" })).not.toBeNull();
    expect(window.localStorage.getItem("cwt_analytics_consent")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Allow analytics" }));
    expect(window.localStorage.getItem("cwt_analytics_consent")).toBe("granted");
    await user.click(screen.getByRole("button", { name: "Privacy choices" }));
    await user.click(screen.getByRole("button", { name: "Withdraw consent" }));
    expect(window.localStorage.getItem("cwt_analytics_consent")).toBe("denied");
    await waitFor(() => expect(screen.getByRole("button", { name: "Privacy choices" })).not.toBeNull());
  });
});
