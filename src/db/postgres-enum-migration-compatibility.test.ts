import { readMigrationFiles, type MigrationMeta } from "drizzle-orm/migrator";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  assertDedicatedPostgresMigrationClient,
  classifyPostgresMigrationState,
  PostgresMigrationCompatibilityError,
  validateAndPrepareMigrationList,
  validateAndPrepareMigrations,
} from "./postgres-enum-migration-compatibility";

const migration0010Millis = 1_785_611_033_629;
const migration0011Millis = 1_785_615_299_282;
const finalLabels = [
  "created",
  "uploading",
  "ready_to_finalize",
  "finalizing",
  "completed",
  "failed",
  "expired",
];
const originalLabels = finalLabels.filter((label) => label !== "finalizing");
const knownJournal = new Set(
  readMigrationFiles({ migrationsFolder: "drizzle" }).map((migration) => migration.folderMillis),
);

function expectCompatibilityError(action: () => unknown, code: string): void {
  try {
    action();
    throw new Error("Expected compatibility failure.");
  } catch (error) {
    expect(error).toBeInstanceOf(PostgresMigrationCompatibilityError);
    expect((error as PostgresMigrationCompatibilityError).code).toBe(code);
    expect((error as Error).message).not.toContain("DATABASE_URL");
  }
}

describe("PostgreSQL enum migration compatibility", () => {
  it("rejects a pooled migration client before database work", () => {
    expect(() => assertDedicatedPostgresMigrationClient(1)).not.toThrow();
    expectCompatibilityError(
      () => assertDedicatedPostgresMigrationClient(2),
      "MIGRATION_CLIENT_NOT_DEDICATED",
    );
  });

  it("recognizes only the approved Fresh, pre-0010, 0010 and post-0010 states", () => {
    expect(classifyPostgresMigrationState({
      journalMillis: null,
      enumTypeExists: false,
      enumLabels: [],
    }, knownJournal)).toBe("fresh");
    expect(classifyPostgresMigrationState({
      journalMillis: [...knownJournal][5]!,
      enumTypeExists: false,
      enumLabels: [],
    }, knownJournal)).toBe("before_0010");
    expect(classifyPostgresMigrationState({
      journalMillis: migration0010Millis,
      enumTypeExists: true,
      enumLabels: originalLabels,
    }, knownJournal)).toBe("preflight_0010");
    expect(classifyPostgresMigrationState({
      journalMillis: migration0010Millis,
      enumTypeExists: true,
      enumLabels: finalLabels,
    }, knownJournal)).toBe("resume_0010");
    expect(classifyPostgresMigrationState({
      journalMillis: migration0011Millis,
      enumTypeExists: true,
      enumLabels: finalLabels,
    }, knownJournal)).toBe("after_0010");
  });

  it("fails closed for Journal, type, value and order contradictions", () => {
    const contradictions = [
      { journalMillis: null, enumTypeExists: true, enumLabels: originalLabels },
      { journalMillis: [...knownJournal][5]!, enumTypeExists: true, enumLabels: originalLabels },
      { journalMillis: migration0010Millis, enumTypeExists: false, enumLabels: [] },
      { journalMillis: migration0010Millis, enumTypeExists: true, enumLabels: [...finalLabels].reverse() },
      { journalMillis: migration0011Millis, enumTypeExists: true, enumLabels: originalLabels },
      { journalMillis: Number.MAX_SAFE_INTEGER, enumTypeExists: true, enumLabels: finalLabels },
    ];
    for (const contradiction of contradictions) {
      expectCompatibilityError(
        () => classifyPostgresMigrationState(contradiction, knownJournal),
        "JOURNAL_CATALOG_MISMATCH",
      );
    }
  });

  it("preserves the approved 0011 hash and changes only its exact enum statement in memory", () => {
    const original = validateAndPrepareMigrations("drizzle", false);
    const compatible = validateAndPrepareMigrations("drizzle", true);
    const original0011 = original.find((migration) => migration.folderMillis === migration0011Millis)!;
    const compatible0011 = compatible.find((migration) => migration.folderMillis === migration0011Millis)!;

    expect(compatible0011.hash).toBe(original0011.hash);
    expect(compatible0011.sql).toHaveLength(original0011.sql.length);
    const differences = compatible0011.sql.flatMap((statement, index) =>
      statement === original0011.sql[index] ? [] : [index],
    );
    expect(differences).toEqual([1]);
    expect(compatible0011.sql[1]).toContain("ADD VALUE IF NOT EXISTS 'finalizing'");
    expect(original0011.sql[1]).toContain("ADD VALUE 'finalizing'");
    expect(compatible.filter((migration) => migration.folderMillis !== migration0011Millis))
      .toEqual(original.filter((migration) => migration.folderMillis !== migration0011Millis));
  });

  it("rejects a changed 0011 hash or non-exact target statement", () => {
    const migrations = readMigrationFiles({ migrationsFolder: "drizzle" });
    const migration0011 = migrations.find((migration) => migration.folderMillis === migration0011Millis)!;
    const changedHash = migrations.map((migration) =>
      migration === migration0011 ? { ...migration, hash: "changed" } : migration,
    );
    expectCompatibilityError(
      () => validateAndPrepareMigrationList(changedHash, true),
      "MIGRATION_IDENTITY_MISMATCH",
    );

    const changedSql: MigrationMeta[] = migrations.map((migration) =>
      migration === migration0011
        ? {
            ...migration,
            sql: migration.sql.map((statement, index) =>
              index === 1 ? statement.replace("BEFORE 'completed'", "AFTER 'completed'") : statement,
            ),
          }
        : migration,
    );
    expectCompatibilityError(
      () => validateAndPrepareMigrationList(changedSql, true),
      "MIGRATION_IDENTITY_MISMATCH",
    );
  });

  it("is reachable only from the database migration boundary", async () => {
    const sourceFiles: string[] = [];
    const visit = async (directory: string): Promise<void> => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) await visit(path);
        else if (/\.(?:ts|tsx)$/.test(entry.name)) sourceFiles.push(path);
      }
    };
    await visit("src");
    const authorized = new Set([
      "src/db/migrate.ts",
      "src/db/postgres-enum-migration-compatibility.test.ts",
      "src/db/postgres-enum-migration-compatibility.ts",
    ]);
    const unauthorized: string[] = [];
    for (const file of sourceFiles) {
      if (authorized.has(file)) continue;
      if ((await readFile(file, "utf8")).includes("postgres-enum-migration-compatibility")) {
        unauthorized.push(file);
      }
    }
    expect(unauthorized).toEqual([]);
  });
});
