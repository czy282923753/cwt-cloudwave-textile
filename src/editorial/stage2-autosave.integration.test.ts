import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  authors,
  auditLogs,
  contentLocalizations,
  contents,
  editorialRevisions,
  productLocalizations,
  productTaxonomyTerms,
  products,
  taxonomyTerms,
  users,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";
import {
  applyProductRevision,
  saveProductBlockDraft,
  submitProductBlockDraftForReview,
  updateProductFacts,
} from "@/catalog/product-service";
import {
  applyContentRevision,
  proposePublishedContentRevision,
  saveContentBlockDraft,
  submitContentBlockDraftForReview,
} from "@/content/content-service";
import { EditorialDraftConflictError } from "@/editorial/conflict";

function paragraph(text: string) {
  return {
    version: 1 as const,
    blocks: [{ id: "paragraph", type: "paragraph" as const, text }],
  };
}

describe("U-12/I-12 Stage 2 autosave conflict authority", () => {
  it("converges direct Product and Content Draft response-loss retries without duplicate Audit", async () => {
    const connection = await createTestDatabase();
    const usersRows = await connection.db.insert(users).values([
      { email: `direct-product-${crypto.randomUUID()}@example.test`, displayName: "TEST Direct Product", role: "product_editor", passwordHash: "test" },
      { email: `direct-content-${crypto.randomUUID()}@example.test`, displayName: "TEST Direct Content", role: "content_editor", passwordHash: "test" },
    ]).returning({ id: users.id, role: users.role });
    const productActor = { userId: usersRows.find((row) => row.role === "product_editor")!.id, role: "product_editor" as const };
    const contentActor = { userId: usersRows.find((row) => row.role === "content_editor")!.id, role: "content_editor" as const };
    const categoryRows = await connection.db.insert(taxonomyTerms).values({
      internalKey: `direct-category-${crypto.randomUUID()}`, dimension: "material_fiber",
    }).returning({ id: taxonomyTerms.id });
    const productId = await connection.db.transaction(async (transaction) => {
      const productRows = await transaction.insert(products).values({ status: "draft" }).returning({ id: products.id });
      await transaction.insert(productTaxonomyTerms).values({
        productId: productRows[0]!.id, taxonomyTermId: categoryRows[0]!.id, isPrimary: true,
      });
      return productRows[0]!.id;
    });
    await connection.db.insert(productLocalizations).values({
      productId, locale: "en", name: "TEST Direct Product", structuredBlocks: paragraph("Initial."), editorDocumentVersion: 1,
    });
    const authorRows = await connection.db.insert(authors).values({
      internalKey: `direct-author-${crypto.randomUUID()}`, displayName: "TEST Direct Author", isOrganization: true,
    }).returning({ id: authors.id });
    const contentRows = await connection.db.insert(contents).values({
      channel: "fabric_knowledge", type: "guide", status: "draft", authorId: authorRows[0]!.id,
    }).returning({ id: contents.id });
    const contentId = contentRows[0]!.id;
    await connection.db.insert(contentLocalizations).values({
      contentId, locale: "en", title: "TEST Direct Content", body: "", structuredBlocks: paragraph("Initial."), editorDocumentVersion: 1,
    });
    const productRequest = {
      name: "TEST Direct Product", shortDescription: null, document: paragraph("Saved once."), expectedEditorDocumentVersion: 1,
    };
    const contentRequest = {
      title: "TEST Direct Content", excerpt: null, document: paragraph("Saved once."), expectedEditorDocumentVersion: 1,
    };
    await expect(saveProductBlockDraft(connection.db, productActor, productId, productRequest))
      .resolves.toMatchObject({ editorDocumentVersion: 2, revisionId: null });
    await expect(saveProductBlockDraft(connection.db, productActor, productId, productRequest))
      .resolves.toMatchObject({ editorDocumentVersion: 2, revisionId: null });
    await expect(saveContentBlockDraft(connection.db, contentActor, contentId, contentRequest))
      .resolves.toMatchObject({ editorDocumentVersion: 2, revisionId: null });
    await expect(saveContentBlockDraft(connection.db, contentActor, contentId, contentRequest))
      .resolves.toMatchObject({ editorDocumentVersion: 2, revisionId: null });
    await expect(saveProductBlockDraft(connection.db, productActor, productId, {
      ...productRequest, document: paragraph("Stale different Product."),
    })).rejects.toBeInstanceOf(EditorialDraftConflictError);
    await expect(saveContentBlockDraft(connection.db, contentActor, contentId, {
      ...contentRequest, document: paragraph("Stale different Content."),
    })).rejects.toBeInstanceOf(EditorialDraftConflictError);
    const audits = await connection.db.select({ action: auditLogs.action }).from(auditLogs).where(and(
      inArray(auditLogs.entityId, [productId, contentId]),
      inArray(auditLogs.action, ["product.editorial.updated", "content.block_draft.saved"]),
    ));
    expect(audits).toHaveLength(2);
    await connection.close();
  });

  it("reuses one published Product Draft Revision, handles response-loss retry, and rejects stale tabs", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db.insert(users).values([
      { email: `stage2-product-${crypto.randomUUID()}@example.test`, displayName: "TEST Stage 2 Product Editor", role: "product_editor", passwordHash: "test" },
      { email: `stage2-reviewer-${crypto.randomUUID()}@example.test`, displayName: "TEST Stage 2 Reviewer", role: "reviewer_publisher", passwordHash: "test" },
    ]).returning({ id: users.id, role: users.role });
    const categoryRows = await connection.db.insert(taxonomyTerms).values({
      internalKey: `stage2-autosave-category-${crypto.randomUUID()}`,
      dimension: "material_fiber",
    }).returning({ id: taxonomyTerms.id });
    const productId = await connection.db.transaction(async (transaction) => {
      const productRows = await transaction.insert(products).values({
        status: "draft",
        createdByUserId: userRows.find((row) => row.role === "product_editor")!.id,
      }).returning({ id: products.id });
      await transaction.insert(productTaxonomyTerms).values({
        productId: productRows[0]!.id,
        taxonomyTermId: categoryRows[0]!.id,
        isPrimary: true,
      });
      return productRows[0]!.id;
    });
    await connection.db.insert(productLocalizations).values({
      productId,
      locale: "en",
      name: "TEST Stage 2 Published Product",
      structuredBlocks: paragraph("Approved copy."),
      blocksVersion: 1,
      editorDocumentVersion: 1,
    });
    await connection.db.update(products).set({ status: "published" }).where(eq(products.id, productId));
    const actor = { userId: userRows.find((row) => row.role === "product_editor")!.id, role: "product_editor" as const };
    const reviewer = { userId: userRows.find((row) => row.role === "reviewer_publisher")!.id, role: "reviewer_publisher" as const };
    const request = {
      name: "TEST Stage 2 Published Product",
      shortDescription: null,
      document: paragraph("Draft copy."),
      expectedEditorDocumentVersion: 1,
      revisionId: null,
      expectedRevisionVersion: 0,
    };
    const first = await saveProductBlockDraft(connection.db, actor, productId, request);
    expect(first).toMatchObject({ revisionVersion: 1, editorDocumentVersion: 1 });
    await expect(saveProductBlockDraft(connection.db, actor, productId, request))
      .resolves.toEqual(first);
    expect(await connection.db.select().from(editorialRevisions).where(and(
      eq(editorialRevisions.entityType, "product"),
      eq(editorialRevisions.entityId, productId),
      eq(editorialRevisions.status, "draft"),
    ))).toHaveLength(1);
    const second = await saveProductBlockDraft(connection.db, actor, productId, {
      ...request,
      document: paragraph("Newer tab copy."),
      revisionId: first.revisionId,
      expectedRevisionVersion: first.revisionVersion,
    });
    expect(second.revisionVersion).toBe(2);
    await expect(saveProductBlockDraft(connection.db, actor, productId, {
      ...request,
      document: paragraph("Stale tab copy."),
      revisionId: first.revisionId,
      expectedRevisionVersion: first.revisionVersion,
    })).rejects.toThrow(/changed in another editor/);
    await expect(updateProductFacts(connection.db, actor, productId, {
      composition: "100% TEST Synthetic Fiber",
    }, {
      expectedRevisionId: first.revisionId,
      expectedRevisionVersion: second.revisionVersion,
    })).resolves.toBe(first.revisionId);
    const auditsBeforeRetry = await connection.db.select({ id: auditLogs.id }).from(auditLogs)
      .where(eq(auditLogs.entityId, first.revisionId!));
    await expect(updateProductFacts(connection.db, actor, productId, {
      composition: "100% TEST Synthetic Fiber",
    }, {
      expectedRevisionId: first.revisionId,
      expectedRevisionVersion: second.revisionVersion,
    })).resolves.toBe(first.revisionId);
    expect(await connection.db.select({ id: auditLogs.id }).from(auditLogs)
      .where(eq(auditLogs.entityId, first.revisionId!))).toHaveLength(auditsBeforeRetry.length);
    await expect(updateProductFacts(connection.db, actor, productId, {
      composition: "90% TEST Synthetic Fiber / 10% TEST Elastane",
    }, {
      expectedRevisionId: first.revisionId,
      expectedRevisionVersion: second.revisionVersion,
    })).rejects.toBeInstanceOf(EditorialDraftConflictError);
    expect(await connection.db.select().from(editorialRevisions).where(and(
      eq(editorialRevisions.entityType, "product"),
      eq(editorialRevisions.entityId, productId),
      eq(editorialRevisions.status, "draft"),
    ))).toHaveLength(1);
    await submitProductBlockDraftForReview(connection.db, actor, productId, first.revisionId!);
    await applyProductRevision(connection.db, reviewer, first.revisionId!);
    const live = await connection.db.select({
      document: productLocalizations.structuredBlocks,
      version: productLocalizations.editorDocumentVersion,
      composition: products.composition,
    }).from(productLocalizations).innerJoin(products, eq(products.id, productLocalizations.productId)).where(eq(productLocalizations.productId, productId));
    expect(live[0]).toMatchObject({ document: paragraph("Newer tab copy."), version: 2, composition: "100% TEST Synthetic Fiber" });
    await connection.close();
  });

  it("merges published Content Blocks and metadata into one Draft and rolls back a required-Audit failure", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db.insert(users).values([
      { email: `stage2-content-${crypto.randomUUID()}@example.test`, displayName: "TEST Stage 2 Content Editor", role: "content_editor", passwordHash: "test" },
      { email: `stage2-content-reviewer-${crypto.randomUUID()}@example.test`, displayName: "TEST Stage 2 Content Reviewer", role: "reviewer_publisher", passwordHash: "test" },
    ]).returning({ id: users.id, role: users.role });
    const authorRows = await connection.db.insert(authors).values({
      internalKey: `stage2-author-${crypto.randomUUID()}`,
      displayName: "TEST Stage 2 Author",
      isOrganization: true,
    }).returning({ id: authors.id });
    const contentRows = await connection.db.insert(contents).values({
      channel: "fabric_knowledge",
      type: "guide",
      status: "published",
      authorId: authorRows[0]!.id,
      createdByUserId: userRows.find((row) => row.role === "content_editor")!.id,
    }).returning({ id: contents.id });
    const contentId = contentRows[0]!.id;
    await connection.db.insert(contentLocalizations).values({
      contentId,
      locale: "en",
      title: "TEST Stage 2 Published Content",
      body: "",
      structuredBlocks: paragraph("Approved article."),
      blocksVersion: 1,
      editorDocumentVersion: 1,
    });
    const actor = { userId: userRows.find((row) => row.role === "content_editor")!.id, role: "content_editor" as const };
    await expect(saveContentBlockDraft(connection.db, actor, contentId, {
      title: "TEST Stage 2 Published Content",
      excerpt: null,
      document: paragraph("Audit must fail."),
      expectedEditorDocumentVersion: 1,
      revisionId: null,
      expectedRevisionVersion: 0,
    }, {
      auditWriter: async () => {
        throw new Error("TEST required Audit failure");
      },
    })).rejects.toThrow(/required Audit failure/);
    expect(await connection.db.select().from(editorialRevisions).where(and(
      eq(editorialRevisions.entityType, "content"),
      eq(editorialRevisions.entityId, contentId),
      eq(editorialRevisions.status, "draft"),
    ))).toHaveLength(0);
    const saved = await saveContentBlockDraft(connection.db, actor, contentId, {
      title: "TEST Stage 2 Published Content",
      excerpt: null,
      document: paragraph("Draft article."),
      expectedEditorDocumentVersion: 1,
      revisionId: null,
      expectedRevisionVersion: 0,
    });
    await expect(saveContentBlockDraft(connection.db, actor, contentId, {
      title: "TEST Stage 2 Published Content",
      excerpt: null,
      document: paragraph("Draft article."),
      expectedEditorDocumentVersion: 1,
      revisionId: null,
      expectedRevisionVersion: 0,
    })).resolves.toEqual(saved);
    const mergedRevisionId = await proposePublishedContentRevision(connection.db, actor, contentId, {
      title: "TEST Stage 2 Content Metadata Updated",
      excerpt: "TEST pending metadata",
      document: paragraph("Draft article."),
      expectedEditorDocumentVersion: 1,
      authorId: authorRows[0]!.id,
      type: "guide",
      changeSummary: "TEST merged metadata",
      expectedRevisionId: saved.revisionId,
      expectedRevisionVersion: saved.revisionVersion,
    });
    expect(mergedRevisionId).toBe(saved.revisionId);
    const auditsBeforeRetry = await connection.db.select({ id: auditLogs.id }).from(auditLogs)
      .where(eq(auditLogs.entityId, saved.revisionId!));
    await expect(proposePublishedContentRevision(connection.db, actor, contentId, {
      title: "TEST Stage 2 Content Metadata Updated",
      excerpt: "TEST pending metadata",
      document: paragraph("Draft article."),
      expectedEditorDocumentVersion: 1,
      authorId: authorRows[0]!.id,
      type: "guide",
      changeSummary: "TEST merged metadata",
      expectedRevisionId: saved.revisionId,
      expectedRevisionVersion: saved.revisionVersion,
    })).resolves.toBe(saved.revisionId);
    expect(await connection.db.select({ id: auditLogs.id }).from(auditLogs)
      .where(eq(auditLogs.entityId, saved.revisionId!))).toHaveLength(auditsBeforeRetry.length);
    await expect(proposePublishedContentRevision(connection.db, actor, contentId, {
      title: "TEST stale competing metadata",
      excerpt: "TEST pending metadata",
      document: paragraph("Draft article."),
      expectedEditorDocumentVersion: 1,
      authorId: authorRows[0]!.id,
      type: "guide",
      changeSummary: "TEST stale metadata",
      expectedRevisionId: saved.revisionId,
      expectedRevisionVersion: saved.revisionVersion,
    })).rejects.toBeInstanceOf(EditorialDraftConflictError);
    await submitContentBlockDraftForReview(connection.db, actor, contentId, saved.revisionId!);
    await applyContentRevision(
      connection.db,
      { userId: userRows.find((row) => row.role === "reviewer_publisher")!.id, role: "reviewer_publisher" },
      saved.revisionId!,
    );
    const live = await connection.db.select({
      document: contentLocalizations.structuredBlocks,
      version: contentLocalizations.editorDocumentVersion,
      title: contentLocalizations.title,
    }).from(contentLocalizations).where(eq(contentLocalizations.contentId, contentId));
    expect(live[0]).toMatchObject({ document: paragraph("Draft article."), version: 2, title: "TEST Stage 2 Content Metadata Updated" });
    await connection.close();
  });
});
