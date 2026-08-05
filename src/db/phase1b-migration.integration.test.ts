import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import * as schema from "@/db/schema";

import { migrateDatabase } from "./migrate";

describe("Phase 1B Migration 0018", () => {
  it("upgrades legacy Product/Content deterministically and remains repeat-safe", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "cwt-phase1b-0018-"));
    const metaDirectory = join(temporaryRoot, "meta");
    await mkdir(metaDirectory);
    const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8")) as {
      version: string;
      dialect: string;
      entries: Array<{ idx: number; tag: string }>;
    };
    const before0018 = journal.entries.filter((entry) => entry.idx <= 17);
    for (const entry of before0018) {
      await copyFile(`drizzle/${entry.tag}.sql`, join(temporaryRoot, `${entry.tag}.sql`));
    }
    await writeFile(join(metaDirectory, "_journal.json"), JSON.stringify({
      ...journal,
      entries: before0018,
    }));
    const client = new PGlite("memory://");
    const connection = {
      kind: "pglite" as const,
      db: drizzle(client, { schema }),
      close: async () => client.close(),
    };
    try {
      await migrateDatabase(connection, temporaryRoot);
      await connection.db.transaction(async (transaction) => {
        await transaction.execute(sql.raw(`
          insert into taxonomy_terms (id, internal_key, dimension)
          values ('10000000-0000-4000-8000-000000000001', 'stage1-upgrade-category', 'material_fiber')
        `));
        await transaction.execute(sql.raw(`
          insert into products (id, status, product_code)
          values ('10000000-0000-4000-8000-000000000002', 'draft', 'LEGACY-001')
        `));
        await transaction.execute(sql.raw(`
          insert into product_taxonomy_terms (product_id, taxonomy_term_id, is_primary)
          values ('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', true)
        `));
        await transaction.execute(sql.raw(`
          insert into product_localizations (product_id, locale, name, full_description)
          values ('10000000-0000-4000-8000-000000000002', 'en', 'Synthetic legacy Product', E'Line one\\nLine two')
        `));
      });
      await connection.db.execute(sql.raw(`
        insert into authors (id, internal_key, display_name, is_organization)
        values ('10000000-0000-4000-8000-000000000003', 'stage1-upgrade-author', 'Synthetic Author', true)
      `));
      await connection.db.execute(sql.raw(`
        insert into contents (id, channel, type, status, author_id)
        values ('10000000-0000-4000-8000-000000000004', 'fabric_knowledge', 'article', 'draft', '10000000-0000-4000-8000-000000000003')
      `));
      await connection.db.execute(sql.raw(`
        insert into content_localizations (content_id, locale, title, body)
        values ('10000000-0000-4000-8000-000000000004', 'en', 'Synthetic legacy article', 'Approved legacy article body.')
      `));

      const migration0018 = journal.entries.find((entry) => entry.idx === 18);
      if (!migration0018) throw new Error("Migration 0018 is missing from the Journal.");
      await copyFile(
        `drizzle/${migration0018.tag}.sql`,
        join(temporaryRoot, `${migration0018.tag}.sql`),
      );
      await writeFile(join(metaDirectory, "_journal.json"), JSON.stringify(journal));
      await migrateDatabase(connection, temporaryRoot);
      await migrateDatabase(connection, temporaryRoot);

      const productRows = await connection.db.execute<{
        full_description: string;
        structured_blocks: { version: number; blocks: Array<{ type: string; text: string }> };
        product_code_assigned_at: Date | null;
      }>(sql.raw(`
        select full_description, structured_blocks, product_code_assigned_at
        from product_localizations
        inner join products on products.id = product_localizations.product_id
        where product_id = '10000000-0000-4000-8000-000000000002'
      `));
      expect(productRows.rows[0]?.full_description).toBe("Line one\nLine two");
      expect(productRows.rows[0]?.structured_blocks).toEqual({
        version: 1,
        blocks: [{ id: "legacy-paragraph-1", type: "paragraph", text: "Line one\nLine two" }],
      });
      expect(productRows.rows[0]?.product_code_assigned_at).toBeTruthy();

      const contentRows = await connection.db.execute<{
        body: string;
        structured_blocks: { version: number; blocks: Array<{ type: string; text: string }> };
      }>(sql.raw(`
        select body, structured_blocks
        from content_localizations
        where content_id = '10000000-0000-4000-8000-000000000004'
      `));
      expect(contentRows.rows[0]?.body).toBe("Approved legacy article body.");
      expect(contentRows.rows[0]?.structured_blocks).toEqual({
        version: 1,
        blocks: [{ id: "legacy-paragraph-1", type: "paragraph", text: "Approved legacy article body." }],
      });
      const environmentLabels = await connection.db.execute<{ enumlabel: string }>(sql.raw(`
        select enumlabel
        from pg_enum
        inner join pg_type on pg_type.oid = pg_enum.enumtypid
        where pg_type.typname = 'app_environment'
        order by enumsortorder
      `));
      expect(environmentLabels.rows.map((row) => row.enumlabel)).toEqual([
        "local",
        "test",
        "staging",
        "production",
      ]);
      await expect(connection.db.execute(sql.raw(`
        update taxonomy_terms
        set product_code_prefix = 'AB'
        where id = '10000000-0000-4000-8000-000000000001'
      `))).rejects.toThrow();
      await expect(connection.db.execute(sql.raw(`
        update products
        set moq_value = 100, moq_unit = null
        where id = '10000000-0000-4000-8000-000000000002'
      `))).rejects.toThrow();
      await expect(connection.db.execute(sql.raw(`
        update product_localizations
        set blocks_version = 2
        where product_id = '10000000-0000-4000-8000-000000000002'
      `))).rejects.toThrow();
    } finally {
      await connection.close();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }, 30_000);
});
