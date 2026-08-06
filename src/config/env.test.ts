import { describe, expect, it } from "vitest";

import { parseEnvironment } from "./env";

const productionEnvironment = {
  APP_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://cwtextile.com",
  NON_PRODUCTION_NOINDEX: "false",
  DATABASE_DRIVER: "postgres",
  DATABASE_URL: "postgresql://cwt_test:cwt_test@127.0.0.1:5432/cwt_test",
  STORAGE_DRIVER: "s3",
  S3_PUBLIC_BUCKET: "cwt-test-public",
  S3_PRIVATE_BUCKET: "cwt-test-private",
  S3_IMPORT_BUCKET: "cwt-test-import",
  FILE_SCAN_DRIVER: "http",
  FILE_SCAN_ENDPOINT: "https://scanner.example.test/scan",
  UPLOAD_RATE_LIMIT_DRIVER: "http",
  UPLOAD_RATE_LIMIT_ENDPOINT: "https://limiter.example.test/check",
  TRUSTED_PROXY_MODE: "cloudflare",
  EMAIL_DRIVER: "smtp",
  EMAIL_FROM: "sales@example.test",
  INQUIRY_NOTIFICATION_TO: "test@example.test",
  SMTP_HOST: "smtp.example.test",
  WHATSAPP_NUMBER: "0000000000",
  INQUIRY_FILE_RETENTION_DAYS: "30",
  CUSTOMER_DATA_RETENTION_DAYS: "365",
  AUDIT_LOG_RETENTION_DAYS: "365",
  MONITORING_DRIVER: "external",
} as const;

describe("environment safety", () => {
  it("allows explicitly marked local adapters outside production", () => {
    expect(parseEnvironment({ APP_ENV: "test" }).DATABASE_DRIVER).toBe("pglite");
  });

  it("fails closed when placeholders are used in production", () => {
    expect(() => parseEnvironment({ APP_ENV: "production" })).toThrow(
      /Production configuration refused/,
    );
  });

  it("uses staging as the only non-production deployment identity", () => {
    expect(parseEnvironment({ APP_ENV: "staging" }).APP_ENV).toBe("staging");
    expect(() => parseEnvironment({ APP_ENV: "preview" })).toThrow();
  });

  it("accepts only the exact frozen production canonical origin", () => {
    expect(parseEnvironment(productionEnvironment).NEXT_PUBLIC_SITE_URL).toBe(
      "https://cwtextile.com",
    );
    expect(new URL("/sitemap.xml", "https://cwtextile.com").toString()).toBe(
      "https://cwtextile.com/sitemap.xml",
    );
    for (const invalidOrigin of [
      "http://cwtextile.com",
      "https://www.cwtextile.com",
      "https://localhost",
      "https://127.0.0.1",
      "https://user@cwtextile.com",
      "https://cwtextile.com:8443",
      "https://cwtextile.com/path",
      "https://cwtextile.com?query=1",
      "https://cwtextile.com#fragment",
      "https://cwtextile.com/",
    ]) {
      expect(() => parseEnvironment({
        ...productionEnvironment,
        NEXT_PUBLIC_SITE_URL: invalidOrigin,
      }), invalidOrigin).toThrow(/NEXT_PUBLIC_SITE_URL must be exactly https:\/\/cwtextile\.com/);
    }
  });
});
