import { isAbsolute, relative, resolve } from "node:path";
import { z } from "zod";

import { readProtectedSecret, type SecretFileReader } from "./secret-files";

export const PRODUCTION_SITE_ORIGIN = "https://cwtextile.com";
export const STAGING_SITE_ORIGIN = "https://staging.cwtextile.com";

export const PROTECTED_STORAGE_ROOTS = Object.freeze({
  production: Object.freeze({
    public: "/srv/cwt/production/media/public",
    private: "/srv/cwt/production/media/private-inquiries",
    imports: "/srv/cwt/production/media/import",
  }),
  staging: Object.freeze({
    public: "/srv/cwt/staging/media/public",
    private: "/srv/cwt/staging/media/private-inquiries",
    imports: "/srv/cwt/staging/media/import",
  }),
});

const booleanString = z.enum(["true", "false"]).default("false")
  .transform((value) => value === "true");
const positiveIntegerString = (fallback: number) =>
  z.coerce.number().int().positive().default(fallback);
const optionalPositiveIntegerString = z
  .union([z.literal(""), z.coerce.number().int().positive()]).default("")
  .transform((value) => (value === "" ? null : value));

const environmentSchema = z.object({
  APP_ENV: z.enum(["local", "test", "staging", "production"]).default("local"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NON_PRODUCTION_NOINDEX: z.enum(["true", "false"]).default("true")
    .transform((value) => value === "true"),
  DATABASE_DRIVER: z.enum(["pglite", "postgres"]).default("pglite"),
  DATABASE_URL: z.string().default(""),
  DATABASE_URL_FILE: z.string().default(""),
  DATABASE_POOL_MAX: positiveIntegerString(10),
  PGLITE_DATA_DIR: z.string().default(".data/pglite"),
  AUTH_SESSION_SECRET: z.string().default("local-only-development-secret-change-me"),
  AUTH_SESSION_SECRET_FILE: z.string().default(""),
  AUTH_COOKIE_NAME: z.string().min(1).default("cwt_session"),
  ANALYTICS_CONSENT_COOKIE_NAME: z.string().min(1).default("cwt_analytics_session"),
  DEV_ADMIN_EMAIL: z.email().default("admin@example.test"),
  DEV_ADMIN_PASSWORD: z.string().min(12).default("local-only-admin-password"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  PUBLIC_STORAGE_ROOT: z.string().default(".storage/public"),
  PRIVATE_STORAGE_ROOT: z.string().default(".storage/private"),
  IMPORT_STORAGE_ROOT: z.string().default(".storage/imports"),
  S3_ENDPOINT: z.string().default(""),
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY_ID: z.string().default(""),
  S3_SECRET_ACCESS_KEY: z.string().default(""),
  S3_PUBLIC_BUCKET: z.string().default(""),
  S3_PRIVATE_BUCKET: z.string().default(""),
  S3_IMPORT_BUCKET: z.string().default(""),
  MAX_PUBLIC_FILE_BYTES: positiveIntegerString(12_582_912),
  MAX_INQUIRY_FILE_BYTES: positiveIntegerString(12_582_912),
  MAX_FILES_PER_UPLOAD: positiveIntegerString(8),
  MAX_UPLOAD_INTENT_JSON_BYTES: positiveIntegerString(8_192),
  MAX_INQUIRY_JSON_BYTES: positiveIntegerString(32_768),
  UPLOAD_INTENT_TTL_SECONDS: positiveIntegerString(900),
  TRUSTED_PROXY_MODE: z.enum(["none", "cloudflare"]).default("none"),
  FILE_SCAN_DRIVER: z.enum(["development", "cloudmersive", "http"]).default("development"),
  FILE_SCAN_ORIGIN: z.string().default(""),
  FILE_SCAN_API_KEY: z.string().default(""),
  FILE_SCAN_API_KEY_FILE: z.string().default(""),
  FILE_SCAN_ACCOUNT_CUSTODY: z.string().default(""),
  FILE_SCAN_ENDPOINT: z.string().default(""),
  FILE_SCAN_TOKEN: z.string().default(""),
  PRIVATE_URL_TTL_SECONDS: positiveIntegerString(300),
  INQUIRY_FILE_RETENTION_DAYS: optionalPositiveIntegerString,
  CUSTOMER_DATA_RETENTION_DAYS: optionalPositiveIntegerString,
  AUDIT_LOG_RETENTION_DAYS: optionalPositiveIntegerString,
  SHARED_RATE_LIMIT_DRIVER: z.enum(["memory", "valkey"]).default("memory"),
  VALKEY_ENDPOINT: z.string().default(""),
  VALKEY_USERNAME: z.string().default(""),
  VALKEY_PASSWORD: z.string().default(""),
  VALKEY_PASSWORD_FILE: z.string().default(""),
  RATE_LIMIT_KEY_PREFIX: z.string().default(""),
  EMAIL_DRIVER: z.enum(["log", "smtp"]).default("log"),
  EMAIL_FROM: z.string().default(""),
  INQUIRY_NOTIFICATION_TO: z.string().default(""),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: positiveIntegerString(587),
  SMTP_SECURE: booleanString,
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  SMTP_PASSWORD_FILE: z.string().default(""),
  ANALYTICS_DRIVER: z.enum(["disabled", "ga4"]).default("disabled"),
  NEXT_PUBLIC_GA4_MEASUREMENT_ID: z.string().default(""),
  GSC_SITE_URL: z.string().default(""),
  MONITORING_DRIVER: z.enum(["log", "external"]).default("log"),
  SENTRY_DSN: z.string().default(""),
  SENTRY_DSN_FILE: z.string().default(""),
  AI_PROVIDER_API_KEY: z.string().default(""),
  AI_PROVIDER_API_KEY_FILE: z.string().default(""),
  COS_ACCESS_KEY_ID: z.string().default(""),
  COS_ACCESS_KEY_ID_FILE: z.string().default(""),
  COS_SECRET_ACCESS_KEY: z.string().default(""),
  COS_SECRET_ACCESS_KEY_FILE: z.string().default(""),
  BACKUP_REPOSITORY_PASSWORD: z.string().default(""),
  BACKUP_REPOSITORY_PASSWORD_FILE: z.string().default(""),
  FEATURE_REFINE_ADMIN: booleanString,
  FEATURE_SOURCE_DECLARATION: booleanString,
  FEATURE_AI: booleanString,
  FEATURE_SEO_ASSISTANT: booleanString,
  FEATURE_PRODUCT_IMPORT: booleanString,
});

export type AppEnvironment = z.infer<typeof environmentSchema>;

const protectedSecrets = [
  ["DATABASE_URL", "DATABASE_URL_FILE", 1],
  ["AUTH_SESSION_SECRET", "AUTH_SESSION_SECRET_FILE", 32],
  ["FILE_SCAN_API_KEY", "FILE_SCAN_API_KEY_FILE", 1],
  ["VALKEY_PASSWORD", "VALKEY_PASSWORD_FILE", 16],
  ["SMTP_PASSWORD", "SMTP_PASSWORD_FILE", 1],
  ["SENTRY_DSN", "SENTRY_DSN_FILE", 1],
  ["AI_PROVIDER_API_KEY", "AI_PROVIDER_API_KEY_FILE", 1],
  ["COS_ACCESS_KEY_ID", "COS_ACCESS_KEY_ID_FILE", 1],
  ["COS_SECRET_ACCESS_KEY", "COS_SECRET_ACCESS_KEY_FILE", 1],
  ["BACKUP_REPOSITORY_PASSWORD", "BACKUP_REPOSITORY_PASSWORD_FILE", 16],
] as const;

function pathsOverlap(left: string, right: string): boolean {
  const leftToRight = relative(left, right);
  const rightToLeft = relative(right, left);
  return leftToRight === "" || !leftToRight.startsWith("..") || !rightToLeft.startsWith("..");
}

function assertProtectedConfiguration(environment: AppEnvironment): void {
  if (environment.APP_ENV !== "production" && environment.APP_ENV !== "staging") return;
  const failures: string[] = [];
  const expectedOrigin = environment.APP_ENV === "production" ? PRODUCTION_SITE_ORIGIN : STAGING_SITE_ORIGIN;
  const expectedRoots = PROTECTED_STORAGE_ROOTS[environment.APP_ENV];
  const configuredRoots = [environment.PUBLIC_STORAGE_ROOT, environment.PRIVATE_STORAGE_ROOT, environment.IMPORT_STORAGE_ROOT];
  const requiredRoots = [expectedRoots.public, expectedRoots.private, expectedRoots.imports];

  if (environment.NEXT_PUBLIC_SITE_URL !== expectedOrigin) failures.push(`NEXT_PUBLIC_SITE_URL must be exactly ${expectedOrigin}`);
  if (environment.APP_ENV === "staging" && !environment.NON_PRODUCTION_NOINDEX) failures.push("Staging must remain noindex");
  if (environment.DATABASE_DRIVER !== "postgres") failures.push("isolated PostgreSQL is required");
  if (environment.DATABASE_POOL_MAX > (environment.APP_ENV === "production" ? 6 : 2)) failures.push("DATABASE_POOL_MAX exceeds the protected Web process budget");
  if (environment.STORAGE_DRIVER !== "local") failures.push("hardened local origin storage is required");
  for (let index = 0; index < configuredRoots.length; index += 1) {
    const configured = configuredRoots[index];
    if (!configured || !isAbsolute(configured) || resolve(configured) !== configured) failures.push("storage roots must be canonical absolute paths");
    else if (configured !== requiredRoots[index]) failures.push("storage roots must match the environment-specific approved roots");
  }
  for (let left = 0; left < configuredRoots.length; left += 1) {
    for (let right = left + 1; right < configuredRoots.length; right += 1) {
      const leftRoot = configuredRoots[left];
      const rightRoot = configuredRoots[right];
      if (leftRoot && rightRoot && pathsOverlap(leftRoot, rightRoot)) failures.push("public, private, and import storage roots must not overlap");
    }
  }
  if (environment.FILE_SCAN_DRIVER !== "cloudmersive") failures.push("Cloudmersive must be the protected malware scanner driver");
  try {
    const scannerOrigin = new URL(environment.FILE_SCAN_ORIGIN);
    if (scannerOrigin.protocol !== "https:" || scannerOrigin.username || scannerOrigin.password || scannerOrigin.pathname !== "/" || scannerOrigin.search || scannerOrigin.hash) failures.push("FILE_SCAN_ORIGIN must be an HTTPS origin without credentials or path");
  } catch {
    failures.push("FILE_SCAN_ORIGIN must be a valid HTTPS origin");
  }
  if (!environment.FILE_SCAN_ACCOUNT_CUSTODY.startsWith(`${environment.APP_ENV}:`)) failures.push("Scanner account custody must be environment-specific");
  if (environment.SHARED_RATE_LIMIT_DRIVER !== "valkey" || !environment.VALKEY_ENDPOINT || environment.VALKEY_USERNAME !== `cwt-${environment.APP_ENV}` || environment.RATE_LIMIT_KEY_PREFIX !== `cwt:${environment.APP_ENV}:rate:`) failures.push("an isolated environment-specific Valkey authority is required");
  if (environment.TRUSTED_PROXY_MODE !== "cloudflare") failures.push("Cloudflare trusted proxy mode is required");
  if (environment.EMAIL_DRIVER !== "smtp" || !environment.INQUIRY_NOTIFICATION_TO || !environment.EMAIL_FROM || !environment.SMTP_HOST) failures.push("an environment-specific SMTP path is required");
  if (!environment.INQUIRY_FILE_RETENTION_DAYS || !environment.CUSTOMER_DATA_RETENTION_DAYS || !environment.AUDIT_LOG_RETENTION_DAYS) failures.push("approved retention periods are required");
  if (environment.MONITORING_DRIVER !== "external") failures.push("external monitoring configuration is required");
  if (failures.length > 0) throw new Error(`${environment.APP_ENV === "production" ? "Production" : "Staging"} configuration refused: ${failures.join("; ")}.`);
}

export function parseEnvironment(
  input: Record<string, string | undefined> = process.env,
  options: Readonly<{ secretFileReader?: SecretFileReader }> = {},
): AppEnvironment {
  const parsed = environmentSchema.parse(input);
  if (parsed.APP_ENV !== "production" && parsed.APP_ENV !== "staging") return parsed;
  const resolved = { ...parsed };
  for (const [literalField, fileField, minimumLength] of protectedSecrets) {
    resolved[literalField] = readProtectedSecret({
      environment: parsed.APP_ENV,
      field: literalField,
      literal: parsed[literalField],
      file: parsed[fileField],
      minimumLength,
      ...(options.secretFileReader ? { reader: options.secretFileReader } : {}),
    });
  }
  assertProtectedConfiguration(resolved);
  return resolved;
}

export const env = parseEnvironment();

export function publicIndexingAllowed(): boolean {
  return env.APP_ENV === "production" && !env.NON_PRODUCTION_NOINDEX;
}
