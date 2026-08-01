import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCurrentUser } from "@/auth/current-user";
import { adminActionHttpFailure } from "@/admin/action-result";
import { assertSameOrigin } from "@/auth/request-security";
import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import { assertRequestLength } from "@/uploads/request-guard";
import { createAdminUploadBatch } from "@/uploads/admin-upload-service";

const inputSchema = z.object({
  files: z.array(z.object({
    fileName: z.string().min(1).max(200),
    declaredMimeType: z.string().min(1).max(100),
    declaredByteSize: z.number().int().positive(),
  }).strict()).min(1),
  category: z.enum(["product", "fabric", "market", "company", "factory", "application", "certificate", "content", "other"]),
  role: z.enum(["hero", "gallery", "cover", "detail", "thumbnail", "inline", "document", "download"]),
  sortOrder: z.number().int().min(0),
  associationType: z.enum(["product", "fabric", "content"]).nullable(),
  associationEntityId: z.uuid().nullable(),
  sourceDeclarationEnabled: z.boolean(),
  sourceDeclaration: z.object({
    sourceType: z.string().nullable().optional(),
    sourceProvider: z.string().nullable().optional(),
    rightsStatus: z.string().nullable().optional(),
    subjectRelationship: z.enum(["cwt", "partner_factory", "supplier", "customer", "third_party", "unknown"]).nullable().optional(),
    publicUsePermission: z.enum(["unknown", "allowed", "not_allowed", "restricted"]).nullable().optional(),
    editingPermission: z.enum(["unknown", "allowed", "not_allowed", "restricted"]).nullable().optional(),
    usageRestrictions: z.string().nullable().optional(),
    permissionEvidence: z.string().nullable().optional(),
    declarationExpiryDate: z.string().nullable().optional(),
    isCwtOwnedFacility: z.boolean().nullable().optional(),
  }).strict().nullable(),
}).strict();

export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    assertRequestLength(request, env.MAX_UPLOAD_INTENT_JSON_BYTES);
    const user = await requireCurrentUser("assets.write");
    const input = inputSchema.parse(await request.json());
    const result = databaseConnection.kind === "pglite"
      ? await createAdminUploadBatch(databaseConnection.db, { userId: user.id, role: user.role, authSessionId: user.sessionId }, input)
      : await createAdminUploadBatch(databaseConnection.db, { userId: user.id, role: user.role, authSessionId: user.sessionId }, input);
    return NextResponse.json({ ok: true, ...result, expiresAt: result.expiresAt.toISOString() }, { status: 201 });
  } catch (error) {
    const failure = adminActionHttpFailure(error);
    return NextResponse.json({ ok: false, error: failure.error, errorCode: failure.errorCode }, { status: failure.status });
  }
}
