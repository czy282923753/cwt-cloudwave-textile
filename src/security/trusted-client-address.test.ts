import { describe, expect, it } from "vitest";

import { TRUSTED_CLIENT_ADDRESS_HEADER, trustedClientAddressFromRequest } from "./trusted-client-address";

describe("trusted client address", () => {
  it("consumes only the Nginx-attested internal header", () => {
    const request = new Request("http://cwt.invalid", { headers: {
      [TRUSTED_CLIENT_ADDRESS_HEADER]: "203.0.113.7",
      "cf-connecting-ip": "198.51.100.1",
      "x-forwarded-for": "198.51.100.2",
      "x-real-ip": "198.51.100.3",
    } });
    expect(trustedClientAddressFromRequest(request)).toEqual({ kind: "trusted", address: "203.0.113.7" });
  });

  it("normalizes IPv6 and rejects missing, malformed, port, zone and whitespace input", () => {
    expect(trustedClientAddressFromRequest(new Request("http://cwt.invalid", {
      headers: { [TRUSTED_CLIENT_ADDRESS_HEADER]: "2001:0db8:0:0:0:0:0:1" },
    }))).toEqual({ kind: "trusted", address: "2001:db8::1" });
    for (const value of [undefined, "unknown", "1.2.3.4:443", "fe80::1%eth0"] as const) {
      const headers = value === undefined ? {} : { [TRUSTED_CLIENT_ADDRESS_HEADER]: value };
      expect(trustedClientAddressFromRequest(new Request("http://cwt.invalid", { headers }))).toEqual({ kind: "unavailable" });
    }
  });

  it("allows an explicit Synthetic test seam without trusting public headers", () => {
    const request = new Request("http://cwt.invalid", { headers: { "cf-connecting-ip": "203.0.113.9" } });
    expect(trustedClientAddressFromRequest(request)).toEqual({ kind: "unavailable" });
    expect(trustedClientAddressFromRequest(request, { syntheticAddress: "192.0.2.8" }))
      .toEqual({ kind: "trusted", address: "192.0.2.8" });
  });
});
