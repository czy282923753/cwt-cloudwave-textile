import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { migrateDatabase } from "./migrate";
import { createTestDatabase } from "@/test/database";
import * as schema from "@/db/schema";
import {
  contacts,
  customerActivities,
  inquiries,
  productTaxonomyTerms,
  products,
  redirects,
  routes,
  taxonomyTerms,
  users,
} from "@/db/schema";

describe("database migrations", () => {
  it("creates the complete schema and is safe to run repeatedly", async () => {
    const connection = await createTestDatabase();
    await migrateDatabase(connection);
    const result = await connection.db.execute<{ table_name: string }>(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
    `);
    const names = result.rows.map((row) => row.table_name);
    expect(names).toContain("products");
    expect(names).toContain("assets");
    expect(names).toContain("inquiries");
    expect(names).toContain("audit_logs");
    await connection.close();
  });

  it("enforces primary taxonomy, CRM contact, owner, and route/redirect invariants", async () => {
    const connection = await createTestDatabase();
    const taxonomyRows = await connection.db
      .insert(taxonomyTerms)
      .values([
        { internalKey: "constraint-primary", dimension: "material_fiber" },
        { internalKey: "constraint-additional", dimension: "structure_construction" },
      ])
      .returning({ id: taxonomyTerms.id });
    const primaryId = taxonomyRows[0]?.id;
    const additionalId = taxonomyRows[1]?.id;
    if (!primaryId || !additionalId) throw new Error("Missing taxonomy fixtures.");
    const productId = await connection.db.transaction(async (transaction) => {
      const rows = await transaction
        .insert(products)
        .values({ status: "draft" })
        .returning({ id: products.id });
      const id = rows[0]!.id;
      await transaction.insert(productTaxonomyTerms).values({
        productId: id,
        taxonomyTermId: primaryId,
        isPrimary: true,
      });
      return id;
    });
    await expect(
      connection.db.insert(productTaxonomyTerms).values({
        productId,
        taxonomyTermId: additionalId,
        isPrimary: true,
      }),
    ).rejects.toThrow();

    const contactRows = await connection.db
      .insert(contacts)
      .values([
        { name: "Contact A", email: "constraint-a@example.test", normalizedEmail: "constraint-a@example.test" },
        { name: "Contact B", email: "constraint-b@example.test", normalizedEmail: "constraint-b@example.test" },
      ])
      .returning({ id: contacts.id });
    const contactA = contactRows[0]!.id;
    const contactB = contactRows[1]!.id;
    const inquiryRows = await connection.db
      .insert(inquiries)
      .values({
        contactId: contactA,
        submittedName: "Contact A",
        submittedEmail: "constraint-a@example.test",
        idempotencyKey: "constraint-inquiry",
        sourcePagePath: "/get-quote/",
      })
      .returning({ id: inquiries.id });
    const inquiryId = inquiryRows[0]!.id;
    await expect(
      connection.db.insert(customerActivities).values({
        inquiryId,
        contactId: contactB,
        type: "note",
        direction: "internal",
        content: "Mismatched Contact",
      }),
    ).rejects.toThrow(/contact/i);
    const editorRows = await connection.db
      .insert(users)
      .values({ email: "constraint-editor@example.test", displayName: "Editor", role: "content_editor", passwordHash: "test" })
      .returning({ id: users.id });
    await expect(
      connection.db
        .update(inquiries)
        .set({ ownerUserId: editorRows[0]!.id })
        .where(eq(inquiries.id, inquiryId)),
    ).rejects.toThrow(/owner/i);

    await connection.db.insert(routes).values({
      path: "/constraint-destination/",
      entityType: "static_page",
    });
    await connection.db.insert(redirects).values({
      sourcePath: "/constraint-old/",
      destinationPath: "/constraint-destination/",
      reason: "Constraint test",
    });
    await expect(
      connection.db.insert(routes).values({
        path: "/constraint-old/",
        entityType: "static_page",
      }),
    ).rejects.toThrow();
    await expect(
      connection.db.insert(redirects).values({
        sourcePath: "/constraint-missing-source/",
        destinationPath: "/constraint-missing-destination/",
        reason: "Invalid destination",
      }),
    ).rejects.toThrow();
    await connection.close();
  });

  it("upgrades the pre-remediation schema without losing the authoritative primary category", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "cwt-migration-upgrade-"));
    const metaDirectory = join(temporaryRoot, "meta");
    await mkdir(metaDirectory);
    const journal = JSON.parse(
      await readFile("drizzle/meta/_journal.json", "utf8"),
    ) as { version: string; dialect: string; entries: Array<{ idx: number; tag: string }> };
    for (const entry of journal.entries.filter((item) => item.idx <= 5)) {
      await copyFile(`drizzle/${entry.tag}.sql`, join(temporaryRoot, `${entry.tag}.sql`));
    }
    await writeFile(
      join(metaDirectory, "_journal.json"),
      JSON.stringify({ ...journal, entries: journal.entries.filter((item) => item.idx <= 5) }),
    );
    const client = new PGlite("memory://");
    const connection = {
      kind: "pglite" as const,
      db: drizzle(client, { schema }),
      close: async () => client.close(),
    };
    try {
      await migrateDatabase(connection, temporaryRoot);
      await connection.db.execute(sql.raw(`
        insert into taxonomy_terms (id, internal_key, dimension)
        values
          ('11111111-1111-4111-8111-111111111111', 'upgrade-primary', 'material_fiber'),
          ('22222222-2222-4222-8222-222222222222', 'upgrade-old-relation', 'structure_construction')
      `));
      await connection.db.execute(sql.raw(`
        insert into products (id, status, primary_taxonomy_term_id)
        values ('33333333-3333-4333-8333-333333333333', 'draft', '11111111-1111-4111-8111-111111111111')
      `));
      await connection.db.execute(sql.raw(`
        insert into product_taxonomy_terms (product_id, taxonomy_term_id, is_primary)
        values ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', true)
      `));
      const remediationEntry = journal.entries.find((entry) => entry.idx === 6);
      if (!remediationEntry) throw new Error("Missing remediation migration journal entry.");
      await copyFile(
        `drizzle/${remediationEntry.tag}.sql`,
        join(temporaryRoot, `${remediationEntry.tag}.sql`),
      );
      await writeFile(join(metaDirectory, "_journal.json"), JSON.stringify(journal));
      await migrateDatabase(connection, temporaryRoot);
      const primaryRows = await connection.db
        .select({ taxonomyTermId: productTaxonomyTerms.taxonomyTermId })
        .from(productTaxonomyTerms)
        .where(
          sql`${productTaxonomyTerms.productId} = '33333333-3333-4333-8333-333333333333' and ${productTaxonomyTerms.isPrimary} = true`,
        );
      expect(primaryRows).toEqual([
        { taxonomyTermId: "11111111-1111-4111-8111-111111111111" },
      ]);
      const columns = await connection.db.execute<{ column_name: string }>(sql`
        select column_name from information_schema.columns
        where table_name = 'products' and column_name = 'primary_taxonomy_term_id'
      `);
      expect(columns.rows).toHaveLength(0);
    } finally {
      await connection.close();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
