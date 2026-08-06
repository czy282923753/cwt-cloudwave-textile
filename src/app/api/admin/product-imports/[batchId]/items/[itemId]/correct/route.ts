import { NextResponse } from "next/server";
import { z } from "zod";

import { adminActionHttpFailure } from "@/admin/action-result";
import { requireCurrentUser } from "@/auth/current-user";
import { assertSameOrigin } from "@/auth/request-security";
import { databaseConnection } from "@/db/client";
import { correctProductImportRow } from "@/imports/service";
import type { ProductImportRowInput } from "@/imports/contract";
import { assertRequestLength } from "@/uploads/request-guard";

const text = z.string().trim().min(1).max(20_000).optional();
const schema = z.object({
  name: text,
  productCode: text,
  primaryCategory: text,
  additionalCategories: z.array(z.string().trim().min(1).max(200)).max(24).optional(),
  applications: z.array(z.string().trim().min(1).max(200)).max(24).optional(),
  tags: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  composition: text,
  gsm: text,
  width: text,
  moqValue: text,
  moqUnit: z.enum(["m", "kg", "roll", "yd"]).optional(),
  moqNote: text,
  slug: text,
  summary: text,
  description: text,
  imageFiles: z.array(z.string().trim().min(1).max(240)).max(500).optional(),
  primaryImageAlt: text,
  primaryImageCaption: text,
}).strict();

export async function POST(request: Request, context: { params: Promise<{ batchId: string; itemId: string }> }): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    assertRequestLength(request, 64 * 1024);
    const user = await requireCurrentUser("products.import");
    const { batchId, itemId } = await context.params;
    const input = schema.parse(await request.json());
    const command = Object.fromEntries(Object.entries(input).filter((entry) => entry[1] !== undefined)) as ProductImportRowInput;
    const actor = { userId: user.id, role: user.role, authSessionId: user.sessionId } as const;
    if (databaseConnection.kind === "pglite") await correctProductImportRow(databaseConnection.db, actor, batchId, itemId, command);
    else await correctProductImportRow(databaseConnection.db, actor, batchId, itemId, command);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const failure = adminActionHttpFailure(error);
    return NextResponse.json({ ok: false, error: failure.error, errorCode: failure.errorCode }, { status: failure.status });
  }
}
