import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { authors, contentLocalizations, contents, users } from "@/db/schema";
import { createTestDatabase } from "@/test/database";
import { blockDocumentPlainText, parseBlockDocument } from "@/editorial/blocks";

import {
  applyContentRevision,
  createContentDraft,
  proposePublishedContentRevision,
  publishContent,
  submitContentForReview,
  updateContent,
} from "./content-service";

describe("published content revisions", () => {
  it("keeps approved live copy unchanged until a reviewer applies a revision", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db
      .insert(users)
      .values([
        {
          email: "content@example.test",
          displayName: "Content Editor",
          role: "content_editor",
          passwordHash: "test",
        },
        {
          email: "content-review@example.test",
          displayName: "Content Reviewer",
          role: "reviewer_publisher",
          passwordHash: "test",
        },
      ])
      .returning({ id: users.id, role: users.role });
    const editorId = userRows.find((user) => user.role === "content_editor")?.id;
    const reviewerId = userRows.find(
      (user) => user.role === "reviewer_publisher",
    )?.id;
    if (!editorId || !reviewerId) throw new Error("Missing actors.");
    const authorRows = await connection.db
      .insert(authors)
      .values({
        internalKey: "test-cwt-team",
        displayName: "TEST CWT Team",
        isOrganization: true,
      })
      .returning({ id: authors.id });
    const authorId = authorRows[0]?.id;
    if (!authorId) throw new Error("Missing author.");
    const contentId = await createContentDraft(
      connection.db,
      { userId: editorId, role: "content_editor" },
      {
        channel: "fabric_knowledge",
        type: "guide",
        authorId,
        title: "TEST Fabric Guide",
        body: "Approved fixture body.",
      },
    );
    await submitContentForReview(
      connection.db,
      { userId: editorId, role: "content_editor" },
      contentId,
    );
    await publishContent(
      connection.db,
      { userId: reviewerId, role: "reviewer_publisher" },
      contentId,
    );
    const revisionId = await proposePublishedContentRevision(
      connection.db,
      { userId: editorId, role: "content_editor" },
      contentId,
      {
        title: "TEST Fabric Guide Updated",
        body: "Unapproved replacement body.",
        changeSummary: "Fixture update",
      },
    );
    const before = await connection.db
      .select({
        body: contentLocalizations.body,
        structuredBlocks: contentLocalizations.structuredBlocks,
      })
      .from(contentLocalizations)
      .where(
        and(
          eq(contentLocalizations.contentId, contentId),
          eq(contentLocalizations.locale, "en"),
        ),
      );
    expect(before[0]?.body).toBe("");
    expect(
      blockDocumentPlainText(parseBlockDocument(before[0]?.structuredBlocks, "content")),
    ).toBe("Approved fixture body.");
    await applyContentRevision(
      connection.db,
      { userId: reviewerId, role: "reviewer_publisher" },
      revisionId,
    );
    const after = await connection.db
      .select({
        body: contentLocalizations.body,
        structuredBlocks: contentLocalizations.structuredBlocks,
      })
      .from(contentLocalizations)
      .innerJoin(contents, eq(contents.id, contentLocalizations.contentId))
      .where(eq(contentLocalizations.contentId, contentId));
    expect(after[0]?.body).toBe("");
    expect(
      blockDocumentPlainText(parseBlockDocument(after[0]?.structuredBlocks, "content")),
    ).toBe("Unapproved replacement body.");
    await connection.close();
  });

  it("rejects missing related records and media placements before saving Blocks", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db.insert(users).values({
      email: "content-relations@example.test",
      displayName: "Content Relations",
      role: "content_editor",
      passwordHash: "test",
    }).returning({ id: users.id });
    const authorRows = await connection.db.insert(authors).values({
      internalKey: "content-relations-author",
      displayName: "TEST Relations Author",
      isOrganization: true,
    }).returning({ id: authors.id });
    const actor = { userId: userRows[0]!.id, role: "content_editor" as const };
    const authorId = authorRows[0]!.id;
    const contentId = await createContentDraft(connection.db, actor, {
      channel: "fabric_knowledge",
      type: "guide",
      authorId,
      title: "TEST Block Relations",
      body: "Initial synthetic copy.",
    });
    const baseInput = {
      title: "TEST Block Relations",
      body: "",
      authorId,
      type: "guide" as const,
      expectedEditorDocumentVersion: 1,
    };
    await expect(updateContent(connection.db, actor, contentId, {
      ...baseInput,
      structuredDocument: {
        version: 1,
        blocks: [{
          id: "missing-related-product",
          type: "related_products",
          productIds: ["10000000-0000-4000-8000-000000000099"],
        }],
      },
    })).rejects.toThrow(/must reference existing records/);
    await expect(updateContent(connection.db, actor, contentId, {
      ...baseInput,
      structuredDocument: {
        version: 1,
        blocks: [{
          id: "missing-media",
          type: "image",
          mediaKey: "hero-image",
        }],
      },
    })).rejects.toThrow(/require Content media placements/);
    await connection.close();
  });
});
