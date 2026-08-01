import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const positiveIntegerString = (fallback: number) =>
  z.coerce.number().int().positive().default(fallback);

const optionalPositiveIntegerString = z
  .union([z.literal(""), z.coerce.number().int().positive()])
  .default("")
  .transform((value) => (value === "" ? null : value));

const environmentSchema = z.object({
  APP_ENV: z.enum(["local", "test", "preview", "production"]).default("local"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NON_PRODUCTION_NOINDEX: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  DATABASE_DRIVER: z.enum(["pglite", "postgres"]).default("pglite"),
  DATABASE_URL: z.string().default(""),
  PGLITE_DATA_DIR: z.string().default(".data/pglite"),
  AUTH_SESSION_SECRET: z
    .string()
    .min(32)
    .default("local-only-development-secret-change-me"),
  AUTH_COOKIE_NAME: z.string().min(1).default("cwt_session"),
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
  PUBLIC_ASSET_BASE_URL: z.string().default(""),
  MAX_PUBLIC_FILE_BYTES: positiveIntegerString(12_582_912),
  MAX_INQUIRY_FILE_BYTES: positiveIntegerString(12_582_912),
  MAX_FILES_PER_UPLOAD: positiveIntegerString(8),
  FILE_SCAN_DRIVER: z.enum(["development", "http"]).default("development"),
  FILE_SCAN_ENDPOINT: z.string().default(""),
  FILE_SCAN_TOKEN: z.string().default(""),
  PRIVATE_URL_TTL_SECONDS: positiveIntegerString(300),
  INQUIRY_FILE_RETENTION_DAYS: optionalPositiveIntegerString,
  CUSTOMER_DATA_RETENTION_DAYS: optionalPositiveIntegerString,
  AUDIT_LOG_RETENTION_DAYS: optionalPositiveIntegerString,
  UPLOAD_RATE_LIMIT_DRIVER: z.enum(["memory", "http"]).default("memory"),
  UPLOAD_RATE_LIMIT_ENDPOINT: z.string().default(""),
  UPLOAD_RATE_LIMIT_TOKEN: z.string().default(""),
  EMAIL_DRIVER: z.enum(["log", "smtp"]).default("log"),
  EMAIL_FROM: z.string().default(""),
  INQUIRY_NOTIFICATION_TO: z.string().default(""),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: positiveIntegerString(587),
  SMTP_SECURE: booleanString,
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  WHATSAPP_NUMBER: z.string().default(""),
  ANALYTICS_DRIVER: z.enum(["disabled", "ga4"]).default("disabled"),
  NEXT_PUBLIC_GA4_MEASUREMENT_ID: z.string().default(""),
  GSC_SITE_URL: z.string().default(""),
  MONITORING_DRIVER: z.enum(["log", "external"]).default("log"),
  FEATURE_REFINE_ADMIN: booleanString,
  FEATURE_SOURCE_DECLARATION: booleanString,
  FEATURE_AI: booleanString,
  FEATURE_SEO_ASSISTANT: booleanString,
});

export type AppEnvironment = z.infer<typeof environmentSchema>;

function assertProductionConfiguration(environment: AppEnvironment): void {
  if (environment.APP_ENV !== "production") return;

  const failures: string[] = [];
  if (environment.DATABASE_DRIVER !== "postgres" || !environment.DATABASE_URL) {
    failures.push("a dedicated PostgreSQL DATABASE_URL is required");
  }
  if (new URL(environment.NEXT_PUBLIC_SITE_URL).hostname === "localhost") {
    failures.push("a formal public site URL is required");
  }
  if (environment.STORAGE_DRIVER !== "s3") {
    failures.push("S3-compatible isolated storage is required");
  }
  if (
    !environment.S3_PUBLIC_BUCKET ||
    !environment.S3_PRIVATE_BUCKET ||
    !environment.S3_IMPORT_BUCKET
  ) {
    failures.push("separate public, private, and import buckets are required");
  }
  if (!environment.PUBLIC_ASSET_BASE_URL) {
    failures.push("a CDN/public asset base URL is required");
  }
  if (environment.FILE_SCAN_DRIVER !== "http" || !environment.FILE_SCAN_ENDPOINT) {
    failures.push("a fail-closed production malware scanner is required");
  }
  if (
    environment.UPLOAD_RATE_LIMIT_DRIVER !== "http" ||
    !environment.UPLOAD_RATE_LIMIT_ENDPOINT
  ) {
    failures.push("a shared production upload rate limiter is required");
  }
  if (
    environment.EMAIL_DRIVER !== "smtp" ||
    !environment.INQUIRY_NOTIFICATION_TO ||
    !environment.EMAIL_FROM ||
    !environment.SMTP_HOST
  ) {
    failures.push("a production inquiry email path is required");
  }
  if (!environment.WHATSAPP_NUMBER) {
    failures.push("the confirmed public WhatsApp number is required");
  }
  if (
    !environment.INQUIRY_FILE_RETENTION_DAYS ||
    !environment.CUSTOMER_DATA_RETENTION_DAYS ||
    !environment.AUDIT_LOG_RETENTION_DAYS
  ) {
    failures.push("approved production retention periods are required");
  }
  if (environment.MONITORING_DRIVER !== "external") {
    failures.push("external production monitoring is required");
  }

  if (failures.length > 0) {
    throw new Error(`Production configuration refused: ${failures.join("; ")}.`);
  }
}

export function parseEnvironment(
  input: Record<string, string | undefined> = process.env,
): AppEnvironment {
  const environment = environmentSchema.parse(input);
  assertProductionConfiguration(environment);
  return environment;
}

export const env = parseEnvironment();

export function publicIndexingAllowed(): boolean {
  return env.APP_ENV === "production" && !env.NON_PRODUCTION_NOINDEX;
}
