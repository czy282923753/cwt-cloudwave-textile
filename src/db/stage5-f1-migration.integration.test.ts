import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import * as schema from "@/db/schema";

import { migrateDatabase } from "./migrate";

interface Journal {
  version: string;
  dialect: string;
  entries: Array<{ idx: number; version: string; when: number; tag: string; breakpoints: boolean }>;
}

async function migrationDirectoryThrough(journal: Journal, maximum: number): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), `cwt-stage5-f1-${maximum}-`));
  await mkdir(join(directory, "meta"));
  for (const entry of journal.entries.filter((candidate) => candidate.idx <= maximum)) {
    await copyFile(`drizzle/${entry.tag}.sql`, join(directory, `${entry.tag}.sql`));
  }
  await writeFile(join(directory, "meta", "_journal.json"), JSON.stringify({
    ...journal,
    entries: journal.entries.filter((entry) => entry.idx <= maximum),
  }));
  return directory;
}

describe("Migration 0022 Inquiry attribution", () => {
  it("passes Fresh, 0021 Upgrade, repeat, legacy preservation, pair constraints and index structure", async () => {
    const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8")) as Journal;
    expect(journal.entries.at(-1)).toMatchObject({
      idx: 22,
      tag: "0022_phase1b_stage5_inquiry_attribution",
    });
    const freshDirectory = await migrationDirectoryThrough(journal, 22);
    const upgradeDirectory = await migrationDirectoryThrough(journal, 21);
    const freshClient = new PGlite("memory://");
    const upgradeClient = new PGlite("memory://");
    const fresh = { kind: "pglite" as const, db: drizzle(freshClient, { schema }), close: () => freshClient.close() };
    const upgrade = { kind: "pglite" as const, db: drizzle(upgradeClient, { schema }), close: () => upgradeClient.close() };
    try {
      await migrateDatabase(fresh, freshDirectory);
      await migrateDatabase(fresh, freshDirectory);
      const columns = await fresh.db.execute<{ column_name: string }>(sql.raw(`
        select column_name from information_schema.columns
        where table_name = 'inquiries'
          and column_name in (
            'submit_referrer', 'submit_utm_source', 'submit_utm_medium',
            'submit_utm_campaign', 'source_entity_type', 'source_entity_id'
          )
        order by column_name
      `));
      expect(columns.rows.map((row) => row.column_name)).toEqual([
        "source_entity_id",
        "source_entity_type",
        "submit_referrer",
        "submit_utm_campaign",
        "submit_utm_medium",
        "submit_utm_source",
      ]);

      await migrateDatabase(upgrade, upgradeDirectory);
      const legacyStatements = [
        `insert into contacts (id, name, email, normalized_email)
        values ('81000000-0000-4000-8000-000000000001', 'Synthetic legacy buyer', 'legacy@example.test', 'legacy@example.test')`,
        `insert into inquiries (
          id, public_reference, contact_id, submitted_name, submitted_email,
          idempotency_key, source_page_path
        ) values (
          '81000000-0000-4000-8000-000000000002', 'CWT-SYNTHETIC-LEGACY',
          '81000000-0000-4000-8000-000000000001', 'Synthetic legacy buyer',
          'legacy@example.test', 'stage5-legacy-0001', '/get-quote/'
        )`,
        `insert into notification_outbox (
          kind, aggregate_type, aggregate_id, payload, delivery_key
        ) values (
          'inquiry_notification', 'inquiry', '81000000-0000-4000-8000-000000000002',
          '{"synthetic":true}'::jsonb, 'inquiry_notification:81000000-0000-4000-8000-000000000002'
        )`,
        `insert into audit_logs (action, entity_type, entity_id)
        values ('synthetic.legacy', 'inquiry', '81000000-0000-4000-8000-000000000002')`,
        `insert into routes (path, entity_type, entity_id)
        values ('/synthetic-stage5/', 'static_page', null)`,
      ];
      for (const statement of legacyStatements) {
        await upgrade.db.execute(sql.raw(statement));
      }

      await copyFile(
        "drizzle/0022_phase1b_stage5_inquiry_attribution.sql",
        join(upgradeDirectory, "0022_phase1b_stage5_inquiry_attribution.sql"),
      );
      await writeFile(join(upgradeDirectory, "meta", "_journal.json"), JSON.stringify(journal));
      await migrateDatabase(upgrade, upgradeDirectory);
      await migrateDatabase(upgrade, upgradeDirectory);

      const legacy = await upgrade.db.execute<{
        submit_referrer: string | null;
        source_entity_type: string | null;
        source_entity_id: string | null;
      }>(sql.raw(`
        select submit_referrer, source_entity_type, source_entity_id
        from inquiries where id = '81000000-0000-4000-8000-000000000002'
      `));
      expect(legacy.rows[0]).toEqual({
        submit_referrer: null,
        source_entity_type: null,
        source_entity_id: null,
      });
      for (const table of ["notification_outbox", "audit_logs", "routes"]) {
        const preserved = await upgrade.db.execute<{ value: number }>(sql.raw(
          `select count(*)::int as value from ${table}`,
        ));
        expect(preserved.rows[0]?.value, table).toBe(1);
      }

      await expect(upgrade.db.execute(sql.raw(`
        update inquiries set source_entity_type = 'product', source_entity_id = null
        where id = '81000000-0000-4000-8000-000000000002'
      `))).rejects.toThrow();
      await expect(upgrade.db.execute(sql.raw(`
        update inquiries set source_entity_type = 'unsupported', source_entity_id = '81000000-0000-4000-8000-000000000009'
        where id = '81000000-0000-4000-8000-000000000002'
      `))).rejects.toThrow();
      for (const type of ["product", "application", "content"]) {
        await upgrade.db.execute(sql.raw(`
          update inquiries set source_entity_type = '${type}', source_entity_id = '81000000-0000-4000-8000-000000000009'
          where id = '81000000-0000-4000-8000-000000000002'
        `));
      }
      await upgrade.db.execute(sql.raw(`
        update inquiries set source_entity_type = null, source_entity_id = null
        where id = '81000000-0000-4000-8000-000000000002'
      `));
      const indexes = await upgrade.db.execute<{ indexname: string }>(sql.raw(`
        select indexname from pg_indexes
        where tablename = 'inquiries' and indexname = 'inquiries_source_entity_idx'
      `));
      expect(indexes.rows).toEqual([{ indexname: "inquiries_source_entity_idx" }]);
    } finally {
      await fresh.close();
      await upgrade.close();
      await rm(freshDirectory, { recursive: true, force: true });
      await rm(upgradeDirectory, { recursive: true, force: true });
    }
  }, 40_000);
});
