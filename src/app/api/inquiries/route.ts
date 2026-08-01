import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { recordConversionEvent } from "@/analytics/conversion-service";
import { assertSameOrigin } from "@/auth/request-security";
import { env } from "@/config/env";
import { createInquiry, findInquiryByIdempotencyKey } from "@/crm/inquiry-service";
import { databaseConnection } from "@/db/client";
import { createEmailNotifier } from "@/integrations/email";
import { normalizePath } from "@/seo/path";
import { createObjectStorage } from "@/storage";
import { createUploadRateLimiter } from "@/uploads/rate-limit";
import { createFileScanner } from "@/uploads/scanner";
import { cleanupUnlinkedInquiryAssets, uploadAsset } from "@/uploads/service";

const limiter = createUploadRateLimiter();

function stringValue(form: FormData, key: string, maximum = 500): string | null {
  const value = form.get(key);
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maximum)
    : null;
}

function safeReferrer(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return null;
  }
}

async function createWithCurrentDatabase(
  input: Parameters<typeof createInquiry>[2],
): Promise<string> {
  const notifier = createEmailNotifier();
  if (databaseConnection.kind === "pglite") {
    return createInquiry(databaseConnection.db, notifier, input);
  }
  return createInquiry(databaseConnection.db, notifier, input);
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = randomUUID();
  const createdAssetIds: string[] = [];
  const storage = createObjectStorage();
  try {
    assertSameOrigin(request);
    const form = await request.formData();
    const idempotencyKey = z
      .string()
      .min(16)
      .max(200)
      .parse(request.headers.get("idempotency-key") ?? stringValue(form, "idempotencyKey", 200));
    const existingInquiryId = databaseConnection.kind === "pglite"
      ? await findInquiryByIdempotencyKey(databaseConnection.db, idempotencyKey)
      : await findInquiryByIdempotencyKey(databaseConnection.db, idempotencyKey);
    if (existingInquiryId) {
      return NextResponse.json({ ok: true, reference: existingInquiryId }, { status: 200 });
    }
    if (stringValue(form, "website")) {
      return NextResponse.json({ ok: true, reference: requestId }, { status: 202 });
    }
    const name = z.string().min(1).max(120).parse(stringValue(form, "name", 120));
    const email = z.email().max(254).parse(stringValue(form, "email", 254));
    const description = stringValue(form, "description", 5_000);
    const files = form
      .getAll("images")
      .filter((value): value is File => value instanceof File && value.size > 0);
    if (!description && files.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Provide a description or upload an image." },
        { status: 400 },
      );
    }
    if (files.length > env.MAX_FILES_PER_UPLOAD) {
      return NextResponse.json({ ok: false, error: "Too many files." }, { status: 400 });
    }
    const clientKey = createHash("sha256")
      .update(
        `${request.headers.get("x-forwarded-for") ?? "local"}:${
          request.headers.get("user-agent") ?? "unknown"
        }`,
      )
      .digest("hex");
    if (!(await limiter.consume(clientKey))) {
      return NextResponse.json({ ok: false, error: "Try again later." }, { status: 429 });
    }

    const scanner = createFileScanner();
    const assetIds = createdAssetIds;
    const sessionId = z.uuid().catch(randomUUID()).parse(stringValue(form, "sessionId"));
    const analyticsConsentState = z
      .enum(["unknown", "granted", "denied"])
      .catch("unknown")
      .parse(stringValue(form, "analyticsConsentState", 20));
    const retentionExpiresAt = env.INQUIRY_FILE_RETENTION_DAYS
      ? new Date(Date.now() + env.INQUIRY_FILE_RETENTION_DAYS * 86_400_000)
      : null;
    for (const file of files) {
      const assetId =
        databaseConnection.kind === "pglite"
          ? await uploadAsset(databaseConnection.db, storage, scanner, {
              fileName: file.name,
              declaredMimeType: file.type,
              bytes: new Uint8Array(await file.arrayBuffer()),
              category: "inquiry",
              purpose: "inquiry",
              retentionExpiresAt,
            })
          : await uploadAsset(databaseConnection.db, storage, scanner, {
              fileName: file.name,
              declaredMimeType: file.type,
              bytes: new Uint8Array(await file.arrayBuffer()),
              category: "inquiry",
              purpose: "inquiry",
              retentionExpiresAt,
            });
      assetIds.push(assetId);
    }
    if (assetIds.length > 0) {
      const uploadEvent = {
        eventId: `image_upload:${createHash("sha256").update(idempotencyKey).digest("hex")}`,
        eventName: "image_upload_completed" as const,
        anonymousSessionId: sessionId,
        routePath: normalizePath(
          stringValue(form, "sourcePagePath") ?? "/get-quote",
        ),
        safeProperties: { file_count: assetIds.length },
        consentState: analyticsConsentState,
      };
      if (databaseConnection.kind === "pglite") {
        await recordConversionEvent(databaseConnection.db, uploadEvent);
      } else {
        await recordConversionEvent(databaseConnection.db, uploadEvent);
      }
    }
    const sourcePagePath = normalizePath(stringValue(form, "sourcePagePath") ?? "/get-quote");
    const landingPagePath = stringValue(form, "landingPagePath");
    const referrer = safeReferrer(stringValue(form, "referrer", 500));
    const utmSource = stringValue(form, "utmSource", 100);
    const utmMedium = stringValue(form, "utmMedium", 100);
    const utmCampaign = stringValue(form, "utmCampaign", 100);
    const attributionConfidence = z
      .enum(["high", "medium", "low", "unavailable"])
      .catch("unavailable")
      .parse(stringValue(form, "attributionConfidence", 20));
    const inquiryId = await createWithCurrentDatabase({
      name,
      email,
      countryCode: stringValue(form, "countryCode", 2),
      whatsapp: stringValue(form, "whatsapp", 80),
      description,
      assetIds,
      sourcePagePath,
      landingPagePath: landingPagePath ? normalizePath(landingPagePath) : null,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      lastNonDirectSource: stringValue(form, "lastNonDirectSource", 200),
      lastNonDirectMedium: stringValue(form, "lastNonDirectMedium", 100),
      lastNonDirectCampaign: stringValue(form, "lastNonDirectCampaign", 100),
      attributionConfidence,
      analyticsConsentState,
      sessionId,
      requestId,
      idempotencyKey,
    });
    if (createdAssetIds.length > 0) {
      if (databaseConnection.kind === "pglite") {
        await cleanupUnlinkedInquiryAssets(
          databaseConnection.db,
          storage,
          createdAssetIds,
          requestId,
        );
      } else {
        await cleanupUnlinkedInquiryAssets(
          databaseConnection.db,
          storage,
          createdAssetIds,
          requestId,
        );
      }
    }
    if (databaseConnection.kind === "pglite") {
      await recordConversionEvent(databaseConnection.db, {
        eventId: `inquiry_created:${inquiryId}`,
        eventName: "inquiry_created",
        anonymousSessionId: sessionId,
        routePath: sourcePagePath,
        inquiryId,
        consentState: analyticsConsentState,
        landingPagePath: landingPagePath ? normalizePath(landingPagePath) : null,
        utmSource,
        utmMedium,
        utmCampaign,
        lastNonDirectSource: stringValue(form, "lastNonDirectSource", 200),
        lastNonDirectMedium: stringValue(form, "lastNonDirectMedium", 100),
        lastNonDirectCampaign: stringValue(form, "lastNonDirectCampaign", 100),
        attributionConfidence,
        submitSourcePagePath: sourcePagePath,
      });
    } else {
      await recordConversionEvent(databaseConnection.db, {
        eventId: `inquiry_created:${inquiryId}`,
        eventName: "inquiry_created",
        anonymousSessionId: sessionId,
        routePath: sourcePagePath,
        inquiryId,
        consentState: analyticsConsentState,
        landingPagePath: landingPagePath ? normalizePath(landingPagePath) : null,
        utmSource,
        utmMedium,
        utmCampaign,
        lastNonDirectSource: stringValue(form, "lastNonDirectSource", 200),
        lastNonDirectMedium: stringValue(form, "lastNonDirectMedium", 100),
        lastNonDirectCampaign: stringValue(form, "lastNonDirectCampaign", 100),
        attributionConfidence,
        submitSourcePagePath: sourcePagePath,
      });
    }
    return NextResponse.json({ ok: true, reference: inquiryId }, { status: 201 });
  } catch (error) {
    try {
      if (databaseConnection.kind === "pglite") {
        await cleanupUnlinkedInquiryAssets(
          databaseConnection.db,
          storage,
          createdAssetIds,
          requestId,
        );
      } else {
        await cleanupUnlinkedInquiryAssets(
          databaseConnection.db,
          storage,
          createdAssetIds,
          requestId,
        );
      }
    } catch {
      process.stderr.write(
        `[inquiry-cleanup-error] request ${requestId}; details omitted.\n`,
      );
    }
    const rawMessage = error instanceof Error ? error.message : "";
    const safePatterns = [
      /Name and Email are required/,
      /Provide a description or upload/,
      /File exceeds the configured size limit/,
      /File type is not permitted/,
      /Declared MIME type does not match/,
      /Image decoding validation failed/,
      /File was rejected by malware scanning/,
    ];
    const message = safePatterns.some((pattern) => pattern.test(rawMessage))
      ? rawMessage
      : "Inquiry could not be submitted. Please try again or use another file.";
    process.stderr.write(
      `[inquiry-error] request ${requestId}; category ${
        error instanceof Error ? error.name : "unknown"
      }; details omitted to protect customer data.\n`,
    );
    return NextResponse.json({ ok: false, error: message, reference: requestId }, { status: 400 });
  }
}
