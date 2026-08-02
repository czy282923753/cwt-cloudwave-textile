import { randomUUID } from "node:crypto";

import { and, count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import { AuditWriteError } from "../src/audit/service";
import {
  applyProductRevision,
  ProductRevisionConflictError,
} from "../src/catalog/product-service";
import {
  createInquiry,
  InquiryIdempotencyConflictError,
} from "../src/crm/inquiry-service";
import * as schema from "../src/db/schema";
import {
  assets,
  auditLogs,
  editorialRevisions,
  inquiries,
  productLocalizations,
  products,
  productTaxonomyTerms,
  routes,
  seoMetadata,
  taxonomyTerms,
  users,
} from "../src/db/schema";
import { migratePostgresWithEnumCompatibility } from "../src/db/postgres-enum-migration-compatibility";
import type { EmailNotifier, InquiryNotification } from "../src/integrations/email";
import { changeEntityRoute, createRedirect } from "../src/seo/redirects";

type Evidence = {
  scenario: string;
  result: "passed";
  detail: string;
};

const databasePrefix = `cwt_joint_remediation_${process.pid}`;

class ValidationNotifier implements EmailNotifier {
  async notifyInquiry(input: InquiryNotification, deliveryKey?: string): Promise<void> {
    void input;
    void deliveryKey;
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function sqlState(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== "object" || current === null) return undefined;
    if ("code" in current && typeof current.code === "string") return current.code;
    current = "cause" in current ? current.cause : undefined;
  }
  return undefined;
}

function requireValidationUrl(): URL {
  if (
    process.env.APP_ENV === "production" ||
    process.env.DATABASE_DRIVER !== "postgres" ||
    process.env.CWT_POSTGRES_JOINT_REMEDIATION_VALIDATION !== "isolated-test-database"
  ) {
    throw new Error(
      "Joint remediation validation requires an isolated non-production PostgreSQL server.",
    );
  }
  const rawUrl = process.env.DATABASE_URL ?? "";
  const url = new URL(rawUrl);
  if (!url.pathname || url.pathname === "/") {
    throw new Error("A PostgreSQL administrative database is required.");
  }
  return url;
}

function quotedIdentifier(value: string): string {
  if (!/^cwt_joint_remediation_[0-9]+$/.test(value)) {
    throw new Error("Unsafe validation database identifier refused.");
  }
  return `"${value}"`;
}

function databaseUrl(baseUrl: URL, databaseName: string): string {
  const result = new URL(baseUrl);
  result.pathname = `/${databaseName}`;
  return result.toString();
}

async function waitForBlocking(client: Sql, blockedPid: number): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const rows = await client<{ blocked: boolean }[]>`
      select cardinality(pg_blocking_pids(${blockedPid})) > 0 as blocked
    `;
    if (rows[0]?.blocked) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Expected PostgreSQL lock wait was not observed.");
}

function createBarrier(participants: number): () => Promise<void> {
  let arrived = 0;
  let release: (() => void) | undefined;
  const allArrived = new Promise<void>((resolve) => {
    release = resolve;
  });
  return async () => {
    arrived += 1;
    if (arrived === participants) release?.();
    await allArrived;
  };
}

async function validateRedirectFinalState(databaseUrlValue: string): Promise<Evidence[]> {
  const evidence: Evidence[] = [];
  const mainClient = postgres(databaseUrlValue, { max: 1, prepare: false });
  const db = drizzle(mainClient, { schema });
  try {
    const actorRows = await db
      .insert(users)
      .values({
        email: "stage2c-redirect-admin@example.test",
        displayName: "TEST Redirect Administrator",
        role: "admin",
        passwordHash: "test-only",
      })
      .returning({ id: users.id });
    const actor = { userId: actorRows[0]!.id, role: "admin" as const };

    const directEntityId = randomUUID();
    await db.insert(routes).values({
      path: "/pg-final-direct-y/",
      entityType: "content",
      entityId: directEntityId,
    });
    await createRedirect(db, {
      sourcePath: "/pg-final-direct-x/",
      destinationPath: "/pg-final-direct-y/",
      reason: "TEST direct final-state validation",
      actor,
    });
    let directFailure: unknown;
    try {
      await mainClient.begin(async (transaction) => {
        await transaction`
          update routes set path = '/pg-final-direct-z/'
          where entity_id = ${directEntityId}::uuid and is_current = true
        `;
        await transaction`
          insert into audit_logs (action, entity_type, entity_id)
          values ('test.pg.direct_route.changed', 'content', ${directEntityId}::uuid)
        `;
      });
    } catch (error) {
      directFailure = error;
    }
    assert(sqlState(directFailure) === "23514", "Dangling direct Route move did not fail closed.");
    const directState = await mainClient<{
      route_path: string;
      destination_path: string;
      audit_count: string;
    }[]>`
      select
        route.path as route_path,
        redirect.destination_path,
        (select count(*)::text from audit_logs where action = 'test.pg.direct_route.changed') as audit_count
      from routes as route
      join redirects as redirect on redirect.source_path = '/pg-final-direct-x/'
      where route.entity_id = ${directEntityId}::uuid and route.is_current = true
    `;
    assert(
      directState[0]?.route_path === "/pg-final-direct-y/" &&
        directState[0]?.destination_path === "/pg-final-direct-y/" &&
        directState[0]?.audit_count === "0",
      "Direct Route failure left partial Route, Redirect, or Audit state.",
    );
    evidence.push({
      scenario: "D01 direct Route move leaves an inbound Redirect dangling",
      result: "passed",
      detail: "COMMIT rejected with SQLSTATE 23514; Route, Redirect, and Audit rolled back.",
    });

    const legalEntityId = randomUUID();
    const legalRouteRows = await db
      .insert(routes)
      .values({ path: "/pg-final-legal-y/", entityType: "content", entityId: legalEntityId })
      .returning({ id: routes.id });
    await db.insert(seoMetadata).values({
      routeId: legalRouteRows[0]!.id,
      canonicalPath: "/pg-final-legal-y/",
    });
    await createRedirect(db, {
      sourcePath: "/pg-final-legal-x/",
      destinationPath: "/pg-final-legal-y/",
      reason: "TEST legal inbound Redirect",
      actor,
    });
    await changeEntityRoute(db, {
      entityType: "content",
      entityId: legalEntityId,
      locale: "en",
      newPath: "/pg-final-legal-z/",
      reason: "TEST legal final-state move",
      actor,
    });
    const legalGraph = await mainClient<{ source_path: string; destination_path: string }[]>`
      select source_path, destination_path
      from redirects
      where source_path in ('/pg-final-legal-x/', '/pg-final-legal-y/')
      order by source_path
    `;
    assert(
      JSON.stringify(legalGraph) ===
        JSON.stringify([
          { source_path: "/pg-final-legal-x/", destination_path: "/pg-final-legal-z/" },
          { source_path: "/pg-final-legal-y/", destination_path: "/pg-final-legal-z/" },
        ]),
      "Legal Route move did not flatten its final Redirect graph.",
    );
    evidence.push({
      scenario: "D01 legal Route move and inbound flattening",
      result: "passed",
      detail: "Deferred validation accepted final X→Z and Y→Z state.",
    });

    const concurrentEntityId = randomUUID();
    const concurrentRouteRows = await db
      .insert(routes)
      .values({
        path: "/pg-final-concurrent-y/",
        entityType: "content",
        entityId: concurrentEntityId,
      })
      .returning({ id: routes.id });
    await db.insert(seoMetadata).values({
      routeId: concurrentRouteRows[0]!.id,
      canonicalPath: "/pg-final-concurrent-y/",
    });
    const holder = postgres(databaseUrlValue, { max: 1, prepare: false });
    const mover = postgres(databaseUrlValue, { max: 1, prepare: false });
    const moverDb = drizzle(mover, { schema });
    let releaseHolder: (() => void) | undefined;
    let markHolderReady: (() => void) | undefined;
    const holderRelease = new Promise<void>((resolve) => {
      releaseHolder = resolve;
    });
    const holderReady = new Promise<void>((resolve) => {
      markHolderReady = resolve;
    });
    try {
      const moverPidRows = await mover<{ pid: number }[]>`select pg_backend_pid() as pid`;
      const moverPid = moverPidRows[0]?.pid;
      assert(moverPid, "Mover Backend PID was unavailable.");
      const heldRedirect = holder.begin(async (transaction) => {
        await transaction`
          insert into redirects (source_path, destination_path, reason, created_by_user_id)
          values (
            '/pg-final-concurrent-x/',
            '/pg-final-concurrent-y/',
            'TEST held concurrent Redirect',
            ${actor.userId}::uuid
          )
        `;
        markHolderReady?.();
        await holderRelease;
      });
      await holderReady;
      const routeMove = changeEntityRoute(moverDb, {
        entityType: "content",
        entityId: concurrentEntityId,
        locale: "en",
        newPath: "/pg-final-concurrent-z/",
        reason: "TEST concurrent closure retry",
        actor,
      });
      await waitForBlocking(mainClient, moverPid);
      releaseHolder?.();
      await Promise.all([heldRedirect, routeMove]);
    } finally {
      releaseHolder?.();
      await holder.end();
      await mover.end();
    }
    const concurrentGraph = await mainClient<{ source_path: string; destination_path: string }[]>`
      select source_path, destination_path
      from redirects
      where source_path in ('/pg-final-concurrent-x/', '/pg-final-concurrent-y/')
      order by source_path
    `;
    assert(
      concurrentGraph.length === 2 &&
        concurrentGraph.every((edge) => edge.destination_path === "/pg-final-concurrent-z/"),
      "Concurrent Route closure did not converge to a flattened graph.",
    );
    evidence.push({
      scenario: "D01 concurrent inbound Redirect and Route move",
      result: "passed",
      detail: "Observed a real advisory-lock wait; bounded closure retry converged without a lost edge.",
    });

    const reciprocalX = randomUUID();
    const reciprocalY = randomUUID();
    await db.insert(routes).values([
      { path: "/pg-reciprocal-x/", entityType: "content", entityId: reciprocalX },
      { path: "/pg-reciprocal-y/", entityType: "content", entityId: reciprocalY },
    ]);
    const reciprocalA = postgres(databaseUrlValue, { max: 1, prepare: false });
    const reciprocalB = postgres(databaseUrlValue, { max: 1, prepare: false });
    const reciprocalBarrier = createBarrier(2);
    try {
      const result = await Promise.allSettled([
        reciprocalA.begin(async (transaction) => {
          await transaction`
            update routes set path = '/pg-reciprocal-x-new/'
            where entity_id = ${reciprocalX}::uuid and is_current = true
          `;
          await reciprocalBarrier();
          await transaction`
            insert into redirects (source_path, destination_path, reason)
            values ('/pg-reciprocal-x/', '/pg-reciprocal-y/', 'TEST reciprocal A')
          `;
        }),
        reciprocalB.begin(async (transaction) => {
          await transaction`
            update routes set path = '/pg-reciprocal-y-new/'
            where entity_id = ${reciprocalY}::uuid and is_current = true
          `;
          await reciprocalBarrier();
          await transaction`
            insert into redirects (source_path, destination_path, reason)
            values ('/pg-reciprocal-y/', '/pg-reciprocal-x/', 'TEST reciprocal B')
          `;
        }),
      ]);
      const fulfilled = result.filter((item) => item.status === "fulfilled");
      const rejected = result.filter((item) => item.status === "rejected");
      assert(fulfilled.length === 1 && rejected.length === 1, "Reciprocal race was not serialized.");
      assert(
        rejected[0]?.status === "rejected" && sqlState(rejected[0].reason) === "40P01",
        "Reciprocal direct-SQL loser did not receive PostgreSQL deadlock protection.",
      );
    } finally {
      await reciprocalA.end();
      await reciprocalB.end();
    }
    const invalidEdges = await mainClient<{ count: string }[]>`
      select count(*)::text as count
      from redirects as candidate
      where candidate.is_active = true and (
        exists (
          select 1 from routes as source_route
          where source_route.path = candidate.source_path and source_route.is_current = true
        )
        or not exists (
          select 1 from routes as destination_route
          where destination_route.path = candidate.destination_path and destination_route.is_current = true
        )
        or exists (
          select 1 from redirects as downstream
          where downstream.source_path = candidate.destination_path and downstream.is_active = true
        )
      )
    `;
    assert(invalidEdges[0]?.count === "0", "Reciprocal race committed an invalid graph.");
    evidence.push({
      scenario: "D01 reciprocal direct-SQL race",
      result: "passed",
      detail: "PostgreSQL aborted one adversarial writer with 40P01; the committed graph remained valid.",
    });
  } finally {
    await mainClient.end();
  }
  return evidence;
}

async function validateInquiryIdempotency(databaseUrlValue: string): Promise<Evidence[]> {
  const evidence: Evidence[] = [];
  const firstClient = postgres(databaseUrlValue, { max: 1, prepare: false });
  const secondClient = postgres(databaseUrlValue, { max: 1, prepare: false });
  const inspectionClient = postgres(databaseUrlValue, { max: 1, prepare: false });
  const firstDb = drizzle(firstClient, { schema });
  const secondDb = drizzle(secondClient, { schema });
  const inspectionDb = drizzle(inspectionClient, { schema });
  const notifier = new ValidationNotifier();
  try {
    const assetRows = await inspectionDb
      .insert(assets)
      .values({
        originalFileName: "TEST frozen request attachment.png",
        storageProvider: "test",
        storagePartition: "private",
        objectKey: `inquiry-validation/${randomUUID()}.png`,
        access: "private",
        category: "inquiry",
        status: "ready",
        declaredMimeType: "image/png",
        detectedMimeType: "image/png",
        byteSize: 4,
        sha256: "a".repeat(64),
        scanStatus: "passed",
      })
      .returning({ id: assets.id });
    const assetId = assetRows[0]!.id;
    const input = {
      idempotencyKey: "stage2c-joint-same-request",
      name: "TEST Concurrent Inquiry Buyer",
      email: "stage2c-joint-inquiry@example.test",
      description: "A frozen attachment request.",
      assetIds: [assetId],
      sourcePagePath: "/get-quote/",
      landingPagePath: "/get-quote/",
      utmSource: "joint-remediation",
      attributionConfidence: "high" as const,
    };
    const sameResults = await Promise.all([
      createInquiry(firstDb, notifier, input),
      createInquiry(secondDb, notifier, input),
    ]);
    assert(
      sameResults[0].inquiryId === sameResults[1].inquiryId &&
        sameResults.filter((result) => result.replayed).length === 1,
      "Same-fingerprint Inquiry race did not converge to one replayable record.",
    );
    const inquiryId = sameResults[0].inquiryId;
    const sideEffects = await inspectionClient<{
      inquiries: string;
      contacts: string;
      attachments: string;
      history: string;
      outbox: string;
      audits: string;
    }[]>`
      select
        (select count(*)::text from inquiries where idempotency_key = ${input.idempotencyKey}) as inquiries,
        (select count(*)::text from contacts where normalized_email = ${input.email}) as contacts,
        (select count(*)::text from inquiry_assets where inquiry_id = ${inquiryId}::uuid) as attachments,
        (select count(*)::text from inquiry_status_history where inquiry_id = ${inquiryId}::uuid) as history,
        (select count(*)::text from notification_outbox where aggregate_id = ${inquiryId}::uuid) as outbox,
        (select count(*)::text from audit_logs where action = 'inquiry.created' and entity_id = ${inquiryId}::uuid) as audits
    `;
    assert(
      sideEffects[0] && Object.values(sideEffects[0]).every((value) => value === "1"),
      "Inquiry replay duplicated or omitted a governed side effect.",
    );
    evidence.push({
      scenario: "D02 same frozen attachment request on two Backends",
      result: "passed",
      detail: "One create and one replay; Inquiry, Contact, attachment relation, History, Outbox, and Audit each equal 1.",
    });

    const conflictingInput = {
      ...input,
      idempotencyKey: "stage2c-joint-conflicting-request",
      email: "stage2c-joint-conflict@example.test",
    };
    const conflictingResults = await Promise.allSettled([
      createInquiry(firstDb, notifier, {
        ...conflictingInput,
        description: "Conflicting payload A",
      }),
      createInquiry(secondDb, notifier, {
        ...conflictingInput,
        description: "Conflicting payload B",
      }),
    ]);
    const fulfilled = conflictingResults.filter((item) => item.status === "fulfilled");
    const rejected = conflictingResults.filter((item) => item.status === "rejected");
    assert(fulfilled.length === 1 && rejected.length === 1, "Conflicting Inquiry race was not serialized.");
    assert(
      rejected[0]?.status === "rejected" &&
        rejected[0].reason instanceof InquiryIdempotencyConflictError,
      "Conflicting Inquiry race did not return the typed conflict.",
    );
    const conflictCount = await inspectionDb
      .select({ value: count() })
      .from(inquiries)
      .where(eq(inquiries.idempotencyKey, conflictingInput.idempotencyKey));
    assert(Number(conflictCount[0]?.value) === 1, "Conflicting Inquiry race created duplicates.");
    evidence.push({
      scenario: "D02 different fingerprints with one Idempotency Key",
      result: "passed",
      detail: "Exactly one request committed; the other received InquiryIdempotencyConflictError.",
    });
  } finally {
    await firstClient.end();
    await secondClient.end();
    await inspectionClient.end();
  }
  return evidence;
}

async function validateProductRevisionOwnership(databaseUrlValue: string): Promise<Evidence[]> {
  const evidence: Evidence[] = [];
  const firstClient = postgres(databaseUrlValue, { max: 1, prepare: false });
  const secondClient = postgres(databaseUrlValue, { max: 1, prepare: false });
  const inspectionClient = postgres(databaseUrlValue, { max: 1, prepare: false });
  const firstDb = drizzle(firstClient, { schema });
  const secondDb = drizzle(secondClient, { schema });
  const inspectionDb = drizzle(inspectionClient, { schema });
  try {
    const reviewerRows = await inspectionDb
      .insert(users)
      .values([
        {
          email: "stage2c-reviewer-a@example.test",
          displayName: "TEST Reviewer A",
          role: "reviewer_publisher",
          passwordHash: "test-only",
        },
        {
          email: "stage2c-reviewer-b@example.test",
          displayName: "TEST Reviewer B",
          role: "reviewer_publisher",
          passwordHash: "test-only",
        },
      ])
      .returning({ id: users.id });
    const taxonomyRows = await inspectionDb
      .insert(taxonomyTerms)
      .values({ internalKey: "stage2c-revision-category", dimension: "material_fiber" })
      .returning({ id: taxonomyTerms.id });
    const productId = await inspectionDb.transaction(async (transaction) => {
      const productRows = await transaction
        .insert(products)
        .values({ status: "draft" })
        .returning({ id: products.id });
      const createdProductId = productRows[0]!.id;
      await transaction.insert(productTaxonomyTerms).values({
        productId: createdProductId,
        taxonomyTermId: taxonomyRows[0]!.id,
        isPrimary: true,
      });
      return createdProductId;
    });
    await inspectionDb.insert(productLocalizations).values({
      productId,
      locale: "en",
      name: "TEST Original Product",
    });
    const revisionRows = await inspectionDb
      .insert(editorialRevisions)
      .values({
        entityType: "product",
        entityId: productId,
        locale: "en",
        versionNumber: 1,
        status: "in_review",
        snapshot: {
          kind: "editorial_copy",
          name: "TEST Applied Product",
          shortDescription: null,
          fullDescription: null,
        },
      })
      .returning({ id: editorialRevisions.id });
    const revisionId = revisionRows[0]!.id;
    const actors = reviewerRows.map((row) => ({
      userId: row.id,
      role: "reviewer_publisher" as const,
    }));
    const results = await Promise.allSettled([
      applyProductRevision(firstDb, actors[0]!, revisionId),
      applyProductRevision(secondDb, actors[1]!, revisionId),
    ]);
    const winnerIndex = results.findIndex((item) => item.status === "fulfilled");
    const rejected = results.find((item) => item.status === "rejected");
    assert(winnerIndex >= 0 && rejected?.status === "rejected", "Product revision did not have one winner.");
    assert(
      rejected.reason instanceof ProductRevisionConflictError,
      "Losing Product reviewer did not receive the typed CAS conflict.",
    );
    await applyProductRevision(
      winnerIndex === 0 ? firstDb : secondDb,
      actors[winnerIndex]!,
      revisionId,
    );
    const revisionState = await inspectionDb
      .select({ status: editorialRevisions.status, reviewerId: editorialRevisions.reviewedByUserId })
      .from(editorialRevisions)
      .where(eq(editorialRevisions.id, revisionId));
    const appliedAudits = await inspectionDb
      .select({ value: count() })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, "product.revision.applied"),
          eq(auditLogs.entityId, revisionId),
        ),
      );
    const localizations = await inspectionDb
      .select({ name: productLocalizations.name })
      .from(productLocalizations)
      .where(eq(productLocalizations.productId, productId));
    assert(
      revisionState[0]?.status === "applied" &&
        revisionState[0]?.reviewerId === actors[winnerIndex]!.userId &&
        Number(appliedAudits[0]?.value) === 1 &&
        localizations.length === 1 &&
        localizations[0]?.name === "TEST Applied Product",
      "Product revision ownership or side effects were duplicated.",
    );

    const auditFailureRevisionRows = await inspectionDb
      .insert(editorialRevisions)
      .values({
        entityType: "product",
        entityId: productId,
        locale: "en",
        versionNumber: 2,
        status: "in_review",
        snapshot: {
          kind: "editorial_copy",
          name: "TEST Must Roll Back",
          shortDescription: null,
          fullDescription: null,
        },
      })
      .returning({ id: editorialRevisions.id });
    let auditFailure: unknown;
    try {
      await applyProductRevision(firstDb, actors[0]!, auditFailureRevisionRows[0]!.id, {
        auditWriter: async () => {
          throw new AuditWriteError();
        },
      });
    } catch (error) {
      auditFailure = error;
    }
    assert(auditFailure instanceof AuditWriteError, "Audit failure injection did not propagate.");
    const auditFailureRevision = await inspectionDb
      .select({ status: editorialRevisions.status })
      .from(editorialRevisions)
      .where(eq(editorialRevisions.id, auditFailureRevisionRows[0]!.id));
    const localizationAfterFailure = await inspectionDb
      .select({ name: productLocalizations.name })
      .from(productLocalizations)
      .where(eq(productLocalizations.productId, productId));
    assert(
      auditFailureRevision[0]?.status === "in_review" &&
        localizationAfterFailure[0]?.name === "TEST Applied Product",
      "Audit failure did not roll back Product revision ownership and snapshot.",
    );
    evidence.push({
      scenario: "D03 Product revision single Apply owner",
      result: "passed",
      detail: "One reviewer won, loser received a CAS conflict, winner replay was idempotent, one Audit persisted, and Audit failure rolled back.",
    });
  } finally {
    await firstClient.end();
    await secondClient.end();
    await inspectionClient.end();
  }
  return evidence;
}

async function main(): Promise<void> {
  const baseUrl = requireValidationUrl();
  const admin = postgres(baseUrl.toString(), { max: 1, prepare: false });
  const name = databasePrefix;
  const url = databaseUrl(baseUrl, name);
  const evidence: Evidence[] = [];
  try {
    await admin.unsafe(`create database ${quotedIdentifier(name)}`);
    const migrationClient = postgres(url, { max: 1, prepare: false });
    try {
      await migratePostgresWithEnumCompatibility(migrationClient, "drizzle");
    } finally {
      await migrationClient.end();
    }
    evidence.push(...await validateRedirectFinalState(url));
    evidence.push(...await validateInquiryIdempotency(url));
    evidence.push(...await validateProductRevisionOwnership(url));

    const inspection = postgres(url, { max: 1, prepare: false });
    try {
      const locks = await inspection<{ count: string }[]>`
        select count(*)::text as count
        from pg_locks
        where locktype = 'advisory'
          and database = (select oid from pg_database where datname = current_database())
      `;
      const idleTransactions = await inspection<{ count: string }[]>`
        select count(*)::text as count
        from pg_stat_activity
        where datname = current_database()
          and state = 'idle in transaction'
      `;
      assert(locks[0]?.count === "0", "Validation left advisory locks behind.");
      assert(idleTransactions[0]?.count === "0", "Validation left idle transactions behind.");
      evidence.push({
        scenario: "Cross-scenario lock and transaction residue",
        result: "passed",
        detail: "Advisory locks = 0; idle in transaction = 0.",
      });
      const versionRows = await inspection<{ version: string }[]>`
        select current_setting('server_version') as version
      `;
      process.stdout.write(`${JSON.stringify({
        status: "passed",
        postgresVersion: versionRows[0]?.version,
        scope: "new disposable synthetic validation database",
        evidence,
      }, null, 2)}\n`);
    } finally {
      await inspection.end();
    }
  } finally {
    await admin.unsafe(
      "select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()",
      [name],
    );
    await admin.unsafe(`drop database if exists ${quotedIdentifier(name)} with (force)`);
    await admin.end();
  }
}

void main();
