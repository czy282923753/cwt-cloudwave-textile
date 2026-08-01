import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { recordConversionEvent } from "@/analytics/conversion-service";
import { assertSameOrigin } from "@/auth/request-security";
import { env } from "@/config/env";
import { createInquiry } from "@/crm/inquiry-service";
import { databaseConnection } from "@/db/client";
import { createEmailNotifier } from "@/integrations/email";
import { normalizePath } from "@/seo/path";
import { createObjectStorage } from "@/storage";
import { createUploadRateLimiter } from "@/uploads/rate-limit";
import { createFileScanner } from "@/uploads/scanner";
import { uploadAsset } from "@/uploads/service";

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
  try {
    assertSameOrigin(request);
    const form = await request.formData();
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

    const storage = createObjectStorage();
    const scanner = createFileScanner();
    const assetIds: string[] = [];
    const sessionId = z.uuid().catch(randomUUID()).parse(stringValue(form, "sessionId"));
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
        eventName: "image_upload_completed" as const,
        anonymousSessionId: sessionId,
        routePath: normalizePath(
          stringValue(form, "sourcePagePath") ?? "/get-quote",
        ),
        safeProperties: { file_count: assetIds.length },
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
    const attributionConfidence = utmSource
      ? "high"
      : referrer
        ? "medium"
        : landingPagePath
          ? "low"
          : "unavailable";
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
      lastNonDirectSource: utmSource ?? referrer,
      lastNonDirectMedium: utmMedium ?? (referrer ? "referral" : null),
      lastNonDirectCampaign: utmCampaign,
      attributionConfidence,
      sessionId,
      requestId,
    });
    if (databaseConnection.kind === "pglite") {
      await recordConversionEvent(databaseConnection.db, {
        eventName: "inquiry_created",
        anonymousSessionId: sessionId,
        routePath: sourcePagePath,
        inquiryId,
        landingPagePath: landingPagePath ? normalizePath(landingPagePath) : null,
        utmSource,
        utmMedium,
        utmCampaign,
      });
    } else {
      await recordConversionEvent(databaseConnection.db, {
        eventName: "inquiry_created",
        anonymousSessionId: sessionId,
        routePath: sourcePagePath,
        inquiryId,
        landingPagePath: landingPagePath ? normalizePath(landingPagePath) : null,
        utmSource,
        utmMedium,
        utmCampaign,
      });
    }
    return NextResponse.json({ ok: true, reference: inquiryId }, { status: 201 });
  } catch (error) {
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
