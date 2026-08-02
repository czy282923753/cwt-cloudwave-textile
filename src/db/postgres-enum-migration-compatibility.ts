import { readMigrationFiles, type MigrationMeta } from "drizzle-orm/migrator";
import { PgDialect } from "drizzle-orm/pg-core/dialect";
import { PostgresJsSession } from "drizzle-orm/postgres-js/session";
import type { Sql } from "postgres";

const MIGRATION_0010_MILLIS = 1_785_611_033_629;
const MIGRATION_0011_MILLIS = 1_785_615_299_282;
const APPROVED_0011_HASH = "85fc96870f0fbf2b2dc8fddfce81e28f86996588d4f489a6e59dc2e9962b242f";
const TARGET_0011_SQL = `ALTER TYPE "public"."asset_upload_batch_status" ADD VALUE 'finalizing' BEFORE 'completed';`;
const COMPATIBLE_0011_SQL = `ALTER TYPE "public"."asset_upload_batch_status" ADD VALUE IF NOT EXISTS 'finalizing' BEFORE 'completed';`;
const EXPECTED_0010_ENUM = [
  "created",
  "uploading",
  "ready_to_finalize",
  "completed",
  "failed",
  "expired",
] as const;
const EXPECTED_FINAL_ENUM = [
  "created",
  "uploading",
  "ready_to_finalize",
  "finalizing",
  "completed",
  "failed",
  "expired",
] as const;

// Two stable int32 keys avoid database-local hash function assumptions.
export const POSTGRES_MIGRATION_LOCK_KEYS = [1_129_736_391, 1_163_282_516] as const;

export type PostgresMigrationCompatibilityMode =
  | "fresh"
  | "before_0010"
  | "preflight_0010"
  | "resume_0010"
  | "after_0010";

export type PostgresMigrationCompatibilityStage =
  | "lock_acquired"
  | "state_inspected"
  | "before_preflight"
  | "preflight_committed"
  | "before_migrator"
  | "migrator_completed"
  | "verified";

export type PostgresMigrationCompatibilityEvent = {
  stage: PostgresMigrationCompatibilityStage;
  backendPid: number;
  mode?: PostgresMigrationCompatibilityMode;
  journalMillis?: number | null;
};

export type PostgresMigrationCompatibilityOptions = {
  onEvent?: (event: PostgresMigrationCompatibilityEvent) => void | Promise<void>;
};

export type PostgresMigrationCatalogState = {
  journalMillis: number | null;
  enumTypeExists: boolean;
  enumLabels: string[];
};

export class PostgresMigrationCompatibilityError extends Error {
  constructor(
    public readonly code:
      | "LOCK_UNAVAILABLE"
      | "MIGRATION_IDENTITY_MISMATCH"
      | "JOURNAL_CATALOG_MISMATCH"
      | "MIGRATION_CLIENT_NOT_DEDICATED"
      | "BACKEND_SESSION_CHANGED"
      | "POST_MIGRATION_VERIFICATION_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "PostgresMigrationCompatibilityError";
  }
}

function normalizedSql(statement: string): string {
  return statement.trim().replaceAll(/\s+/g, " ");
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function validateAndPrepareMigrations(
  migrationsFolder: string,
  enable0011Compatibility: boolean,
): MigrationMeta[] {
  return validateAndPrepareMigrationList(
    readMigrationFiles({ migrationsFolder }),
    enable0011Compatibility,
  );
}

export function validateAndPrepareMigrationList(
  migrations: MigrationMeta[],
  enable0011Compatibility: boolean,
): MigrationMeta[] {
  const migration0011 = migrations.find((migration) => migration.folderMillis === MIGRATION_0011_MILLIS);
  if (!migration0011 || migration0011.hash !== APPROVED_0011_HASH) {
    throw new PostgresMigrationCompatibilityError(
      "MIGRATION_IDENTITY_MISMATCH",
      "Migration 0011 does not match the approved compatibility identity.",
    );
  }

  const targetIndexes = migration0011.sql.flatMap((statement, index) =>
    normalizedSql(statement) === TARGET_0011_SQL ? [index] : [],
  );
  if (targetIndexes.length !== 1) {
    throw new PostgresMigrationCompatibilityError(
      "MIGRATION_IDENTITY_MISMATCH",
      "Migration 0011 does not contain exactly one approved enum statement.",
    );
  }
  if (!enable0011Compatibility) return migrations;

  const targetIndex = targetIndexes[0];
  return migrations.map((migration) => {
    if (migration.folderMillis !== MIGRATION_0011_MILLIS) return migration;
    return {
      ...migration,
      // Preserve the approved on-disk hash. The preflight has already committed
      // the exact enum addition; this one statement becomes an idempotent no-op.
      hash: migration.hash,
      sql: migration.sql.map((statement, index) =>
        index === targetIndex ? `\n${COMPATIBLE_0011_SQL}` : statement,
      ),
    };
  });
}

export function classifyPostgresMigrationState(
  state: PostgresMigrationCatalogState,
  knownJournalMillis: ReadonlySet<number>,
): PostgresMigrationCompatibilityMode {
  const { journalMillis, enumTypeExists, enumLabels } = state;
  if (journalMillis !== null && !knownJournalMillis.has(journalMillis)) {
    throw new PostgresMigrationCompatibilityError(
      "JOURNAL_CATALOG_MISMATCH",
      "The Drizzle Journal position is not present in the approved migration set.",
    );
  }

  if (journalMillis === null) {
    if (!enumTypeExists && enumLabels.length === 0) return "fresh";
    throw new PostgresMigrationCompatibilityError(
      "JOURNAL_CATALOG_MISMATCH",
      "An empty Drizzle Journal conflicts with the enum catalog.",
    );
  }

  if (journalMillis < MIGRATION_0010_MILLIS) {
    if (!enumTypeExists && enumLabels.length === 0) return "before_0010";
    throw new PostgresMigrationCompatibilityError(
      "JOURNAL_CATALOG_MISMATCH",
      "A pre-0010 Journal position conflicts with the enum catalog.",
    );
  }

  if (journalMillis === MIGRATION_0010_MILLIS) {
    if (!enumTypeExists) {
      throw new PostgresMigrationCompatibilityError(
        "JOURNAL_CATALOG_MISMATCH",
        "Migration 0010 is journaled but its enum type is missing.",
      );
    }
    if (arraysEqual(enumLabels, EXPECTED_0010_ENUM)) return "preflight_0010";
    if (arraysEqual(enumLabels, EXPECTED_FINAL_ENUM)) return "resume_0010";
    throw new PostgresMigrationCompatibilityError(
      "JOURNAL_CATALOG_MISMATCH",
      "Migration 0010 has an unexpected enum value set or order.",
    );
  }

  if (journalMillis >= MIGRATION_0011_MILLIS && arraysEqual(enumLabels, EXPECTED_FINAL_ENUM)) {
    return "after_0010";
  }
  throw new PostgresMigrationCompatibilityError(
    "JOURNAL_CATALOG_MISMATCH",
    "The post-0010 Journal position conflicts with the enum catalog.",
  );
}

export function assertDedicatedPostgresMigrationClient(maxConnections: number): void {
  if (maxConnections === 1) return;
  throw new PostgresMigrationCompatibilityError(
    "MIGRATION_CLIENT_NOT_DEDICATED",
    "PostgreSQL migration compatibility requires a dedicated max:1 client.",
  );
}

async function backendPid(client: Sql): Promise<number> {
  const rows = await client<{ backend_pid: number }[]>`select pg_backend_pid() as backend_pid`;
  const pid = rows[0]?.backend_pid;
  if (typeof pid !== "number" || !Number.isInteger(pid)) {
    throw new PostgresMigrationCompatibilityError(
      "BACKEND_SESSION_CHANGED",
      "The migration backend identity could not be established.",
    );
  }
  return pid;
}

async function assertBackendPid(client: Sql, expectedPid: number): Promise<void> {
  if (await backendPid(client) !== expectedPid) {
    throw new PostgresMigrationCompatibilityError(
      "BACKEND_SESSION_CHANGED",
      "The PostgreSQL backend session changed during migration compatibility handling.",
    );
  }
}

async function inspectCatalog(client: Sql): Promise<PostgresMigrationCatalogState> {
  const journalTable = await client<{ journal_exists: boolean }[]>`
    select to_regclass('drizzle.__drizzle_migrations') is not null as journal_exists
  `;
  let journalMillis: number | null = null;
  if (journalTable[0]?.journal_exists) {
    const journalRows = await client<{ created_at: string | number | null }[]>`
      select created_at
      from drizzle.__drizzle_migrations
      order by created_at desc
      limit 1
    `;
    const rawMillis = journalRows[0]?.created_at;
    if (rawMillis !== undefined && rawMillis !== null) {
      journalMillis = Number(rawMillis);
      if (!Number.isSafeInteger(journalMillis)) {
        throw new PostgresMigrationCompatibilityError(
          "JOURNAL_CATALOG_MISMATCH",
          "The Drizzle Journal position is invalid.",
        );
      }
    }
  }

  const typeRows = await client<{ oid: number }[]>`
    select type.oid
    from pg_type as type
    join pg_namespace as namespace on namespace.oid = type.typnamespace
    where namespace.nspname = 'public'
      and type.typname = 'asset_upload_batch_status'
      and type.typtype = 'e'
  `;
  const enumTypeExists = typeRows.length === 1;
  const enumRows = enumTypeExists
    ? await client<{ enumlabel: string }[]>`
        select enum.enumlabel
        from pg_enum as enum
        join pg_type as type on type.oid = enum.enumtypid
        join pg_namespace as namespace on namespace.oid = type.typnamespace
        where namespace.nspname = 'public'
          and type.typname = 'asset_upload_batch_status'
        order by enum.enumsortorder
      `
    : [];
  return {
    journalMillis,
    enumTypeExists,
    enumLabels: enumRows.map((row) => row.enumlabel),
  };
}

async function emit(
  options: PostgresMigrationCompatibilityOptions,
  event: PostgresMigrationCompatibilityEvent,
): Promise<void> {
  await options.onEvent?.(event);
}

function latestMigrationMillis(migrations: readonly MigrationMeta[]): number {
  const latest = migrations.at(-1)?.folderMillis;
  if (!latest) {
    throw new PostgresMigrationCompatibilityError(
      "MIGRATION_IDENTITY_MISMATCH",
      "The approved migration set is empty.",
    );
  }
  return latest;
}

export async function migratePostgresWithEnumCompatibility(
  client: Sql,
  migrationsFolder = "drizzle",
  options: PostgresMigrationCompatibilityOptions = {},
): Promise<void> {
  const originalMigrations = validateAndPrepareMigrations(migrationsFolder, false);
  const knownJournalMillis = new Set(originalMigrations.map((migration) => migration.folderMillis));
  assertDedicatedPostgresMigrationClient(client.options.max);
  let lockAcquired = false;
  let primaryError: unknown;
  try {
    const lockRows = await client<{ backend_pid: number; locked: boolean }[]>`
      select pg_backend_pid() as backend_pid,
        pg_try_advisory_lock(
        ${POSTGRES_MIGRATION_LOCK_KEYS[0]}::integer,
        ${POSTGRES_MIGRATION_LOCK_KEYS[1]}::integer
      ) as locked
    `;
    if (!lockRows[0]?.locked) {
      throw new PostgresMigrationCompatibilityError(
        "LOCK_UNAVAILABLE",
        "Another CWT migration process currently owns the PostgreSQL migration lock.",
      );
    }
    lockAcquired = true;
    const expectedPid = lockRows[0]?.backend_pid;
    if (typeof expectedPid !== "number" || !Number.isInteger(expectedPid)) {
      throw new PostgresMigrationCompatibilityError(
        "BACKEND_SESSION_CHANGED",
        "The migration backend identity could not be established with its lock.",
      );
    }
    await emit(options, { stage: "lock_acquired", backendPid: expectedPid });

    const initialState = await inspectCatalog(client);
    await assertBackendPid(client, expectedPid);
    const mode = classifyPostgresMigrationState(initialState, knownJournalMillis);
    await emit(options, {
      stage: "state_inspected",
      backendPid: expectedPid,
      mode,
      journalMillis: initialState.journalMillis,
    });

    if (mode === "preflight_0010") {
      await emit(options, {
        stage: "before_preflight",
        backendPid: expectedPid,
        mode,
        journalMillis: initialState.journalMillis,
      });
      await client.begin(async (transaction) => {
        await transaction`
          alter type "public"."asset_upload_batch_status"
          add value 'finalizing' before 'completed'
        `;
      });
      await assertBackendPid(client, expectedPid);
      const committedState = await inspectCatalog(client);
      if (
        committedState.journalMillis !== MIGRATION_0010_MILLIS ||
        !arraysEqual(committedState.enumLabels, EXPECTED_FINAL_ENUM)
      ) {
        throw new PostgresMigrationCompatibilityError(
          "POST_MIGRATION_VERIFICATION_FAILED",
          "The committed enum preflight did not produce the approved catalog state.",
        );
      }
      await emit(options, {
        stage: "preflight_committed",
        backendPid: expectedPid,
        mode,
        journalMillis: committedState.journalMillis,
      });
    }

    await assertBackendPid(client, expectedPid);
    const enable0011Compatibility = mode === "preflight_0010" || mode === "resume_0010";
    const migrations = validateAndPrepareMigrations(migrationsFolder, enable0011Compatibility);
    await emit(options, {
      stage: "before_migrator",
      backendPid: expectedPid,
      mode,
      journalMillis: initialState.journalMillis,
    });
    const dialect = new PgDialect();
    const session = new PostgresJsSession<
      Sql,
      Record<string, never>,
      Record<string, never>
    >(client, dialect, undefined);
    await dialect.migrate(migrations, session, {
      migrationsFolder,
    });
    await assertBackendPid(client, expectedPid);
    await emit(options, { stage: "migrator_completed", backendPid: expectedPid, mode });

    const finalState = await inspectCatalog(client);
    if (
      finalState.journalMillis !== latestMigrationMillis(originalMigrations) ||
      !finalState.enumTypeExists ||
      !arraysEqual(finalState.enumLabels, EXPECTED_FINAL_ENUM)
    ) {
      throw new PostgresMigrationCompatibilityError(
        "POST_MIGRATION_VERIFICATION_FAILED",
        "PostgreSQL migration completed without the approved Journal and enum catalog state.",
      );
    }
    await emit(options, {
      stage: "verified",
      backendPid: expectedPid,
      mode,
      journalMillis: finalState.journalMillis,
    });
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try {
      if (lockAcquired) {
        const unlockRows = await client<{ unlocked: boolean }[]>`
          select pg_advisory_unlock(
            ${POSTGRES_MIGRATION_LOCK_KEYS[0]}::integer,
            ${POSTGRES_MIGRATION_LOCK_KEYS[1]}::integer
          ) as unlocked
        `;
        if (!unlockRows[0]?.unlocked && primaryError === undefined) {
          throw new PostgresMigrationCompatibilityError(
            "BACKEND_SESSION_CHANGED",
            "The PostgreSQL migration lock was not owned during release.",
          );
        }
      }
    } catch (unlockError) {
      if (primaryError === undefined) throw unlockError;
    }
  }
}
