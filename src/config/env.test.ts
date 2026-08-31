import { describe, expect, it } from "vitest";

import { parseEnvironment } from "./env";
import type { SecretFileReader } from "./secret-files";

const secretReader: SecretFileReader = {
  read(path) {
    if (path.endsWith("auth-session-secret")) return "a".repeat(32);
    if (path.endsWith("valkey-password")) return "v".repeat(32);
    if (path.endsWith("backup-repository-password")) return "b".repeat(32);
    if (path.endsWith("database-url")) {
      const environment = path.includes("staging-") ? "staging" : "production";
      return `postgresql://cwt_${environment}:password@postgres:5432/cwt_${environment}`;
    }
    return `synthetic-${path.split("-").at(-1)}`;
  },
};

function protectedEnvironment(environment: "production" | "staging") {
  const prefix = `/run/secrets/${environment}-`;
  return {
    APP_ENV: environment,
    NEXT_PUBLIC_SITE_URL: environment === "production" ? "https://cwtextile.com" : "https://staging.cwtextile.com",
    NON_PRODUCTION_NOINDEX: environment === "production" ? "false" : "true",
    DATABASE_DRIVER: "postgres",
    DATABASE_URL: "",
    DATABASE_URL_FILE: `${prefix}database-url`,
    DATABASE_POOL_MAX: environment === "production" ? "6" : "2",
    AUTH_SESSION_SECRET: "",
    AUTH_SESSION_SECRET_FILE: `${prefix}auth-session-secret`,
    STORAGE_DRIVER: "local",
    PUBLIC_STORAGE_ROOT: `/srv/cwt/${environment}/media/public`,
    PRIVATE_STORAGE_ROOT: `/srv/cwt/${environment}/media/private-inquiries`,
    IMPORT_STORAGE_ROOT: `/srv/cwt/${environment}/media/import`,
    FILE_SCAN_DRIVER: "cloudmersive",
    FILE_SCAN_ORIGIN: "https://api.cloudmersive.example.test",
    FILE_SCAN_API_KEY: "",
    FILE_SCAN_API_KEY_FILE: `${prefix}cloudmersive-api-key`,
    FILE_SCAN_ACCOUNT_CUSTODY: `${environment}:cloudmersive-account`,
    SHARED_RATE_LIMIT_DRIVER: "valkey",
    VALKEY_ENDPOINT: `redis://valkey-${environment}:6379`,
    VALKEY_USERNAME: `cwt-${environment}`,
    VALKEY_PASSWORD: "",
    VALKEY_PASSWORD_FILE: `${prefix}valkey-password`,
    RATE_LIMIT_KEY_PREFIX: `cwt:${environment}:rate:`,
    TRUSTED_PROXY_MODE: "cloudflare",
    EMAIL_DRIVER: "smtp",
    EMAIL_FROM: "CloudWave Textile Sales <sales@cwtextile.com>",
    INQUIRY_NOTIFICATION_TO: environment === "production" ? "info@cwtextile.com" : "test@cwtextile.com",
    SMTP_HOST: "smtp.example.test",
    SMTP_USER: "sales@cwtextile.com",
    SMTP_PASSWORD: "",
    SMTP_PASSWORD_FILE: `${prefix}smtp-password`,
    INQUIRY_FILE_RETENTION_DAYS: "30",
    CUSTOMER_DATA_RETENTION_DAYS: "365",
    AUDIT_LOG_RETENTION_DAYS: "365",
    MONITORING_DRIVER: "external",
    SENTRY_DSN: "",
    SENTRY_DSN_FILE: `${prefix}monitoring-dsn`,
    AI_PROVIDER_API_KEY: "",
    AI_PROVIDER_API_KEY_FILE: `${prefix}ai-api-key`,
    COS_ACCESS_KEY_ID: "",
    COS_ACCESS_KEY_ID_FILE: `${prefix}cos-access-key-id`,
    COS_SECRET_ACCESS_KEY: "",
    COS_SECRET_ACCESS_KEY_FILE: `${prefix}cos-secret-key`,
    BACKUP_REPOSITORY_PASSWORD: "",
    BACKUP_REPOSITORY_PASSWORD_FILE: `${prefix}backup-password`,
  } as const;
}

describe("environment safety", () => {
  it("allows explicit local/test adapters and literal development secrets", () => {
    const environment = parseEnvironment({ APP_ENV: "test" });
    expect(environment.DATABASE_DRIVER).toBe("pglite");
    expect(environment.FILE_SCAN_DRIVER).toBe("development");
    expect(environment.SHARED_RATE_LIMIT_DRIVER).toBe("memory");
    expect(() => parseEnvironment({ APP_ENV: "test", FILE_SCAN_DRIVER: "http" })).toThrow();
  });

  it.each(["production", "staging"] as const)("accepts the exact isolated %s configuration through synthetic secret files", (name) => {
    const environment = parseEnvironment(protectedEnvironment(name), { secretFileReader: secretReader });
    expect(environment.APP_ENV).toBe(name);
    expect(environment.DATABASE_URL).toContain(`cwt_${name}`);
    expect(environment.AUTH_SESSION_SECRET).toHaveLength(32);
    expect(environment.STORAGE_DRIVER).toBe("local");
  });

  it("refuses protected literal secrets before reading files", () => {
    expect(() => parseEnvironment({
      ...protectedEnvironment("production"),
      AUTH_SESSION_SECRET: "literal-secret-must-never-be-accepted",
    }, { secretFileReader: secretReader })).toThrow(/refuses literal AUTH_SESSION_SECRET/);
  });

  it("refuses cross-environment or non-secret-root file paths", () => {
    for (const path of [
      "/run/secrets/staging-database-url",
      "/run/secrets/production-auth-session-secret",
      "/etc/cwt/production/database-url",
      "/run/secrets/production/../production-database-url",
      "production-database-url",
    ]) {
      expect(() => parseEnvironment({
        ...protectedEnvironment("production"),
        DATABASE_URL_FILE: path,
      }, { secretFileReader: secretReader }), path).toThrow(/environment-prefixed path/);
    }
  });

  it("refuses S3, wrong roots, overlap and excessive pools in protected environments", () => {
    for (const override of [
      { STORAGE_DRIVER: "s3" },
      { PRIVATE_STORAGE_ROOT: "/srv/cwt/production/media/public/private" },
      { PUBLIC_STORAGE_ROOT: "/srv/cwt/staging/media/public" },
      { DATABASE_POOL_MAX: "7" },
    ]) {
      expect(() => parseEnvironment({ ...protectedEnvironment("production"), ...override }, { secretFileReader: secretReader }))
        .toThrow(/Production configuration refused/);
    }
  });

  it("requires staging noindex and rejects the retired preview identity", () => {
    expect(() => parseEnvironment({
      ...protectedEnvironment("staging"),
      NON_PRODUCTION_NOINDEX: "false",
    }, { secretFileReader: secretReader })).toThrow(/Staging must remain noindex/);
    expect(() => parseEnvironment({ APP_ENV: "preview" })).toThrow();
  });

  it("accepts only the exact frozen production canonical origin", () => {
    for (const invalidOrigin of [
      "http://cwtextile.com", "https://www.cwtextile.com", "https://localhost",
      "https://127.0.0.1", "https://user@cwtextile.com", "https://cwtextile.com:8443",
      "https://cwtextile.com/path", "https://cwtextile.com?query=1",
      "https://cwtextile.com#fragment", "https://cwtextile.com/",
    ]) {
      expect(() => parseEnvironment({
        ...protectedEnvironment("production"),
        NEXT_PUBLIC_SITE_URL: invalidOrigin,
      }, { secretFileReader: secretReader }), invalidOrigin).toThrow(/NEXT_PUBLIC_SITE_URL must be exactly https:\/\/cwtextile\.com/);
    }
  });
});
