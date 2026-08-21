import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prepareDraftAssociationV1 } from "@/ai/applications/draft-assistance/association";
import type { DraftAssistanceCommandV1 } from "@/ai/applications/draft-assistance/contracts";
import { withReadOnlyDraftAvailabilityScope } from "@/ai/applications/draft-assistance/read-scopes";
import type { CoreAiActorV1 } from "@/ai/core/contracts";
import type { DatabaseConnection, PostgresAppDatabase } from "@/db/client";
import { migrateDatabase } from "@/db/migrate";
import {
  authors,
  companyFacts,
  contentLocalizations,
  contents,
  editorialRevisions,
  internalLinkRelations,
  routes,
  users,
} from "@/db/schema";
import * as schema from "@/db/schema";

import { createContentAiDraftReaderV1 } from "./content-ai-context-reader";

const postgresUrl = process.env.CWT_PHASE_C_POSTGRES_URL;
const actorId = "20000000-0000-4000-8000-000000000001";
const authorId = "20000000-0000-4000-8000-000000000002";
const contentId = "20000000-0000-4000-8000-000000000003";
const revisionId = "20000000-0000-4000-8000-000000000004";
const missingDraftVersionRevisionId = "20000000-0000-4000-8000-000000000011";
const companyFactId = "20000000-0000-4000-8000-000000000005";
const sourceRouteId = "20000000-0000-4000-8000-000000000006";
const destinationRouteOne = "20000000-0000-4000-8000-000000000007";
const destinationRouteTwo = "20000000-0000-4000-8000-000000000008";
const linkOne = "20000000-0000-4000-8000-000000000009";
const linkTwo = "20000000-0000-4000-8000-000000000010";

let client: Sql | undefined;
let database: PostgresAppDatabase | undefined;

function db(): PostgresAppDatabase {
  if (database === undefined) throw new Error("Content reader PostgreSQL fixture is unavailable.");
  return database;
}

const actor: CoreAiActorV1 = { principalId: actorId, roleKey: "content_editor" };

function fabricCommand(
  target: DraftAssistanceCommandV1["target"] = {
    type: "content_draft",
    contentId,
    locale: "en",
    expectedVersion: 5,
  },
): DraftAssistanceCommandV1 {
  return {
    useCase: "fabric_knowledge_draft",
    task: {
      kind: "fabric_knowledge_draft",
      tone: "neutral_editorial",
      topic: "Synthetic structured-block topic",
    },
    actor: { userId: actorId, role: "content_editor" },
    target,
    idempotencyKey: randomUUID(),
    contextSelections: [],
  };
}

function seoCommand(selectedInternalLinkIds: readonly string[]): DraftAssistanceCommandV1 {
  return {
    useCase: "seo_content_draft",
    task: {
      kind: "seo_content_draft",
      tone: "concise_professional_b2b",
      pageIntent: "Synthetic SEO intent",
      selectedInternalLinkIds,
    },
    actor: { userId: actorId, role: "content_editor" },
    target: { type: "content_draft", contentId, locale: "en", expectedVersion: 5 },
    idempotencyKey: randomUUID(),
    contextSelections: [],
  };
}

describe.skipIf(postgresUrl === undefined)("ContentAiDraftReaderV1 on PostgreSQL", () => {
  const reader = createContentAiDraftReaderV1();

  beforeAll(async () => {
    if (postgresUrl === undefined) return;
    client = postgres(postgresUrl, { max: 4, prepare: false, onnotice: () => undefined });
    database = drizzle(client, { schema });
    const connection: DatabaseConnection = {
      kind: "postgres",
      db: database,
      createMigrationClient: () => postgres(postgresUrl, {
        max: 1,
        prepare: false,
        onnotice: () => undefined,
      }),
      close: async () => undefined,
    };
    await migrateDatabase(connection);
  }, 30_000);

  beforeEach(async () => {
    await db().execute(sql`truncate table ${internalLinkRelations}, ${routes}, ${companyFacts}, ${editorialRevisions}, ${contentLocalizations}, ${contents}, ${authors}, ${users} cascade`);
    await db().insert(users).values({
      id: actorId,
      email: "synthetic-content-reader@example.invalid",
      displayName: "Synthetic Content Reader",
      role: "content_editor",
      passwordHash: "synthetic-not-a-password",
    });
    await db().insert(authors).values({
      id: authorId,
      internalKey: "synthetic-content-reader-author",
      displayName: "Synthetic Content Reader Author",
    });
    await db().insert(contents).values({
      id: contentId,
      channel: "fabric_knowledge",
      status: "draft",
      authorId,
      createdByUserId: actorId,
    });
    await db().insert(contentLocalizations).values({
      contentId,
      locale: "en",
      title: "Synthetic Structured Fabric Title",
      excerpt: "Synthetic structured excerpt",
      body: "SYNTHETIC LEGACY BODY MUST NEVER BE READ",
      structuredBlocks: {
        version: 1,
        blocks: [{
          id: "structured-proof",
          type: "paragraph",
          text: "SYNTHETIC STRUCTURED BLOCK NARRATIVE",
        }],
      },
      editorDocumentVersion: 5,
    });
    await db().insert(editorialRevisions).values({
      id: revisionId,
      entityType: "content",
      entityId: contentId,
      locale: "en",
      versionNumber: 77,
      status: "draft",
      snapshot: {
        kind: "content_blocks_v1",
        title: "Synthetic Content Revision Snapshot",
        excerpt: "Synthetic revision excerpt",
        document: { version: 1, blocks: [{
          id: "revision-structured-proof",
          type: "paragraph",
          text: "SYNTHETIC REVISION SNAPSHOT NARRATIVE",
        }] },
        expectedEditorDocumentVersion: 5,
        draftVersion: 4,
      },
      createdByUserId: actorId,
    });
    await db().insert(editorialRevisions).values({
      id: missingDraftVersionRevisionId,
      entityType: "content",
      entityId: contentId,
      locale: "en",
      versionNumber: 4,
      status: "draft",
      snapshot: {
        kind: "content_blocks_v1",
        title: "Synthetic invalid legacy snapshot",
        excerpt: null,
        document: { version: 1, blocks: [] },
        expectedEditorDocumentVersion: 5,
      },
      createdByUserId: actorId,
    });
    await db().insert(companyFacts).values({
      id: companyFactId,
      factKey: "synthetic_fact_key",
      subject: "Synthetic subject",
      statement: "SYNTHETIC TEST DATA — NOT A CWT FACT",
      relationshipToCwt: "Synthetic relationship",
      evidenceReference: "SYNTHETIC PRIVATE EVIDENCE LOCATION",
      publicUseAllowed: true,
      verificationStatus: "verified",
      verifiedByUserId: actorId,
      verifiedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await db().insert(routes).values([
      { id: sourceRouteId, path: "/synthetic-private-source-slug", entityType: "content", entityId: contentId, locale: "en", isCurrent: true },
      { id: destinationRouteOne, path: "/synthetic-private-destination-one", entityType: "content", entityId: randomUUID(), locale: "en", isCurrent: true },
      { id: destinationRouteTwo, path: "/synthetic-private-destination-two", entityType: "content", entityId: randomUUID(), locale: "en", isCurrent: true },
    ]);
    await db().insert(internalLinkRelations).values([
      { id: linkOne, sourceRouteId, destinationRouteId: destinationRouteOne, anchorText: "Synthetic link one", status: "approved" },
      { id: linkTwo, sourceRouteId, destinationRouteId: destinationRouteTwo, anchorText: "Synthetic link two", status: "suggested" },
    ]);
  });

  afterAll(async () => {
    await client?.end();
  });

  it("uses direct edit version and Revision snapshot draftVersion, never lineage version", async () => {
    const directCommand = fabricCommand();
    const directAssociation = prepareDraftAssociationV1(directCommand.target);
    if (!directAssociation.ok) throw new Error("Direct association fixture failed.");
    const direct = await withReadOnlyDraftAvailabilityScope(db(), (scope) =>
      reader.readTargetSnapshot({ scope, actor, command: directCommand, association: directAssociation.value }));
    expect(direct).toMatchObject({ ok: true, value: { editVersion: 5, revisionId: null } });

    const revisionCommand = fabricCommand({
      type: "editorial_revision",
      revisionId,
      expectedVersion: 4,
    });
    const revisionAssociation = prepareDraftAssociationV1(revisionCommand.target);
    if (!revisionAssociation.ok) throw new Error("Revision association fixture failed.");
    const revision = await withReadOnlyDraftAvailabilityScope(db(), (scope) =>
      reader.readTargetSnapshot({ scope, actor, command: revisionCommand, association: revisionAssociation.value }));
    expect(revision).toMatchObject({ ok: true, value: { editVersion: 4, revisionId } });

    const lineageCommand = fabricCommand({
      type: "editorial_revision",
      revisionId,
      expectedVersion: 77,
    });
    const lineageAssociation = prepareDraftAssociationV1(lineageCommand.target);
    if (!lineageAssociation.ok) throw new Error("Lineage association fixture failed.");
    const lineage = await withReadOnlyDraftAvailabilityScope(db(), (scope) =>
      reader.readTargetSnapshot({ scope, actor, command: lineageCommand, association: lineageAssociation.value }));
    expect(lineage).toMatchObject({ ok: false, error: { code: "target_version_conflict" } });

    const missingCommand = fabricCommand({
      type: "editorial_revision",
      revisionId: missingDraftVersionRevisionId,
      expectedVersion: 4,
    });
    const missingAssociation = prepareDraftAssociationV1(missingCommand.target);
    if (!missingAssociation.ok) throw new Error("Missing-version association fixture failed.");
    const missing = await withReadOnlyDraftAvailabilityScope(db(), (scope) =>
      reader.readTargetSnapshot({ scope, actor, command: missingCommand, association: missingAssociation.value }));
    expect(missing).toMatchObject({ ok: false, error: { code: "context_provenance_mismatch" } });
  });

  it("uses the exact Content Revision snapshot after live localization drift", async () => {
    await db().update(contentLocalizations).set({
      title: "SYNTHETIC LIVE DRIFT TITLE",
      excerpt: "SYNTHETIC LIVE DRIFT EXCERPT",
      structuredBlocks: { version: 1, blocks: [{
        id: "live-drift",
        type: "paragraph",
        text: "SYNTHETIC LIVE DRIFT NARRATIVE",
      }] },
      editorDocumentVersion: 6,
    }).where(eq(contentLocalizations.contentId, contentId));
    const command = fabricCommand({ type: "editorial_revision", revisionId, expectedVersion: 4 });
    const association = prepareDraftAssociationV1(command.target);
    if (!association.ok) throw new Error("Revision drift association fixture failed.");
    const result = await withReadOnlyDraftAvailabilityScope(db(), async (scope) => {
      const target = await reader.readTargetSnapshot({ scope, actor, command, association: association.value });
      return target.ok ? reader.readSelectedFabricContext({
        scope,
        actor,
        command,
        target: target.value,
        selector: {
          sourceClass: "fabric_knowledge",
          sourceId: contentId,
          fields: ["title", "excerpt", "narrativeText"],
        },
      }) : target;
    });
    expect(result).toMatchObject({
      ok: true,
      value: {
        recordVersion: 4,
        authoritativeRecordVersion: 4,
        fields: [
          { field: "title", value: "Synthetic Content Revision Snapshot" },
          { field: "excerpt", value: "Synthetic revision excerpt" },
          { field: "narrativeText", value: "SYNTHETIC REVISION SNAPSHOT NARRATIVE" },
        ],
      },
    });
    expect(JSON.stringify(result)).not.toContain("SYNTHETIC LIVE DRIFT");
  });

  it("projects Fabric narrative from structured Blocks and only four public Company Fact fields", async () => {
    const command = fabricCommand();
    const association = prepareDraftAssociationV1(command.target);
    if (!association.ok) throw new Error("Content association fixture failed.");
    const result = await withReadOnlyDraftAvailabilityScope(db(), async (scope) => {
      const target = await reader.readTargetSnapshot({ scope, actor, command, association: association.value });
      if (!target.ok) return target;
      const fabric = await reader.readSelectedFabricContext({
        scope,
        actor,
        command,
        target: target.value,
        selector: {
          sourceClass: "fabric_knowledge",
          sourceId: contentId,
          fields: ["title", "excerpt", "narrativeText"],
        },
      });
      const fact = await reader.readSelectedPublicCompanyFact({
        scope,
        actor,
        command,
        target: target.value,
        selector: {
          sourceClass: "public_company_fact",
          sourceId: companyFactId,
          fields: ["factKey", "subject", "statement", "relationshipToCwt"],
        },
      });
      return { fabric, fact };
    });
    if ("ok" in result) throw new Error(`Target fixture failed: ${result.error.code}`);
    expect(result.fabric).toMatchObject({
      ok: true,
      value: { fields: [{ field: "title" }, { field: "excerpt" }, { field: "narrativeText" }] },
    });
    expect(JSON.stringify(result.fabric)).toContain("SYNTHETIC STRUCTURED BLOCK NARRATIVE");
    expect(JSON.stringify(result.fabric)).not.toContain("SYNTHETIC LEGACY BODY MUST NEVER BE READ");
    expect(result.fact).toMatchObject({
      ok: true,
      value: { fields: [
        { field: "factKey" },
        { field: "subject" },
        { field: "statement" },
        { field: "relationshipToCwt" },
      ] },
    });
    expect(JSON.stringify(result.fact)).not.toContain("SYNTHETIC PRIVATE EVIDENCE LOCATION");
  });

  it("reuses the complete current public Company Fact predicate", async () => {
    const command = fabricCommand();
    const association = prepareDraftAssociationV1(command.target);
    if (!association.ok) throw new Error("Company Fact association fixture failed.");
    const read = () => withReadOnlyDraftAvailabilityScope(db(), async (scope) => {
      const target = await reader.readTargetSnapshot({ scope, actor, command, association: association.value });
      return target.ok ? reader.readSelectedPublicCompanyFact({
        scope,
        actor,
        command,
        target: target.value,
        selector: {
          sourceClass: "public_company_fact",
          sourceId: companyFactId,
          fields: ["factKey", "subject", "statement", "relationshipToCwt"],
        },
      }) : target;
    });
    expect(await read()).toMatchObject({ ok: true });
    const canonical = {
      evidenceReference: "SYNTHETIC PRIVATE EVIDENCE LOCATION",
      publicUseAllowed: true,
      verificationStatus: "verified" as const,
      verifiedByUserId: actorId,
      verifiedAt: new Date("2026-01-01T00:00:00.000Z"),
      reviewAfter: null,
    };
    const invalidStates = [
      { reviewAfter: new Date("2020-01-01T00:00:00.000Z") },
      { evidenceReference: "   " },
      { verifiedByUserId: null },
      { verifiedAt: null },
      { publicUseAllowed: false },
      { verificationStatus: "provided" as const },
    ];
    for (const invalid of invalidStates) {
      await db().update(companyFacts).set({ ...canonical, ...invalid }).where(eq(companyFacts.id, companyFactId));
      expect(await read()).toMatchObject({
        ok: false,
        error: { code: "context_record_unauthorized" },
      });
    }
  });

  it("keeps selected-link order as opaque aliases and fails on route/authorization races", async () => {
    const command = seoCommand([linkTwo, linkOne]);
    const association = prepareDraftAssociationV1(command.target);
    if (!association.ok) throw new Error("SEO association fixture failed.");
    const links = await withReadOnlyDraftAvailabilityScope(db(), async (scope) => {
      const target = await reader.readTargetSnapshot({ scope, actor, command, association: association.value });
      return target.ok
        ? reader.readSelectedInternalLinks({
            scope,
            actor,
            command,
            target: target.value,
            selectedLinkIds: [linkTwo, linkOne],
          })
        : target;
    });
    expect(links).toEqual({
      ok: true,
      value: [
        { candidateRef: "link_01", label: "Synthetic link two" },
        { candidateRef: "link_02", label: "Synthetic link one" },
      ],
    });
    const serialized = JSON.stringify(links);
    expect(serialized).not.toContain(linkOne);
    expect(serialized).not.toContain(linkTwo);
    expect(serialized).not.toContain("/synthetic-private-");

    await db().update(routes).set({ isCurrent: false }).where(eq(routes.id, sourceRouteId));
    const staleRoute = await withReadOnlyDraftAvailabilityScope(db(), async (scope) => {
      const target = await reader.readTargetSnapshot({ scope, actor, command, association: association.value });
      return target.ok
        ? reader.readSelectedInternalLinks({
            scope,
            actor,
            command,
            target: target.value,
            selectedLinkIds: [linkOne],
          })
        : target;
    });
    expect(staleRoute).toMatchObject({ ok: false, error: { code: "context_record_unauthorized" } });

    await db().update(users).set({ role: "product_editor" }).where(eq(users.id, actorId));
    const changedRole = await withReadOnlyDraftAvailabilityScope(db(), (scope) =>
      reader.readTargetSnapshot({ scope, actor, command, association: association.value }));
    expect(changedRole).toMatchObject({ ok: false, error: { code: "authorization_denied" } });
  });
});
