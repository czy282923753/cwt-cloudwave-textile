import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { authors, contentLocalizations, contents, users } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import {
  applyContentRevision,
  createContentDraft,
  proposePublishedContentRevision,
  publishContent,
  submitContentForReview,
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
      .select({ body: contentLocalizations.body })
      .from(contentLocalizations)
      .where(
        and(
          eq(contentLocalizations.contentId, contentId),
          eq(contentLocalizations.locale, "en"),
        ),
      );
    expect(before[0]?.body).toBe("Approved fixture body.");
    await applyContentRevision(
      connection.db,
      { userId: reviewerId, role: "reviewer_publisher" },
      revisionId,
    );
    const after = await connection.db
      .select({ body: contentLocalizations.body })
      .from(contentLocalizations)
      .innerJoin(contents, eq(contents.id, contentLocalizations.contentId))
      .where(eq(contentLocalizations.contentId, contentId));
    expect(after[0]?.body).toBe("Unapproved replacement body.");
    await connection.close();
  });
});
