import { readFile, readdir } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  applicationLocalizations,
  applications,
  assets,
  authors,
  contentLocalizations,
  contents,
  fabricLibraryEntries,
  productApplications,
  productTaxonomyTerms,
  products,
  redirects,
  routes,
  seoMetadata,
  taxonomyTermLocalizations,
  taxonomyTerms,
  users,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";
import {
  publishApplication,
  submitApplicationForReview,
} from "@/catalog/application-service";
import {
  createFabricLibraryEntry,
  submitFabricLibraryEntryForReview,
} from "@/catalog/fabric-library-service";
import {
  archiveProduct,
  changeProductSlug,
  createProductDraft,
  submitProductForReview,
  updateProductStructure,
} from "@/catalog/product-service";
import { createApplicationDraft } from "@/catalog/taxonomy-service";
import {
  createContentDraft,
  submitContentForReview,
} from "@/content/content-service";
import { updateSeoMetadata } from "@/seo/metadata-service";

const failingAudit = async (): Promise<string> => {
  throw new Error("TEST governed Audit failure");
};

describe("governed mutation Audit atomicity", () => {
  it("rolls Product, Application, Fabric, Content, relations, SEO, archive, and nested route writes back", async () => {
    const connection = await createTestDatabase();
    try {
      const actorRows = await connection.db.insert(users).values([
        { email: "governed-admin@example.test", displayName: "Governed Admin", role: "admin", passwordHash: "test" },
        { email: "governed-editor@example.test", displayName: "Governed Editor", role: "product_editor", passwordHash: "test" },
        { email: "governed-content@example.test", displayName: "Governed Content", role: "content_editor", passwordHash: "test" },
      ]).returning({ id: users.id, role: users.role });
      const admin = actorRows.find((row) => row.role === "admin")!;
      const editor = actorRows.find((row) => row.role === "product_editor")!;
      const contentEditor = actorRows.find((row) => row.role === "content_editor")!;
      const [taxonomy] = await connection.db.insert(taxonomyTerms).values({
        internalKey: "governed-material",
        dimension: "material_fiber",
      }).returning({ id: taxonomyTerms.id });
      if (!taxonomy) throw new Error("Missing Taxonomy.");
      await connection.db.insert(taxonomyTermLocalizations).values({
        taxonomyTermId: taxonomy.id,
        locale: "en",
        name: "TEST Governed Material",
      });
      const [asset] = await connection.db.insert(assets).values({
        originalFileName: "governed.jpg",
        storageProvider: "test",
        storagePartition: "public",
        objectKey: "governed/asset.jpg",
        access: "public",
        category: "product",
        status: "ready",
        scanStatus: "passed",
        declaredMimeType: "image/jpeg",
        detectedMimeType: "image/jpeg",
        byteSize: 10,
        sha256: "governed-asset-sha",
      }).returning({ id: assets.id });
      if (!asset) throw new Error("Missing Asset.");

      const productId = await createProductDraft(
        connection.db,
        { userId: editor.id, role: editor.role },
        { name: "TEST Governed Product", primaryTaxonomyTermId: taxonomy.id, assetIds: [asset.id] },
      );
      await expect(submitProductForReview(
        connection.db,
        { userId: editor.id, role: editor.role },
        productId,
        { auditWriter: failingAudit },
      )).rejects.toThrow("TEST governed Audit failure");
      expect((await connection.db.select({ status: products.status }).from(products).where(eq(products.id, productId)))[0]?.status).toBe("draft");

      const applicationId = await createApplicationDraft(
        connection.db,
        { userId: editor.id, role: editor.role },
        { internalKey: "governed-sportswear", name: "TEST Governed Sportswear", body: "Useful synthetic Application body." },
      );
      await expect(submitApplicationForReview(
        connection.db,
        { userId: editor.id, role: editor.role },
        applicationId,
        { auditWriter: failingAudit },
      )).rejects.toThrow("TEST governed Audit failure");
      expect((await connection.db.select({ status: applications.status }).from(applications).where(eq(applications.id, applicationId)))[0]?.status).toBe("draft");
      await submitApplicationForReview(connection.db, { userId: editor.id, role: editor.role }, applicationId);
      await expect(publishApplication(
        connection.db,
        { userId: admin.id, role: admin.role },
        applicationId,
        { auditWriter: failingAudit },
      )).rejects.toThrow("TEST governed Audit failure");
      expect((await connection.db.select({ status: applications.status }).from(applications).where(eq(applications.id, applicationId)))[0]?.status).toBe("in_review");

      const fabricId = await createFabricLibraryEntry(
        connection.db,
        { userId: editor.id, role: editor.role },
        { title: "TEST Governed Fabric", assetIds: [asset.id] },
      );
      await expect(submitFabricLibraryEntryForReview(
        connection.db,
        { userId: editor.id, role: editor.role },
        fabricId,
        { auditWriter: failingAudit },
      )).rejects.toThrow("TEST governed Audit failure");
      expect((await connection.db.select({ status: fabricLibraryEntries.status }).from(fabricLibraryEntries).where(eq(fabricLibraryEntries.id, fabricId)))[0]?.status).toBe("draft");

      const [author] = await connection.db.insert(authors).values({
        internalKey: "governed-author",
        displayName: "TEST Governed Author",
      }).returning({ id: authors.id });
      if (!author) throw new Error("Missing Author.");
      const contentId = await createContentDraft(
        connection.db,
        { userId: contentEditor.id, role: contentEditor.role },
        { channel: "fabric_knowledge", type: "article", authorId: author.id, title: "TEST Governed Content", body: "Synthetic governed body." },
      );
      await expect(submitContentForReview(
        connection.db,
        { userId: contentEditor.id, role: contentEditor.role },
        contentId,
        { auditWriter: failingAudit },
      )).rejects.toThrow("TEST governed Audit failure");
      expect((await connection.db.select({ status: contents.status }).from(contents).where(eq(contents.id, contentId)))[0]?.status).toBe("draft");

      await expect(updateProductStructure(
        connection.db,
        { userId: editor.id, role: editor.role },
        productId,
        {
          primaryTaxonomyTermId: taxonomy.id,
          additionalTaxonomyTermIds: [],
          applicationIds: [applicationId],
          tagNames: [],
          assetIds: [asset.id],
          heroAssetId: asset.id,
          features: [],
          faqs: [],
          colorOptionsDisplay: "inherit",
          customAvailableDisplay: "inherit",
          sampleAvailableDisplay: "inherit",
          moqNoteDisplay: "inherit",
        },
        { auditWriter: failingAudit },
      )).rejects.toThrow("TEST governed Audit failure");
      expect(await connection.db.select().from(productApplications).where(eq(productApplications.productId, productId))).toHaveLength(0);
      expect(await connection.db.select().from(productTaxonomyTerms).where(eq(productTaxonomyTerms.productId, productId))).toEqual([
        expect.objectContaining({ taxonomyTermId: taxonomy.id, isPrimary: true }),
      ]);

      const [productRoute] = await connection.db.select({ id: routes.id, path: routes.path })
        .from(routes)
        .where(and(eq(routes.entityType, "product"), eq(routes.entityId, productId)));
      if (!productRoute) throw new Error("Missing Product Route.");
      const beforeSeo = (await connection.db.select().from(seoMetadata).where(eq(seoMetadata.routeId, productRoute.id)))[0]!;
      await expect(updateSeoMetadata(
        connection.db,
        { userId: admin.id, role: admin.role },
        productRoute.id,
        { title: "Should roll back" },
        { auditWriter: failingAudit },
      )).rejects.toThrow("TEST governed Audit failure");
      expect((await connection.db.select().from(seoMetadata).where(eq(seoMetadata.routeId, productRoute.id)))[0]?.title).toBe(beforeSeo.title);

      await connection.db.update(products).set({ status: "published" }).where(eq(products.id, productId));
      await connection.db.update(seoMetadata).set({ indexStatus: "index" }).where(eq(seoMetadata.routeId, productRoute.id));
      await expect(archiveProduct(
        connection.db,
        { userId: admin.id, role: admin.role },
        productId,
        "Synthetic archive rollback",
        { auditWriter: failingAudit },
      )).rejects.toThrow("TEST governed Audit failure");
      expect((await connection.db.select({ status: products.status }).from(products).where(eq(products.id, productId)))[0]?.status).toBe("published");
      expect((await connection.db.select({ indexStatus: seoMetadata.indexStatus }).from(seoMetadata).where(eq(seoMetadata.routeId, productRoute.id)))[0]?.indexStatus).toBe("index");

      await expect(changeProductSlug(
        connection.db,
        { userId: admin.id, role: admin.role },
        productId,
        "governed-route-rollback",
        { auditWriter: failingAudit },
      )).rejects.toThrow("TEST governed Audit failure");
      expect((await connection.db.select({ path: routes.path }).from(routes).where(eq(routes.id, productRoute.id)))[0]?.path).toBe(productRoute.path);
      expect(await connection.db.select().from(redirects).where(eq(redirects.sourcePath, productRoute.path))).toHaveLength(0);

      await expect(updateSeoMetadata(
        connection.db,
        { userId: admin.id, role: "analyst" },
        productRoute.id,
        { title: "Forbidden" },
      )).rejects.toThrow(/permission/i);
      expect((await connection.db.select({ title: contentLocalizations.title }).from(contentLocalizations).where(eq(contentLocalizations.contentId, contentId)))[0]?.title).toBe("TEST Governed Content");
      expect((await connection.db.select({ name: applicationLocalizations.name }).from(applicationLocalizations).where(eq(applicationLocalizations.applicationId, applicationId)))[0]?.name).toBe("TEST Governed Sportswear");
    } finally {
      await connection.close();
    }
  }, 30_000);

  it("statically rejects transaction-outside Audit calls in governed services", async () => {
    const governedFiles = [
      "src/catalog/application-service.ts",
      "src/catalog/fabric-library-service.ts",
      "src/catalog/product-service.ts",
      "src/catalog/taxonomy-index-service.ts",
      "src/catalog/taxonomy-service.ts",
      "src/auth/session.ts",
      "src/content/author-service.ts",
      "src/content/company-facts-service.ts",
      "src/content/content-service.ts",
      "src/crm/contact-service.ts",
      "src/crm/inquiry-service.ts",
      "src/seo/keyword-mapping-service.ts",
      "src/seo/metadata-service.ts",
      "src/seo/redirects.ts",
      "src/seo/topic-service.ts",
      "src/settings/feature-flag-service.ts",
      "src/uploads/admin-upload-service.ts",
      "src/uploads/object-cleanup-service.ts",
      "src/uploads/upload-recovery-service.ts",
      "src/uploads/retention-service.ts",
      "src/uploads/service.ts",
    ];
    const sources = await Promise.all(governedFiles.map((file) => readFile(file, "utf8")));
    for (const [index, source] of sources.entries()) {
      expect(source, governedFiles[index]).not.toMatch(/writeAuditLog\s*\(\s*db\s*,/);
    }
    const adminActions = await readFile("src/admin/actions.ts", "utf8");
    expect(adminActions).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
    expect(adminActions).not.toMatch(/\bredirect\s*\(/);
    expect(adminActions).not.toMatch(/Promise<void>/);
  });

  it("scans the complete src boundary for direct Admin writes, redirects, Audit misuse, and ungoverned Finalize/Cleanup mutations", async () => {
    const entries = await readdir("src", { recursive: true, withFileTypes: true });
    const sourceFiles = entries
      .filter((entry) => entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name))
      .map((entry) => `src/${entry.parentPath.slice(entry.parentPath.indexOf("src") + 4)}/${entry.name}`
        .replace("src//", "src/"))
      .filter((file) => !/\.(?:test|spec)\.(?:ts|tsx)$/.test(file));
    const sources = await Promise.all(sourceFiles.map(async (file) => ({
      file,
      source: await readFile(file, "utf8"),
    })));
    const auditOnlyRequestBoundaries = new Set([
      "src/app/api/auth/login/route.ts",
      "src/app/api/inquiry-assets/[assetId]/route.ts",
    ]);

    for (const { file, source } of sources) {
      if (!auditOnlyRequestBoundaries.has(file)) {
        expect(source, `${file}: required Audit must receive a transaction, not db`)
          .not.toMatch(/writeAuditLog\s*\(\s*db\s*,/);
      }
      if (/^[\s\S]*["']use server["'];/.test(source)) {
        expect(source, `${file}: Server Action database write`).not.toMatch(/\.(?:insert|update|delete)\(/);
        expect(source, `${file}: Server Action direct redirect`).not.toMatch(/\bredirect\s*\(/);
        expect(source, `${file}: Server Action void result`).not.toMatch(/Promise<void>/);
      }
    }

    const coordinationMutationFiles = sources.filter(({ source }) =>
      /\.(?:insert|update|delete)\((?:objectCleanupJobs|uploadRecoveryJobs|finalizeObjectManifestItems)\)/.test(source),
    ).map(({ file }) => file).sort();
    expect(coordinationMutationFiles).toEqual([
      "src/uploads/admin-upload-service.ts",
      "src/uploads/object-cleanup-service.ts",
      "src/uploads/service.ts",
      "src/uploads/upload-recovery-service.ts",
    ]);

    const finalizeStateMutationFiles = sources.filter(({ source }) =>
      /status:\s*["'](?:finalizing|cleanup_required)["']/.test(source) &&
      /\.(?:insert|update)\(/.test(source),
    ).map(({ file }) => file).sort();
    expect(finalizeStateMutationFiles).toEqual([
      "src/uploads/admin-upload-service.ts",
      "src/uploads/upload-recovery-service.ts",
    ]);
  });
});
