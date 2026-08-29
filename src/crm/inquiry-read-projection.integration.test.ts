import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  applicationLocalizations,
  applications,
  assets,
  authors,
  contacts,
  contentLocalizations,
  contents,
  inquiries,
  productAssets,
  productLocalizations,
  productTaxonomyTerms,
  products,
  routes,
  seoMetadata,
  taxonomyTerms,
  users,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import {
  getInquiryCrmReadProjection,
  listInquiryCrmSummaries,
} from "./inquiry-read-projection";

type TestConnection = Awaited<ReturnType<typeof createTestDatabase>>;

async function createPublicRoute(
  connection: TestConnection,
  input: typeof routes.$inferInsert,
  withSeo = false,
) {
  const [route] = await connection.db.insert(routes).values(input).returning({ id: routes.id });
  if (!route) throw new Error("Synthetic CRM source Route was not created.");
  if (withSeo) {
    await connection.db.insert(seoMetadata).values({
      routeId: route.id,
      title: "Synthetic CRM source",
      canonicalPath: input.path,
      indexStatus: "noindex",
    });
  }
  return route.id;
}

async function createSourceFixtures(connection: TestConnection, reviewerId: string) {
  const [image] = await connection.db.insert(assets).values({
    originalFileName: "synthetic-crm-source.jpg",
    storageProvider: "test",
    storagePartition: "public",
    objectKey: "synthetic/crm-source.jpg",
    access: "public",
    category: "product",
    status: "ready",
    scanStatus: "passed",
    declaredMimeType: "image/jpeg",
    detectedMimeType: "image/jpeg",
    byteSize: 128,
    sha256: "synthetic-crm-source-image",
    altText: "Synthetic CRM source image",
  }).returning({ id: assets.id });
  const [primaryTaxonomy] = await connection.db.insert(taxonomyTerms).values({
    internalKey: "synthetic-crm-primary-taxonomy",
    dimension: "material_fiber",
  }).returning({ id: taxonomyTerms.id });
  if (!primaryTaxonomy) throw new Error("Synthetic CRM Taxonomy was not created.");
  const product = await connection.db.transaction(async (transaction) => {
    const [created] = await transaction.insert(products).values({
      status: "draft",
      realProductBasis: "physical_sample",
      realProductConfirmedByUserId: reviewerId,
      realProductConfirmedAt: new Date(),
      publishedAt: new Date(),
    }).returning({ id: products.id });
    if (!created) throw new Error("Synthetic Product source was not created.");
    await transaction.insert(productTaxonomyTerms).values({
      productId: created.id,
      taxonomyTermId: primaryTaxonomy.id,
      isPrimary: true,
    });
    return created;
  });
  if (!image || !product) throw new Error("Synthetic Product source was not created.");
  await connection.db.insert(productLocalizations).values({
    productId: product.id,
    locale: "en",
    name: "Synthetic Eligible CRM Product",
  });
  await connection.db.insert(productAssets).values({
    productId: product.id,
    assetId: image.id,
    role: "hero",
  });
  await connection.db.update(products).set({ status: "published" })
    .where(eq(products.id, product.id));
  const productPath = "/products/synthetic-crm-product/";
  await createPublicRoute(connection, {
    path: productPath,
    locale: "en",
    entityType: "product",
    entityId: product.id,
  });

  const [application] = await connection.db.insert(applications).values({
    internalKey: "synthetic-crm-application",
    status: "published",
    publishedAt: new Date(),
  }).returning({ id: applications.id });
  if (!application) throw new Error("Synthetic Application source was not created.");
  await connection.db.insert(applicationLocalizations).values({
    applicationId: application.id,
    locale: "en",
    name: "Synthetic Public CRM Application",
    body: "Synthetic public Application body.",
  });
  const applicationPath = "/applications/synthetic-crm-application/";
  const applicationRouteId = await createPublicRoute(connection, {
    path: applicationPath,
    locale: "en",
    entityType: "application",
    entityId: application.id,
  }, true);

  const [author] = await connection.db.insert(authors).values({
    internalKey: "synthetic-crm-source-author",
    displayName: "Synthetic CRM Source Author",
    isOrganization: true,
  }).returning({ id: authors.id });
  if (!author) throw new Error("Synthetic Content author was not created.");
  const [content] = await connection.db.insert(contents).values({
    channel: "fabric_knowledge",
    type: "article",
    status: "published",
    authorId: author.id,
    publishedAt: new Date(),
  }).returning({ id: contents.id });
  if (!content) throw new Error("Synthetic Content source was not created.");
  await connection.db.insert(contentLocalizations).values({
    contentId: content.id,
    locale: "en",
    title: "Synthetic Public CRM Content",
    body: "Synthetic public Content body.",
    structuredBlocks: {
      version: 1,
      blocks: [{ id: "synthetic-crm-copy", type: "paragraph", text: "Synthetic CRM source copy." }],
    },
  });
  const contentPath = "/fabric-knowledge/synthetic-crm-content/";
  await createPublicRoute(connection, {
    path: contentPath,
    locale: "en",
    entityType: "content",
    entityId: content.id,
  }, true);

  return {
    product: { id: product.id, path: productPath, label: "Synthetic Eligible CRM Product" },
    application: {
      id: application.id,
      path: applicationPath,
      label: "Synthetic Public CRM Application",
      routeId: applicationRouteId,
    },
    content: { id: content.id, path: contentPath, label: "Synthetic Public CRM Content" },
  } as const;
}

async function createInquiryFixture(
  connection: TestConnection,
  input: {
    suffix: string;
    ownerUserId: string;
    sourcePagePath: string;
    sourceEntityType?: "product" | "application" | "content" | null;
    sourceEntityId?: string | null;
    status?: typeof inquiries.$inferInsert.status;
    qualificationStatus?: typeof inquiries.$inferInsert.qualificationStatus;
    lostReason?: string | null;
    firstResponseAt?: Date | null;
  },
) {
  const [contact] = await connection.db.insert(contacts).values({
    name: `Synthetic CRM Contact ${input.suffix}`,
    email: `${input.suffix}@example.test`,
    normalizedEmail: `${input.suffix}@example.test`,
  }).returning({ id: contacts.id });
  if (!contact) throw new Error("Synthetic CRM Contact was not created.");
  const createdAt = new Date("2026-08-29T02:00:00.000Z");
  const [inquiry] = await connection.db.insert(inquiries).values({
    publicReference: `CWT-SYNTHETIC-${input.suffix.toUpperCase()}`,
    contactId: contact.id,
    ownerUserId: input.ownerUserId,
    status: input.status ?? "reviewing",
    qualificationStatus: input.qualificationStatus ?? "unassessed",
    lostReason: input.lostReason ?? null,
    submittedName: `Synthetic Buyer ${input.suffix}`,
    submittedEmail: `${input.suffix}@example.test`,
    submittedCountryCode: "GB",
    submittedWhatsapp: "+440000000000",
    description: "Synthetic CRM read-projection Inquiry.",
    idempotencyKey: `synthetic-crm-${input.suffix}`,
    sourcePagePath: input.sourcePagePath,
    landingPagePath: "/products/synthetic-first-touch/",
    referrer: "https://synthetic-first.example/",
    utmSource: "synthetic-first-source",
    utmMedium: "organic",
    utmCampaign: "synthetic-first-campaign",
    lastNonDirectSource: "synthetic-partner",
    lastNonDirectMedium: "referral",
    lastNonDirectCampaign: "synthetic-last-campaign",
    submitReferrer: "https://synthetic-submit.example/",
    submitUtmSource: "synthetic-submit-source",
    submitUtmMedium: "email",
    submitUtmCampaign: "synthetic-submit-campaign",
    sourceEntityType: input.sourceEntityType ?? null,
    sourceEntityId: input.sourceEntityId ?? null,
    attributionConfidence: "high",
    firstResponseAt: input.firstResponseAt ?? null,
    createdAt,
    updatedAt: createdAt,
  }).returning({ id: inquiries.id });
  if (!inquiry) throw new Error("Synthetic CRM Inquiry was not created.");
  return inquiry.id;
}

describe("S5-F2B record-scoped CRM read projection", () => {
  it("projects immutable attribution and current-safe labels for Product, Application, and Content without source UUIDs", async () => {
    const connection = await createTestDatabase();
    try {
      const insertedUsers = await connection.db.insert(users).values([
        { email: "synthetic-admin@example.test", displayName: "Synthetic Admin", role: "admin", passwordHash: "synthetic-only" },
        { email: "synthetic-owner@example.test", displayName: "Synthetic Owner", role: "sales", passwordHash: "synthetic-only" },
        { email: "synthetic-reviewer@example.test", displayName: "Synthetic Reviewer", role: "reviewer_publisher", passwordHash: "synthetic-only" },
      ]).returning({ id: users.id, role: users.role });
      const adminId = insertedUsers.find((user) => user.role === "admin")!.id;
      const ownerId = insertedUsers.find((user) => user.role === "sales")!.id;
      const reviewerId = insertedUsers.find((user) => user.role === "reviewer_publisher")!.id;
      const sources = await createSourceFixtures(connection, reviewerId);
      for (const type of ["product", "application", "content"] as const) {
        const source = sources[type];
        const inquiryId = await createInquiryFixture(connection, {
          suffix: `safe-${type}`,
          ownerUserId: ownerId,
          sourcePagePath: source.path,
          sourceEntityType: type,
          sourceEntityId: source.id,
        });
        const projection = await getInquiryCrmReadProjection(
          connection.db,
          { userId: adminId, role: "admin" },
          inquiryId,
        );
        expect(projection?.attribution).toMatchObject({
          confidence: "high",
          firstTouch: {
            landingPagePath: "/products/synthetic-first-touch/",
            referrer: "https://synthetic-first.example/",
            utmSource: "synthetic-first-source",
            utmMedium: "organic",
            utmCampaign: "synthetic-first-campaign",
          },
          lastNonDirect: {
            source: "synthetic-partner",
            medium: "referral",
            campaign: "synthetic-last-campaign",
          },
          submitTouch: {
            sourcePagePath: source.path,
            referrer: "https://synthetic-submit.example/",
            utmSource: "synthetic-submit-source",
            utmMedium: "email",
            utmCampaign: "synthetic-submit-campaign",
          },
          sourceEntityEvidence: {
            type,
            currentPublicSource: { type, label: source.label, href: source.path },
          },
        });
        const serialized = JSON.stringify(projection);
        expect(serialized).not.toContain(source.id);
        expect(serialized).not.toContain("sourceEntityId");
        expect(serialized).not.toContain("contactId");
      }
    } finally {
      await connection.close();
    }
  });

  it("enforces Admin, assigned Sales, unassigned Sales, and unrelated-role boundaries", async () => {
    const connection = await createTestDatabase();
    try {
      const insertedUsers = await connection.db.insert(users).values([
        { email: "scope-admin@example.test", displayName: "Synthetic Scope Admin", role: "admin", passwordHash: "synthetic-only" },
        { email: "scope-owner@example.test", displayName: "Synthetic Scope Owner", role: "sales", passwordHash: "synthetic-only" },
        { email: "scope-other@example.test", displayName: "Synthetic Scope Other", role: "sales", passwordHash: "synthetic-only" },
        { email: "scope-analyst@example.test", displayName: "Synthetic Scope Analyst", role: "analyst", passwordHash: "synthetic-only" },
      ]).returning({ id: users.id, role: users.role, email: users.email });
      const id = (email: string) => insertedUsers.find((user) => user.email === email)!.id;
      const inquiryId = await createInquiryFixture(connection, {
        suffix: "scope",
        ownerUserId: id("scope-owner@example.test"),
        sourcePagePath: "/get-quote/",
      });
      const admin = { userId: id("scope-admin@example.test"), role: "admin" as const };
      const owner = { userId: id("scope-owner@example.test"), role: "sales" as const };
      const other = { userId: id("scope-other@example.test"), role: "sales" as const };
      const analyst = { userId: id("scope-analyst@example.test"), role: "analyst" as const };

      await expect(getInquiryCrmReadProjection(connection.db, admin, inquiryId)).resolves.toMatchObject({ id: inquiryId });
      await expect(getInquiryCrmReadProjection(connection.db, owner, inquiryId)).resolves.toMatchObject({ id: inquiryId });
      await expect(getInquiryCrmReadProjection(connection.db, other, inquiryId)).rejects.toThrow();
      await expect(getInquiryCrmReadProjection(connection.db, analyst, inquiryId)).rejects.toThrow();
      await expect(listInquiryCrmSummaries(connection.db, admin)).resolves.toHaveLength(1);
      await expect(listInquiryCrmSummaries(connection.db, owner)).resolves.toHaveLength(1);
      await expect(listInquiryCrmSummaries(connection.db, other)).resolves.toHaveLength(0);
      await expect(listInquiryCrmSummaries(connection.db, analyst)).rejects.toThrow();
    } finally {
      await connection.close();
    }
  });

  it("keeps populated and null evidence immutable while current routes and eligibility change", async () => {
    const connection = await createTestDatabase();
    try {
      const insertedUsers = await connection.db.insert(users).values([
        { email: "immutable-admin@example.test", displayName: "Synthetic Immutable Admin", role: "admin", passwordHash: "synthetic-only" },
        { email: "immutable-owner@example.test", displayName: "Synthetic Immutable Owner", role: "sales", passwordHash: "synthetic-only" },
        { email: "immutable-reviewer@example.test", displayName: "Synthetic Immutable Reviewer", role: "reviewer_publisher", passwordHash: "synthetic-only" },
      ]).returning({ id: users.id, role: users.role });
      const adminId = insertedUsers.find((user) => user.role === "admin")!.id;
      const ownerId = insertedUsers.find((user) => user.role === "sales")!.id;
      const reviewerId = insertedUsers.find((user) => user.role === "reviewer_publisher")!.id;
      const source = (await createSourceFixtures(connection, reviewerId)).application;
      const populatedId = await createInquiryFixture(connection, {
        suffix: "immutable-populated",
        ownerUserId: ownerId,
        sourcePagePath: source.path,
        sourceEntityType: "application",
        sourceEntityId: source.id,
      });
      const legacyNullId = await createInquiryFixture(connection, {
        suffix: "immutable-null",
        ownerUserId: ownerId,
        sourcePagePath: source.path,
      });
      const missingId = await createInquiryFixture(connection, {
        suffix: "immutable-missing",
        ownerUserId: ownerId,
        sourcePagePath: "/applications/synthetic-missing-at-submit/",
        sourceEntityType: "application",
        sourceEntityId: crypto.randomUUID(),
      });
      const actor = { userId: adminId, role: "admin" as const };
      const movedPath = "/applications/synthetic-crm-application-current/";
      await connection.db.update(routes).set({ path: movedPath })
        .where(eq(routes.id, source.routeId));
      const moved = await getInquiryCrmReadProjection(connection.db, actor, populatedId);
      expect(moved?.attribution.submitTouch.sourcePagePath).toBe(source.path);
      expect(moved?.attribution.sourceEntityEvidence?.currentPublicSource?.href).toBe(movedPath);

      await connection.db.update(routes).set({ path: "/admin/synthetic-private-source/" })
        .where(eq(routes.id, source.routeId));
      const privateRoute = await getInquiryCrmReadProjection(connection.db, actor, populatedId);
      expect(privateRoute?.attribution.sourceEntityEvidence?.currentPublicSource).toBeNull();

      await connection.db.update(applications).set({ status: "archived" })
        .where(eq(applications.id, source.id));
      const stale = await getInquiryCrmReadProjection(connection.db, actor, populatedId);
      expect(stale?.attribution.sourceEntityEvidence).toMatchObject({
        type: "application",
        typeLabel: "Application",
        currentPublicSource: null,
      });
      const legacyNull = await getInquiryCrmReadProjection(connection.db, actor, legacyNullId);
      expect(legacyNull?.attribution.sourceEntityEvidence).toBeNull();
      const missing = await getInquiryCrmReadProjection(connection.db, actor, missingId);
      expect(missing?.attribution.sourceEntityEvidence).toMatchObject({
        type: "application",
        currentPublicSource: null,
      });

      const stored = await connection.db.select({
        sourcePagePath: inquiries.sourcePagePath,
        sourceEntityType: inquiries.sourceEntityType,
        sourceEntityId: inquiries.sourceEntityId,
      }).from(inquiries).where(eq(inquiries.id, populatedId));
      expect(stored[0]).toEqual({
        sourcePagePath: source.path,
        sourceEntityType: "application",
        sourceEntityId: source.id,
      });
    } finally {
      await connection.close();
    }
  });

  it("projects Lost, Spam exclusion, qualification, legal next transitions, and First Response consistently", async () => {
    const connection = await createTestDatabase();
    try {
      const [admin, owner] = await connection.db.insert(users).values([
        { email: "outcome-admin@example.test", displayName: "Synthetic Outcome Admin", role: "admin", passwordHash: "synthetic-only" },
        { email: "outcome-owner@example.test", displayName: "Synthetic Outcome Owner", role: "sales", passwordHash: "synthetic-only" },
      ]).returning({ id: users.id, role: users.role });
      if (!admin || !owner) throw new Error("Synthetic outcome users were not created.");
      const firstResponseAt = new Date("2026-08-29T02:12:00.000Z");
      const lostId = await createInquiryFixture(connection, {
        suffix: "outcome-lost",
        ownerUserId: owner.id,
        sourcePagePath: "/get-quote/",
        status: "lost",
        qualificationStatus: "unqualified",
        lostReason: "Synthetic scope mismatch.",
        firstResponseAt,
      });
      const spamId = await createInquiryFixture(connection, {
        suffix: "outcome-spam",
        ownerUserId: owner.id,
        sourcePagePath: "/get-quote/",
        status: "spam",
      });
      const actor = { userId: admin.id, role: "admin" as const };
      await expect(getInquiryCrmReadProjection(connection.db, actor, lostId)).resolves.toMatchObject({
        status: "lost",
        qualificationStatus: "unqualified",
        lostReason: "Synthetic scope mismatch.",
        firstResponseAt,
        firstResponseMinutes: 12,
        isEffectiveInquiry: true,
        allowedNextStatuses: ["reviewing", "archived"],
      });
      await expect(getInquiryCrmReadProjection(connection.db, actor, spamId)).resolves.toMatchObject({
        status: "spam",
        isEffectiveInquiry: false,
        allowedNextStatuses: ["reviewing", "archived"],
      });
    } finally {
      await connection.close();
    }
  });
});
