import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  authors,
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
import { saveProductBlockDraft } from "@/catalog/product-service";
import { saveContentBlockDraft } from "@/content/content-service";

function paragraph(text: string) {
  return {
    version: 1 as const,
    blocks: [{ id: "paragraph", type: "paragraph" as const, text }],
  };
}

describe("U-12/I-12 Stage 2 autosave conflict authority", () => {
  it("reuses one published Product Draft Revision, handles response-loss retry, and rejects stale tabs", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db.insert(users).values({
      email: `stage2-product-${crypto.randomUUID()}@example.test`,
      displayName: "TEST Stage 2 Product Editor",
      role: "product_editor",
      passwordHash: "test",
    }).returning({ id: users.id });
    const categoryRows = await connection.db.insert(taxonomyTerms).values({
      internalKey: `stage2-autosave-category-${crypto.randomUUID()}`,
      dimension: "material_fiber",
    }).returning({ id: taxonomyTerms.id });
    const productId = await connection.db.transaction(async (transaction) => {
      const productRows = await transaction.insert(products).values({
        status: "draft",
        createdByUserId: userRows[0]!.id,
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
    const actor = { userId: userRows[0]!.id, role: "product_editor" as const };
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
    const live = await connection.db.select({
      document: productLocalizations.structuredBlocks,
      version: productLocalizations.editorDocumentVersion,
    }).from(productLocalizations).where(eq(productLocalizations.productId, productId));
    expect(live[0]).toMatchObject({ document: paragraph("Approved copy."), version: 1 });
    await connection.close();
  });

  it("keeps published Content live state unchanged and rolls back a required-Audit failure", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db.insert(users).values({
      email: `stage2-content-${crypto.randomUUID()}@example.test`,
      displayName: "TEST Stage 2 Content Editor",
      role: "content_editor",
      passwordHash: "test",
    }).returning({ id: users.id });
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
      createdByUserId: userRows[0]!.id,
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
    const actor = { userId: userRows[0]!.id, role: "content_editor" as const };
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
    const live = await connection.db.select({
      document: contentLocalizations.structuredBlocks,
      version: contentLocalizations.editorDocumentVersion,
    }).from(contentLocalizations).where(eq(contentLocalizations.contentId, contentId));
    expect(live[0]).toMatchObject({ document: paragraph("Approved article."), version: 1 });
    await connection.close();
  });
});
