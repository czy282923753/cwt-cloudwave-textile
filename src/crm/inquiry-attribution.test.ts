import { describe, expect, it } from "vitest";

import {
  normalizeRequiredSourcePagePath,
  remainingAsciiDigitCount,
  sanitizeAttributionOrigin,
  sanitizeAttributionToken,
  sanitizeInquiryAttribution,
} from "./inquiry-attribution";

describe("Inquiry attribution Choice A sanitizer", () => {
  it("is invariant to every allowed non-digit grammar class at every 7-15 digit partition", () => {
    const separators = [
      ..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      " ",
      ".",
      "_",
      ":",
      "-",
    ];
    for (let length = 7; length <= 15; length += 1) {
      const digits = Array.from({ length }, (_, index) => String(index % 10)).join("");
      for (const separator of separators) {
        for (let partition = 1; partition < digits.length; partition += 1) {
          const token = `${digits.slice(0, partition)}${separator}${digits.slice(partition)}`;
          expect(sanitizeAttributionToken(token), token).toEqual({
            value: null,
            reason: "digit_budget",
          });
        }
      }
    }
  });

  it.each([
    "13800138000",
    "138-0013-8000",
    "call-13800138000",
    "promo_138-0013-8000",
    "phone:138:0013:8000",
    "13800138000-13900139000",
    "1380013800013900139000",
    "138 0013 8000",
    "138.0013.8000",
    "138_0013_8000",
    "138:0013:8000",
    "138a0013b8000",
    "prefix-138_0013:8000-suffix",
    "138--00__13::8000",
    "launch-2026-08-29_phone:138:0013:8000",
    "2026-08-2913800138000",
    "2026-02-29-13800138000",
    "campaign-1234567",
  ])("omits complete-token digit-budget case %s", (token) => {
    expect(sanitizeAttributionToken(token)).toEqual({
      value: null,
      reason: "digit_budget",
    });
  });

  it("omits the whole international phone example even though plus is outside token grammar", () => {
    expect(sanitizeAttributionToken("+86 138 0013 8000")).toEqual({
      value: null,
      reason: "invalid_token",
    });
  });

  it("masks only non-digit-adjacent calendar-valid dates", () => {
    expect(remainingAsciiDigitCount("launch-2026-08-29")).toBe(0);
    expect(remainingAsciiDigitCount("2024-02-29")).toBe(0);
    expect(remainingAsciiDigitCount("2023-02-29")).toBe(8);
    expect(remainingAsciiDigitCount("2026-04-31")).toBe(8);
    expect(remainingAsciiDigitCount("a2026-08-29:b2024-02-29.c")).toBe(0);
    expect(remainingAsciiDigitCount("12026-08-29")).toBe(9);
    expect(remainingAsciiDigitCount("2026-08-291")).toBe(9);
    expect(remainingAsciiDigitCount("launch-2026-08-29-123456")).toBe(6);
    expect(remainingAsciiDigitCount("launch-2026-08-29-1234567")).toBe(7);
  });

  it.each([
    "spring-launch",
    "launch-2026-08-29",
    "2024-02-29",
    "campaign-123456",
    "campaign:12_34.56",
  ])("retains D <= 6 safe token %s", (token) => {
    expect(sanitizeAttributionToken(token)).toEqual({ value: token });
  });

  it("omits declared grammar, identity, file and length classes independently", () => {
    expect(sanitizeAttributionToken("buyer@example.test")).toEqual({
      value: null,
      reason: "email_like",
    });
    expect(sanitizeAttributionToken("11111111-1111-4111-8111-111111111111")).toEqual({
      value: null,
      reason: "uuid_like",
    });
    expect(sanitizeAttributionToken("customer-sample.jpg")).toEqual({
      value: null,
      reason: "file_like",
    });
    expect(sanitizeAttributionToken("campaign/unsafe")).toEqual({
      value: null,
      reason: "invalid_token",
    });
    expect(sanitizeAttributionToken("campaign\nunsafe")).toEqual({
      value: null,
      reason: "invalid_token",
    });
    expect(sanitizeAttributionToken("活动-campaign")).toEqual({
      value: null,
      reason: "invalid_token",
    });
    expect(sanitizeAttributionToken(`campaign-${"a".repeat(100)}`)).toEqual({
      value: null,
      reason: "oversize",
    });
    expect(sanitizeAttributionToken("   ")).toEqual({ value: null, reason: "empty" });
  });

  it("canonicalizes safe origins and omits credentials, paths, query, fragments, UUID and numeric hosts", () => {
    expect(sanitizeAttributionOrigin("HTTPS://Example.COM:443/")).toEqual({
      value: "https://example.com",
    });
    for (const origin of [
      "https://user:secret@example.com/",
      "https://example.com/private",
      "https://example.com/?email=buyer@example.test",
      "https://example.com/#customer",
      "ftp://example.com/",
    ]) {
      expect(sanitizeAttributionOrigin(origin), origin).toEqual({
        value: null,
        reason: "invalid_origin",
      });
    }
    expect(sanitizeAttributionOrigin("https://11111111-1111-4111-8111-111111111111.example/")).toEqual({
      value: null,
      reason: "uuid_like",
    });
    expect(sanitizeAttributionOrigin("https://customer1234567.example/")).toEqual({
      value: null,
      reason: "digit_budget",
    });
    expect(sanitizeAttributionOrigin("https://cwtextile.test/", {
      omitSameOrigin: true,
      siteOrigin: "https://cwtextile.test",
    })).toEqual({ value: null, reason: "same_origin" });
  });

  it("keeps required source paths hard-fail and optional paths field-local", () => {
    expect(normalizeRequiredSourcePagePath("/GET-QUOTE/")).toBe("/get-quote/");
    expect(normalizeRequiredSourcePagePath("/GET-QUOTE?ignored=true")).toBe(
      "/get-quote/",
    );
    for (const path of [
      "get-quote",
      "/api/storage/private-object/",
      "/api/inquiry-assets/private-id/",
      "/admin/inquiries/",
      "/产品/",
    ]) {
      expect(() => normalizeRequiredSourcePagePath(path), path).toThrow(
        "A valid source page path is required.",
      );
    }
    const sanitized = sanitizeInquiryAttribution({
      sourcePagePath: "/get-quote/",
      landingPagePath: "/api/inquiry-assets/private-id/",
      utmSource: "safe-source",
    });
    expect(sanitized).toMatchObject({
      sourcePagePath: "/get-quote/",
      landingPagePath: null,
      utmSource: "safe-source",
      omissions: [{ field: "landing_page_path", reason: "private_path" }],
    });
  });

  it("documents bounded residual-risk cases without claiming absolute PII detection", () => {
    for (const residual of [
      "call-one-three-eight-zero-zero-one-three-eight-zero-zero-zero",
      "local-123456",
      "2026-08-29",
      "private-business-code-ABCDEF",
    ]) {
      expect(sanitizeAttributionToken(residual), residual).toEqual({ value: residual });
    }
  });

  it("retains safe siblings while independently omitting unsafe First, Last and Submit fields", () => {
    expect(sanitizeInquiryAttribution({
      sourcePagePath: "/get-quote/",
      landingPagePath: "/products/synthetic-fabric/",
      referrer: "https://example.com/",
      utmSource: "spring-launch",
      utmMedium: "buyer@example.test",
      utmCampaign: "launch-2026-08-29",
      lastNonDirectSource: "https://cwtextile.test/",
      lastNonDirectMedium: "referral",
      lastNonDirectCampaign: "campaign-1234567",
      submitReferrer: "https://partner.example/",
      submitUtmSource: "safe-submit",
      submitUtmMedium: "activity/unsupported",
      submitUtmCampaign: "2024-02-29",
    }, { siteOrigin: "https://cwtextile.test" })).toMatchObject({
      landingPagePath: "/products/synthetic-fabric/",
      referrer: "https://example.com",
      utmSource: "spring-launch",
      utmMedium: null,
      utmCampaign: "launch-2026-08-29",
      lastNonDirectSource: null,
      lastNonDirectMedium: "referral",
      lastNonDirectCampaign: null,
      submitReferrer: "https://partner.example",
      submitUtmSource: "safe-submit",
      submitUtmMedium: null,
      submitUtmCampaign: "2024-02-29",
      attributionConfidence: "high",
      omissions: [
        { field: "utm_medium", reason: "email_like" },
        { field: "last_non_direct_source", reason: "same_origin" },
        { field: "last_non_direct_campaign", reason: "digit_budget" },
        { field: "submit_utm_medium", reason: "invalid_token" },
      ],
    });
  });
});
