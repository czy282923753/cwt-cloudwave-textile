import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPhaseBAvailabilityServiceV1 } from "@/ai/applications/draft-assistance/composition";
import { editorialRevisions } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

describe("reviewer Fresh H-02 authoritative Revision matrix", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  const productRevisionId = "71000000-0000-4000-8000-000000000001";
  const contentRevisionId = "71000000-0000-4000-8000-000000000002";
  const malformedRevisionId = "71000000-0000-4000-8000-000000000003";
  const missingRevisionId = "71000000-0000-4000-8000-000000000004";

  beforeAll(async () => {
    database = await createTestDatabase();
    await database.db.insert(editorialRevisions).values([
      { id: productRevisionId, entityType: "product", entityId: "72000000-0000-4000-8000-000000000001", locale: "en", versionNumber: 7, status: "draft", snapshot: { reviewer: true } },
      { id: contentRevisionId, entityType: "content", entityId: "72000000-0000-4000-8000-000000000002", locale: "en", versionNumber: 8, status: "draft", snapshot: { reviewer: true } },
      { id: malformedRevisionId, entityType: "unexpected_entity_type", entityId: "72000000-0000-4000-8000-000000000003", locale: "zh", versionNumber: 99, status: "applied", snapshot: { reviewer: true } },
    ]);
  });

  afterAll(async () => database.close());

  it("uses one read and hides missing, malformed, type and version state from wrong editors", async () => {
    const denied = { ok: true, value: { available: false, manualEditorAvailable: false, code: "authorization_denied" } };
    const inspect = async (role: "admin" | "product_editor" | "content_editor", useCase: "product_description_draft" | "fabric_knowledge_draft", revisionId: string, expectedVersion: number) => {
      const originalTransaction = database.db.transaction.bind(database.db);
      let selectCount = -1;
      const transactionSpy = vi.spyOn(database.db, "transaction").mockImplementation(async (callback, config) =>
        originalTransaction(async (transaction) => {
          const selectSpy = vi.spyOn(transaction, "select");
          try {
            return await callback(transaction);
          } finally {
            selectCount = selectSpy.mock.calls.length;
            selectSpy.mockRestore();
          }
        }, config));
      try {
        const service = createPhaseBAvailabilityServiceV1({ database: database.db, trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true } });
        const result = await service.inspectDraftAssistanceAvailability({
          useCase,
          actor: { userId: "73000000-0000-4000-8000-000000000001", role },
          target: { type: "editorial_revision", revisionId, expectedVersion },
          contextSelections: [],
        });
        expect(transactionSpy).toHaveBeenCalledTimes(1);
        expect(selectCount).toBe(1);
        return result;
      } finally {
        transactionSpy.mockRestore();
      }
    };

    for (const [role, useCase, revisionId] of [
      ["content_editor", "product_description_draft", productRevisionId],
      ["content_editor", "product_description_draft", malformedRevisionId],
      ["content_editor", "product_description_draft", missingRevisionId],
      ["product_editor", "fabric_knowledge_draft", contentRevisionId],
      ["product_editor", "fabric_knowledge_draft", malformedRevisionId],
      ["product_editor", "fabric_knowledge_draft", missingRevisionId],
    ] as const) {
      expect(await inspect(role, useCase, revisionId, 444)).toEqual(denied);
    }

    expect(await inspect("product_editor", "product_description_draft", productRevisionId, 444)).toEqual({ ok: true, value: { available: false, manualEditorAvailable: false, code: "target_version_conflict" } });
    expect(await inspect("admin", "product_description_draft", malformedRevisionId, 99)).toEqual({ ok: true, value: { available: false, manualEditorAvailable: false, code: "target_scope_mismatch" } });
  });
});
