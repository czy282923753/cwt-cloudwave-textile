import { createHash, randomUUID } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  applicationLocalizations,
  applications,
  assets,
  auditLogs,
  authors,
  contacts,
  contentLocalizations,
  contents,
  fabricLibraryEntries,
  inquiries,
  inquiryAssets,
  inquiryStatusHistory,
  notificationOutbox,
  productAssets,
  productLocalizations,
  productTaxonomyTerms,
  products,
  redirects,
  routes,
  seoMetadata,
  taxonomyTerms,
  uploadIntents,
  users,
} from "@/db/schema";
import type { EmailNotifier } from "@/integrations/email";
import { createTestDatabase } from "@/test/database";

import { createInquiry, InquiryIdempotencyConflictError } from "./inquiry-service";

class SilentNotifier implements EmailNotifier {
  async notifyInquiry(): Promise<void> {}
}

const notifier = new SilentNotifier();

type TestConnection = Awaited<ReturnType<typeof createTestDatabase>>;

async function createRoute(
  connection: TestConnection,
  input: typeof routes.$inferInsert,
  withSeo = false,
) {
  const [route] = await connection.db.insert(routes).values(input).returning({ id: routes.id });
  if (!route) throw new Error("Synthetic Route fixture was not created.");
  if (withSeo) {
    await connection.db.insert(seoMetadata).values({
      routeId: route.id,
      title: "Synthetic public source",
      canonicalPath: input.path,
      indexStatus: "noindex",
    });
  }
  return route.id;
}

async function createEligibleSources(connection: TestConnection) {
  const [reviewer] = await connection.db.insert(users).values({
    email: "synthetic-source-reviewer@example.test",
    displayName: "Synthetic Source Reviewer",
    role: "reviewer_publisher",
    passwordHash: "synthetic-only",
  }).returning({ id: users.id });
  if (!reviewer) throw new Error("Synthetic Reviewer fixture was not created.");

  const [image] = await connection.db.insert(assets).values({
    originalFileName: "synthetic-source.jpg",
    storageProvider: "test",
    storagePartition: "public",
    objectKey: "synthetic/source-resolution.jpg",
    access: "public",
    category: "product",
    status: "ready",
    scanStatus: "passed",
    declaredMimeType: "image/jpeg",
    detectedMimeType: "image/jpeg",
    byteSize: 128,
    sha256: "synthetic-source-resolution-image",
    altText: "Synthetic source Product image",
  }).returning({ id: assets.id });
  if (!image) throw new Error("Synthetic image fixture was not created.");

  const [primaryTaxonomy] = await connection.db.insert(taxonomyTerms).values({
    internalKey: "synthetic-source-primary-taxonomy",
    dimension: "material_fiber",
  }).returning({ id: taxonomyTerms.id });
  if (!primaryTaxonomy) throw new Error("Synthetic Taxonomy fixture was not created.");
  const product = await connection.db.transaction(async (transaction) => {
    const [created] = await transaction.insert(products).values({
      status: "draft",
      realProductBasis: "physical_sample",
      realProductConfirmedByUserId: reviewer.id,
      realProductConfirmedAt: new Date(),
      publishedAt: new Date(),
    }).returning({ id: products.id });
    if (!created) throw new Error("Synthetic Product fixture was not created.");
    await transaction.insert(productTaxonomyTerms).values({
      productId: created.id,
      taxonomyTermId: primaryTaxonomy.id,
      isPrimary: true,
    });
    return created;
  });
  if (!product) throw new Error("Synthetic Product fixture was not created.");
  await connection.db.insert(productLocalizations).values({
    productId: product.id,
    locale: "en",
    name: "Synthetic Eligible Source Product",
  });
  await connection.db.insert(productAssets).values({
    productId: product.id,
    assetId: image.id,
    role: "hero",
  });
  await connection.db.update(products).set({ status: "published" })
    .where(eq(products.id, product.id));
  const productPath = "/products/synthetic-eligible-source/";
  await createRoute(connection, {
    locale: "en",
    path: productPath,
    entityType: "product",
    entityId: product.id,
  });

  const [application] = await connection.db.insert(applications).values({
    internalKey: "synthetic-source-application",
    status: "published",
    publishedAt: new Date(),
  }).returning({ id: applications.id });
  if (!application) throw new Error("Synthetic Application fixture was not created.");
  await connection.db.insert(applicationLocalizations).values({
    applicationId: application.id,
    locale: "en",
    name: "Synthetic Source Application",
    body: "Synthetic published Application body.",
  });
  const applicationPath = "/applications/synthetic-source-application/";
  await createRoute(connection, {
    locale: "en",
    path: applicationPath,
    entityType: "application",
    entityId: application.id,
  }, true);

  const [author] = await connection.db.insert(authors).values({
    internalKey: "synthetic-source-author",
    displayName: "Synthetic Source Author",
    isOrganization: true,
  }).returning({ id: authors.id });
  if (!author) throw new Error("Synthetic Author fixture was not created.");
  const [content] = await connection.db.insert(contents).values({
    channel: "fabric_knowledge",
    type: "article",
    status: "published",
    authorId: author.id,
    publishedAt: new Date(),
  }).returning({ id: contents.id });
  if (!content) throw new Error("Synthetic Content fixture was not created.");
  await connection.db.insert(contentLocalizations).values({
    contentId: content.id,
    locale: "en",
    title: "Synthetic Published Source Content",
    body: "Synthetic published Content body.",
    structuredBlocks: {
      version: 1,
      blocks: [{ id: "synthetic-source", type: "paragraph", text: "Synthetic source narrative." }],
    },
  });
  const contentPath = "/fabric-knowledge/synthetic-source-content/";
  await createRoute(connection, {
    locale: "en",
    path: contentPath,
    entityType: "content",
    entityId: content.id,
  }, true);

  return {
    reviewerId: reviewer.id,
    imageId: image.id,
    productId: product.id,
    productPath,
    applicationId: application.id,
    applicationPath,
    contentId: content.id,
    contentPath,
  };
}

async function submit(
  connection: TestConnection,
  key: string,
  sourcePagePath: string,
  extra: Record<string, unknown> = {},
) {
  const result = await createInquiry(connection.db, notifier, {
    idempotencyKey: key,
    name: `Synthetic Source Buyer ${key}`,
    email: `${key}@example.test`,
    description: "Synthetic source-resolution Inquiry.",
    sourcePagePath,
    ...extra,
  });
  const [row] = await connection.db.select({
    sourceEntityType: inquiries.sourceEntityType,
    sourceEntityId: inquiries.sourceEntityId,
  }).from(inquiries).where(eq(inquiries.id, result.inquiryId));
  return { result, row };
}

describe("S5-F2A server source resolution and immutable persistence", () => {
  it("persists exact eligible Product, Application, and Content pairs", async () => {
    const connection = await createTestDatabase();
    try {
      const fixture = await createEligibleSources(connection);
      const cases = [
        ["product", fixture.productId, fixture.productPath],
        ["application", fixture.applicationId, fixture.applicationPath],
        ["content", fixture.contentId, fixture.contentPath],
      ] as const;
      for (const [type, id, path] of cases) {
        const { row } = await submit(connection, `eligible-${type}-source`, path);
        expect(row).toEqual({ sourceEntityType: type, sourceEntityId: id });
      }
    } finally {
      await connection.close();
    }
  });

  it("fails each authoritative Product eligibility component independently to null", async () => {
    const connection = await createTestDatabase();
    try {
      const fixture = await createEligibleSources(connection);
      const cases: Array<{
        name: string;
        fail: () => Promise<unknown>;
        restore: () => Promise<unknown>;
      }> = [
        {
          name: "published-state",
          fail: () => connection.db.update(products).set({ status: "draft" }).where(eq(products.id, fixture.productId)),
          restore: () => connection.db.update(products).set({ status: "published" }).where(eq(products.id, fixture.productId)),
        },
        {
          name: "verified-real-basis",
          fail: () => connection.db.update(products).set({ realProductBasis: null }).where(eq(products.id, fixture.productId)),
          restore: () => connection.db.update(products).set({ realProductBasis: "physical_sample" }).where(eq(products.id, fixture.productId)),
        },
        {
          name: "active-authorized-verifier",
          fail: () => connection.db.update(users).set({ isActive: false }).where(eq(users.id, fixture.reviewerId)),
          restore: () => connection.db.update(users).set({ isActive: true }).where(eq(users.id, fixture.reviewerId)),
        },
        {
          name: "authorized-verifier-role",
          fail: () => connection.db.update(users).set({ role: "sales" }).where(eq(users.id, fixture.reviewerId)),
          restore: () => connection.db.update(users).set({ role: "reviewer_publisher" }).where(eq(users.id, fixture.reviewerId)),
        },
        {
          name: "eligible-public-image",
          fail: () => connection.db.update(assets).set({ scanStatus: "pending" }).where(eq(assets.id, fixture.imageId)),
          restore: () => connection.db.update(assets).set({ scanStatus: "passed" }).where(eq(assets.id, fixture.imageId)),
        },
        {
          name: "english-name",
          fail: () => connection.db.update(productLocalizations).set({ name: "" }).where(eq(productLocalizations.productId, fixture.productId)),
          restore: () => connection.db.update(productLocalizations).set({ name: "Synthetic Eligible Source Product" }).where(eq(productLocalizations.productId, fixture.productId)),
        },
        {
          name: "current-english-route",
          fail: () => connection.db.update(routes).set({ isCurrent: false }).where(eq(routes.path, fixture.productPath)),
          restore: () => connection.db.update(routes).set({ isCurrent: true }).where(eq(routes.path, fixture.productPath)),
        },
      ];
      for (const testCase of cases) {
        await testCase.fail();
        const { row } = await submit(
          connection,
          `ineligible-product-${testCase.name}`,
          fixture.productPath,
        );
        expect(row, testCase.name).toEqual({ sourceEntityType: null, sourceEntityId: null });
        await testCase.restore();
      }
    } finally {
      await connection.close();
    }
  });

  it("persists null for unsupported, stale, non-English, Redirect, and unmatched sources", async () => {
    const connection = await createTestDatabase();
    try {
      const fixture = await createEligibleSources(connection);
      for (const status of ["draft", "in_review", "archived"] as const) {
        await connection.db.update(applications).set({ status })
          .where(eq(applications.id, fixture.applicationId));
        const { row } = await submit(
          connection,
          `null-source-application-${status}`,
          fixture.applicationPath,
        );
        expect(row, `Application ${status}`).toEqual({
          sourceEntityType: null,
          sourceEntityId: null,
        });
      }
      await connection.db.update(applications).set({ status: "published" })
        .where(eq(applications.id, fixture.applicationId));
      for (const status of ["draft", "in_review", "archived"] as const) {
        await connection.db.update(contents).set({ status })
          .where(eq(contents.id, fixture.contentId));
        const { row } = await submit(
          connection,
          `null-source-content-${status}`,
          fixture.contentPath,
        );
        expect(row, `Content ${status}`).toEqual({
          sourceEntityType: null,
          sourceEntityId: null,
        });
      }
      await connection.db.update(contents).set({ status: "published" })
        .where(eq(contents.id, fixture.contentId));
      await connection.db.update(contentLocalizations).set({
        structuredBlocks: { version: 1, blocks: [] },
      }).where(eq(contentLocalizations.contentId, fixture.contentId));
      const unreadableContent = await submit(
        connection,
        "null-source-content-unreadable",
        fixture.contentPath,
      );
      expect(unreadableContent.row).toEqual({ sourceEntityType: null, sourceEntityId: null });
      await connection.db.update(contentLocalizations).set({
        structuredBlocks: {
          version: 1,
          blocks: [{ id: "synthetic-source", type: "paragraph", text: "Synthetic source narrative." }],
        },
      }).where(eq(contentLocalizations.contentId, fixture.contentId));

      const [taxonomy] = await connection.db.insert(taxonomyTerms).values({
        internalKey: "synthetic-source-taxonomy",
        dimension: "material_fiber",
      }).returning({ id: taxonomyTerms.id });
      const [fabric] = await connection.db.insert(fabricLibraryEntries).values({
        status: "published",
        publishedAt: new Date(),
      }).returning({ id: fabricLibraryEntries.id });
      if (!taxonomy || !fabric) throw new Error("Synthetic unsupported fixtures were not created.");

      const routeCases = [
        { label: "missing-entity", path: "/products/synthetic-missing/", entityType: "product" as const, entityId: randomUUID(), locale: "en", isCurrent: true },
        { label: "stale", path: "/applications/synthetic-stale/", entityType: "application" as const, entityId: fixture.applicationId, locale: "en", isCurrent: false },
        { label: "non-english", path: "/fr/applications/synthetic-source/", entityType: "application" as const, entityId: fixture.applicationId, locale: "fr", isCurrent: true },
        { label: "taxonomy", path: "/fabric-types/synthetic-source/", entityType: "taxonomy" as const, entityId: taxonomy.id, locale: "en", isCurrent: true },
        { label: "fabric", path: "/fabric-library/synthetic-source/", entityType: "fabric_entry" as const, entityId: fabric.id, locale: "en", isCurrent: true },
        { label: "system", path: "/get-quote/", entityType: "home" as const, entityId: null, locale: "en", isCurrent: true },
        { label: "static", path: "/about/", entityType: "static_page" as const, entityId: randomUUID(), locale: "en", isCurrent: true },
        { label: "unsupported", path: "/authors/synthetic-source/", entityType: "author" as const, entityId: randomUUID(), locale: "en", isCurrent: true },
      ];
      for (const routeCase of routeCases) {
        await createRoute(connection, {
          path: routeCase.path,
          entityType: routeCase.entityType,
          entityId: routeCase.entityId,
          locale: routeCase.locale,
          isCurrent: routeCase.isCurrent,
        });
      }
      const redirectPath = "/products/synthetic-redirect-source/";
      await connection.db.insert(redirects).values({
        sourcePath: redirectPath,
        destinationPath: fixture.productPath,
        reason: "Synthetic stale public source",
      });

      for (const testCase of [
        ...routeCases.map(({ label, path }) => ({ label, path })),
        { label: "redirect-source", path: redirectPath },
        { label: "unmatched", path: "/products/synthetic-unmatched/" },
        { label: "prefix-only", path: "/products/synthetic-eligible/" },
      ]) {
        const { row } = await submit(connection, `null-source-${testCase.label}`, testCase.path);
        expect(row, testCase.label).toEqual({ sourceEntityType: null, sourceEntityId: null });
      }
      const acceptedCaseNormalization = await submit(
        connection,
        "accepted-source-case-normalization",
        "/Products/Synthetic-Eligible-Source/",
      );
      expect(acceptedCaseNormalization.row).toEqual({
        sourceEntityType: "product",
        sourceEntityId: fixture.productId,
      });

      for (const [index, invalidPath] of [
        `${fixture.productPath}?client=${fixture.productId}`,
        `${fixture.productPath}#${fixture.productId}`,
        `/products//synthetic-eligible-source/`,
      ].entries()) {
        await expect(submit(connection, `invalid-source-${index}`, invalidPath))
          .rejects.toThrow(/valid source page path/i);
      }
    } finally {
      await connection.close();
    }
  });

  it("never re-resolves populated or null snapshots on exact and concurrent replay", async () => {
    const connection = await createTestDatabase();
    try {
      const fixture = await createEligibleSources(connection);
      const populatedInput = {
        idempotencyKey: "immutable-populated-source",
        name: "Synthetic Populated Snapshot Buyer",
        email: "immutable-populated@example.test",
        description: "Synthetic immutable populated source.",
        sourcePagePath: fixture.productPath,
      };
      const first = await createInquiry(connection.db, notifier, populatedInput);
      await connection.db.update(products).set({ status: "archived" })
        .where(eq(products.id, fixture.productId));
      const replay = await createInquiry(connection.db, notifier, populatedInput);
      expect(replay).toMatchObject({ inquiryId: first.inquiryId, replayed: true });
      expect((await connection.db.select({
        sourceEntityType: inquiries.sourceEntityType,
        sourceEntityId: inquiries.sourceEntityId,
      }).from(inquiries).where(eq(inquiries.id, first.inquiryId)))[0]).toEqual({
        sourceEntityType: "product",
        sourceEntityId: fixture.productId,
      });

      const nullInput = {
        idempotencyKey: "immutable-null-source",
        name: "Synthetic Null Snapshot Buyer",
        email: "immutable-null@example.test",
        description: "Synthetic immutable null source.",
        sourcePagePath: "/products/synthetic-later-route/",
      };
      const initiallyNull = await createInquiry(connection.db, notifier, nullInput);
      await connection.db.update(products).set({ status: "published" })
        .where(eq(products.id, fixture.productId));
      await connection.db.update(routes).set({
        path: nullInput.sourcePagePath,
        isCurrent: true,
      }).where(eq(routes.entityId, fixture.productId));
      const nullReplay = await createInquiry(connection.db, notifier, nullInput);
      expect(nullReplay).toMatchObject({ inquiryId: initiallyNull.inquiryId, replayed: true });
      expect((await connection.db.select({
        sourceEntityType: inquiries.sourceEntityType,
        sourceEntityId: inquiries.sourceEntityId,
      }).from(inquiries).where(eq(inquiries.id, initiallyNull.inquiryId)))[0]).toEqual({
        sourceEntityType: null,
        sourceEntityId: null,
      });

      const concurrentInput = {
        idempotencyKey: "immutable-concurrent-source",
        name: "Synthetic Concurrent Source Buyer",
        email: "immutable-concurrent@example.test",
        description: "Synthetic immutable concurrent source.",
        sourcePagePath: nullInput.sourcePagePath,
      };
      const concurrent = await Promise.all([
        createInquiry(connection.db, notifier, concurrentInput),
        createInquiry(connection.db, notifier, concurrentInput),
      ]);
      expect(new Set(concurrent.map((item) => item.inquiryId)).size).toBe(1);
      expect(concurrent.filter((item) => item.replayed)).toHaveLength(1);
      expect((await connection.db.select({ value: count() }).from(inquiries)
        .where(eq(inquiries.idempotencyKey, concurrentInput.idempotencyKey)))[0]?.value).toBe(1);
      await expect(createInquiry(connection.db, notifier, {
        ...concurrentInput,
        description: "Synthetic conflicting source replay.",
      })).rejects.toBeInstanceOf(InquiryIdempotencyConflictError);
    } finally {
      await connection.close();
    }
  });

  it("ignores client identity and rolls source evidence back with required Audit failure", async () => {
    const connection = await createTestDatabase();
    try {
      const fixture = await createEligibleSources(connection);
      const spoof = await submit(connection, "client-spoof-source", "/products/unmatched-client-spoof/", {
        sourceEntityType: "product",
        sourceEntityId: fixture.productId,
        routeId: randomUUID(),
      });
      expect(spoof.row).toEqual({ sourceEntityType: null, sourceEntityId: null });

      const sessionId = "4f2a0000-0000-4000-8000-000000000001";
      const token = "synthetic-source-audit-token-000000000001";
      const [privateAsset] = await connection.db.insert(assets).values({
        originalFileName: "synthetic-source-audit.jpg",
        storageProvider: "test",
        storagePartition: "private",
        objectKey: "inquiry/synthetic-source-audit.jpg",
        access: "private",
        category: "inquiry",
        status: "ready",
        scanStatus: "passed",
        declaredMimeType: "image/jpeg",
        detectedMimeType: "image/jpeg",
        byteSize: 32,
        sha256: "synthetic-source-audit-private-image",
      }).returning({ id: assets.id });
      if (!privateAsset) throw new Error("Synthetic private Asset was not created.");
      await connection.db.insert(uploadIntents).values({
        tokenHash: createHash("sha256").update(token).digest("hex"),
        anonymousSessionId: sessionId,
        declaredFileName: "synthetic-source-audit.jpg",
        declaredMimeType: "image/jpeg",
        declaredByteSize: 32,
        status: "passed",
        assetId: privateAsset.id,
        expiresAt: new Date(Date.now() + 60_000),
      });
      const requiredTables = [
        contacts,
        inquiries,
        inquiryAssets,
        inquiryStatusHistory,
        notificationOutbox,
        auditLogs,
      ] as const;
      const beforeCounts = await Promise.all(requiredTables.map(async (table) =>
        Number((await connection.db.select({ value: count() }).from(table))[0]?.value),
      ));
      await expect(createInquiry(connection.db, notifier, {
        idempotencyKey: "source-audit-rollback",
        name: "Synthetic Audit Rollback Buyer",
        email: "source-audit-rollback@example.test",
        description: null,
        sourcePagePath: fixture.productPath,
        uploadTokens: [token],
        sessionId,
      }, {
        auditWriter: async () => {
          throw new Error("Synthetic required Audit failure");
        },
      })).rejects.toThrow("Synthetic required Audit failure");
      const afterCounts = await Promise.all(requiredTables.map(async (table) =>
        Number((await connection.db.select({ value: count() }).from(table))[0]?.value),
      ));
      expect(afterCounts).toEqual(beforeCounts);
      expect((await connection.db.select({
        status: uploadIntents.status,
        isConsumed: uploadIntents.isConsumed,
        inquiryId: uploadIntents.consumedByInquiryId,
      }).from(uploadIntents))[0]).toEqual({
        status: "passed",
        isConsumed: false,
        inquiryId: null,
      });
    } finally {
      await connection.close();
    }
  });
});
