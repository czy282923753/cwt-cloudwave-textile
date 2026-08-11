import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPhaseBAvailabilityServiceV1 } from "@/ai/applications/draft-assistance/composition";
import { editorialRevisions } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

describe("reviewer H-02 record-scope-first authorization", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  const productRevisionId = "10000000-0000-4000-8000-000000000001";
  const malformedRevisionId = "10000000-0000-4000-8000-000000000002";
  const missingRevisionId = "10000000-0000-4000-8000-000000000003";

  beforeAll(async () => {
    database = await createTestDatabase();
    await database.db.insert(editorialRevisions).values([
      {
        id: productRevisionId,
        entityType: "product",
        entityId: "20000000-0000-4000-8000-000000000001",
        locale: "en",
        versionNumber: 7,
        status: "draft",
        snapshot: { reviewer: "synthetic" },
      },
      {
        id: malformedRevisionId,
        entityType: "Product",
        entityId: "20000000-0000-4000-8000-000000000002",
        locale: "zh",
        versionNumber: 88,
        status: "applied",
        snapshot: { reviewer: "synthetic" },
      },
    ]);
  });

  afterAll(async () => database.close());

  it("does not distinguish malformed, wrong-role, or missing records before actor scope", async () => {
    const service = createPhaseBAvailabilityServiceV1({
      database: database.db,
      trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
    });
    const inspect = (role: "admin" | "product_editor" | "content_editor", revisionId: string,
      expectedVersion: number) => service.inspectDraftAssistanceAvailability({
      useCase: "product_description_draft",
      actor: { userId: "30000000-0000-4000-8000-000000000001", role },
      target: { type: "editorial_revision", revisionId, expectedVersion },
      contextSelections: [],
    });
    const denied = {
      ok: true,
      value: { available: false, manualEditorAvailable: false, code: "authorization_denied" },
    };

    expect(await inspect("content_editor", productRevisionId, 99)).toEqual(denied);
    expect(await inspect("content_editor", malformedRevisionId, 88)).toEqual(denied);
    expect(await inspect("content_editor", missingRevisionId, 88)).toEqual(denied);
    expect(await inspect("product_editor", malformedRevisionId, 88)).toEqual(denied);
    expect(await inspect("product_editor", missingRevisionId, 88)).toEqual(denied);
    expect(await inspect("product_editor", productRevisionId, 99)).toEqual({
      ok: true,
      value: { available: false, manualEditorAvailable: false, code: "target_version_conflict" },
    });
    expect(await inspect("admin", malformedRevisionId, 88)).toEqual({
      ok: true,
      value: { available: false, manualEditorAvailable: false, code: "target_scope_mismatch" },
    });
  });
});
