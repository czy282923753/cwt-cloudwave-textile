import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postgres, { type Sql } from "postgres";

import { env } from "../src/config/env";
import {
  migratePostgresWithEnumCompatibility,
  POSTGRES_MIGRATION_LOCK_KEYS,
  PostgresMigrationCompatibilityError,
  type PostgresMigrationCompatibilityEvent,
} from "../src/db/postgres-enum-migration-compatibility";

type JournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};

type Journal = {
  version: string;
  dialect: string;
  entries: JournalEntry[];
};

type CatalogEvidence = {
  journalMillis: number | null;
  enumLabels: string[];
  appEnvironmentLabels: string[];
  assetRoleLabels: string[];
  tableNames: string[];
  constraintNames: string[];
  indexNames: string[];
  triggerNames: string[];
  fixtureCount: number;
};

type ScenarioEvidence = {
  scenario: string;
  result: "passed";
  sqlState?: string;
  journalMillis?: number | null;
  enumLabels?: string[];
  backendPids?: number[];
  detail?: string;
};

const validationPrefix = `cwt_enum_compat_${process.pid}_`;
const fixtureId = "8f7fa947-a283-4cc6-bdb9-a2417c47f8d1";
const expectedEnumLabels = [
  "created",
  "uploading",
  "ready_to_finalize",
  "finalizing",
  "completed",
  "failed",
  "expired",
];
const expectedAppEnvironmentLabels = ["local", "test", "staging", "production"];
const expectedAssetRoleLabels = [
  "hero",
  "gallery",
  "cover",
  "detail",
  "application",
  "thumbnail",
  "inline",
  "document",
  "download",
  "inquiry",
  "import",
];
let expectedLatestJournalMillis: number | null = null;

function validationClient(url: string, max = 1): Sql {
  return postgres(url, { max, prepare: false, onnotice: () => undefined });
}

function requireSafeValidationEnvironment(): URL {
  if (
    env.APP_ENV === "production" ||
    env.DATABASE_DRIVER !== "postgres" ||
    process.env.CWT_POSTGRES_COMPAT_VALIDATION !== "isolated-test-database"
  ) {
    throw new Error(
      "Enum compatibility validation requires a dedicated non-production PostgreSQL server and CWT_POSTGRES_COMPAT_VALIDATION=isolated-test-database.",
    );
  }
  const url = new URL(env.DATABASE_URL);
  if (!url.pathname || url.pathname === "/") {
    throw new Error("A PostgreSQL administrative database name is required.");
  }
  return url;
}

function quotedIdentifier(value: string): string {
  if (!/^cwt_enum_compat_[a-z0-9_]+$/.test(value)) {
    throw new Error("Unsafe validation database identifier refused.");
  }
  return `"${value}"`;
}

function databaseUrl(baseUrl: URL, databaseName: string): string {
  const result = new URL(baseUrl);
  result.pathname = `/${databaseName}`;
  return result.toString();
}

function sqlState(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof current !== "object" || current === null) return undefined;
    if ("code" in current && typeof current.code === "string") return current.code;
    current = "cause" in current ? current.cause : undefined;
  }
  return undefined;
}

async function migrationFolderThrough(maxIndex: number): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), `cwt-enum-migrations-${maxIndex}-`));
  const meta = join(folder, "meta");
  await mkdir(meta);
  const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8")) as Journal;
  const entries = journal.entries.filter((entry) => entry.idx <= maxIndex);
  for (const entry of entries) {
    await copyFile(`drizzle/${entry.tag}.sql`, join(folder, `${entry.tag}.sql`));
  }
  await writeFile(join(meta, "_journal.json"), JSON.stringify({ ...journal, entries }));
  return folder;
}

async function applyThrough(databaseUrlValue: string, maxIndex: number): Promise<void> {
  const folder = await migrationFolderThrough(maxIndex);
  const client = validationClient(databaseUrlValue);
  try {
    await migratePostgres(drizzlePostgres(client), { migrationsFolder: folder });
  } finally {
    await client.end();
    await rm(folder, { recursive: true, force: true });
  }
}

async function addFixture(databaseUrlValue: string): Promise<void> {
  const client = validationClient(databaseUrlValue);
  try {
    await client`
      insert into taxonomy_terms (id, internal_key, dimension)
      values (${fixtureId}::uuid, 'TEST-postgres-enum-compatibility', 'material_fiber')
    `;
  } finally {
    await client.end();
  }
}

async function collectCatalog(client: Sql): Promise<CatalogEvidence> {
  const journalTable = await client<{ exists: boolean }[]>`
    select to_regclass('drizzle.__drizzle_migrations') is not null as exists
  `;
  const journalRows = journalTable[0]?.exists
    ? await client<{ created_at: number | string | null }[]>`
        select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1
      `
    : [];
  const enumRows = await client<{ enumlabel: string }[]>`
    select enum.enumlabel
    from pg_enum as enum
    join pg_type as type on type.oid = enum.enumtypid
    join pg_namespace as namespace on namespace.oid = type.typnamespace
    where namespace.nspname = 'public' and type.typname = 'asset_upload_batch_status'
    order by enum.enumsortorder
  `;
  const applicationEnvironmentRows = await client<{ enumlabel: string }[]>`
    select enum.enumlabel
    from pg_enum as enum
    join pg_type as type on type.oid = enum.enumtypid
    join pg_namespace as namespace on namespace.oid = type.typnamespace
    where namespace.nspname = 'public' and type.typname = 'app_environment'
    order by enum.enumsortorder
  `;
  const assetRoleRows = await client<{ enumlabel: string }[]>`
    select enum.enumlabel
    from pg_enum as enum
    join pg_type as type on type.oid = enum.enumtypid
    join pg_namespace as namespace on namespace.oid = type.typnamespace
    where namespace.nspname = 'public' and type.typname = 'asset_role'
    order by enum.enumsortorder
  `;
  const tables = await client<{ name: string }[]>`
    select table_name as name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `;
  const constraints = await client<{ name: string }[]>`
    select con.conname as name
    from pg_constraint as con
    join pg_namespace as namespace on namespace.oid = con.connamespace
    where namespace.nspname = 'public'
    order by con.conname
  `;
  const indexes = await client<{ name: string }[]>`
    select indexname as name from pg_indexes where schemaname = 'public' order by indexname
  `;
  const triggers = await client<{ name: string }[]>`
    select trg.tgname as name
    from pg_trigger as trg
    join pg_class as relation on relation.oid = trg.tgrelid
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public' and not trg.tgisinternal
    order by trg.tgname
  `;
  const fixtureTable = tables.some((row) => row.name === "taxonomy_terms");
  const fixtures = fixtureTable
    ? await client<{ count: string }[]>`
        select count(*)::text as count from taxonomy_terms where id = ${fixtureId}::uuid
      `
    : [];
  const rawJournal = journalRows[0]?.created_at;
  return {
    journalMillis: rawJournal === undefined || rawJournal === null ? null : Number(rawJournal),
    enumLabels: enumRows.map((row) => row.enumlabel),
    appEnvironmentLabels: applicationEnvironmentRows.map((row) => row.enumlabel),
    assetRoleLabels: assetRoleRows.map((row) => row.enumlabel),
    tableNames: tables.map((row) => row.name),
    constraintNames: constraints.map((row) => row.name),
    indexNames: indexes.map((row) => row.name),
    triggerNames: triggers.map((row) => row.name),
    fixtureCount: Number(fixtures[0]?.count ?? 0),
  };
}

async function migrateLatest(
  databaseUrlValue: string,
  onEvent?: (event: PostgresMigrationCompatibilityEvent) => void | Promise<void>,
): Promise<PostgresMigrationCompatibilityEvent[]> {
  const events: PostgresMigrationCompatibilityEvent[] = [];
  const client = validationClient(databaseUrlValue);
  try {
    await migratePostgresWithEnumCompatibility(client, "drizzle", {
      onEvent: async (event) => {
        events.push(event);
        await onEvent?.(event);
      },
    });
    return events;
  } finally {
    await client.end();
  }
}

async function runStandardMigrationEntry(databaseUrlValue: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("pnpm", ["db:migrate"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        APP_ENV: "test",
        DATABASE_DRIVER: "postgres",
        DATABASE_URL: databaseUrlValue,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Standard migration entry failed with exit ${code}: ${stderr.slice(-500)}`));
    });
  });
}

function assertOneBackend(events: readonly PostgresMigrationCompatibilityEvent[]): number[] {
  const backendPids = [...new Set(events.map((event) => event.backendPid))];
  if (backendPids.length !== 1) throw new Error("Migration crossed PostgreSQL backend sessions.");
  return backendPids;
}

function assertLatestCatalog(
  catalog: CatalogEvidence,
  reference?: CatalogEvidence,
  fixtureExpected = false,
): void {
  if (
    expectedLatestJournalMillis === null ||
    catalog.journalMillis !== expectedLatestJournalMillis
  ) {
    throw new Error("Latest Journal position was not reached.");
  }
  if (JSON.stringify(catalog.enumLabels) !== JSON.stringify(expectedEnumLabels)) {
    throw new Error("Final enum labels or order are incorrect.");
  }
  if (
    JSON.stringify(catalog.appEnvironmentLabels) !==
      JSON.stringify(expectedAppEnvironmentLabels) ||
    JSON.stringify(catalog.assetRoleLabels) !== JSON.stringify(expectedAssetRoleLabels)
  ) {
    throw new Error(
      `Stage 1 environment or Asset role enum labels are incorrect: ${JSON.stringify({
        appEnvironmentLabels: catalog.appEnvironmentLabels,
        assetRoleLabels: catalog.assetRoleLabels,
      })}`,
    );
  }
  if (fixtureExpected && catalog.fixtureCount !== 1) {
    throw new Error("Upgrade fixture data was not preserved.");
  }
  if (reference) {
    for (const key of ["tableNames", "constraintNames", "indexNames", "triggerNames"] as const) {
      if (JSON.stringify(catalog[key]) !== JSON.stringify(reference[key])) {
        throw new Error(`Upgrade catalog does not match Fresh catalog: ${key}.`);
      }
    }
  }
}

async function main(): Promise<void> {
  const currentJournal = JSON.parse(
    await readFile("drizzle/meta/_journal.json", "utf8"),
  ) as Journal;
  expectedLatestJournalMillis = currentJournal.entries.at(-1)?.when ?? null;
  if (expectedLatestJournalMillis === null) {
    throw new Error("Migration Journal has no latest entry.");
  }
  const baseUrl = requireSafeValidationEnvironment();
  const admin = validationClient(baseUrl.toString(), 4);
  const evidence: ScenarioEvidence[] = [];
  let scenarioIndex = 0;
  let freshReference: CatalogEvidence | undefined;

  const withDatabase = async <T>(label: string, action: (url: string) => Promise<T>): Promise<T> => {
    const name = `${validationPrefix}${scenarioIndex++}_${label.replaceAll(/[^a-z0-9]+/g, "_")}`;
    await admin.unsafe(`create database ${quotedIdentifier(name)}`);
    try {
      return await action(databaseUrl(baseUrl, name));
    } finally {
      await admin.unsafe(
        `select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`,
        [name],
      );
      await admin.unsafe(`drop database if exists ${quotedIdentifier(name)} with (force)`);
    }
  };

  try {
    await withDatabase("fresh", async (url) => {
      const firstEvents = await migrateLatest(url);
      const secondEvents = await migrateLatest(url);
      const client = validationClient(url);
      try {
        freshReference = await collectCatalog(client);
      } finally {
        await client.end();
      }
      assertLatestCatalog(freshReference);
      if (firstEvents.find((event) => event.stage === "state_inspected")?.mode !== "fresh") {
        throw new Error("Fresh migration unexpectedly entered compatibility mode.");
      }
      evidence.push({
        scenario: "Fresh 0000→latest and repeat no-op",
        result: "passed",
        journalMillis: freshReference.journalMillis,
        enumLabels: freshReference.enumLabels,
        backendPids: [...assertOneBackend(firstEvents), ...assertOneBackend(secondEvents)],
      });
    });

    for (const start of [5, 10, 11, 12, 14, 15, 16, 17]) {
      await withDatabase(`upgrade_${start}`, async (url) => {
        await applyThrough(url, start);
        await addFixture(url);
        const events = await migrateLatest(url);
        await migrateLatest(url);
        const client = validationClient(url);
        let catalog: CatalogEvidence;
        try {
          catalog = await collectCatalog(client);
        } finally {
          await client.end();
        }
        assertLatestCatalog(catalog, freshReference, true);
        const mode = events.find((event) => event.stage === "state_inspected")?.mode;
        const expectedMode = start === 5
          ? "before_0010"
          : start === 10
            ? "preflight_0010"
            : "after_0010";
        if (mode !== expectedMode) throw new Error(`Upgrade ${start} used unexpected mode ${mode}.`);
        evidence.push({
          scenario: `${String(start).padStart(4, "0")}→latest and repeat`,
          result: "passed",
          journalMillis: catalog.journalMillis,
          enumLabels: catalog.enumLabels,
          backendPids: assertOneBackend(events),
        });
      });
    }

    await withDatabase("standard_entry_0010", async (url) => {
      await applyThrough(url, 10);
      await addFixture(url);
      await runStandardMigrationEntry(url);
      await runStandardMigrationEntry(url);
      const client = validationClient(url);
      try {
        const catalog = await collectCatalog(client);
        assertLatestCatalog(catalog, freshReference, true);
        evidence.push({
          scenario: "pnpm db:migrate 0010→latest and repeat",
          result: "passed",
          journalMillis: catalog.journalMillis,
          enumLabels: catalog.enumLabels,
        });
      } finally {
        await client.end();
      }
    });

    await withDatabase("before_preflight_failure", async (url) => {
      await applyThrough(url, 10);
      let failure: unknown;
      try {
        await migrateLatest(url, (event) => {
          if (event.stage === "before_preflight") throw new Error("TEST-before-preflight");
        });
      } catch (error) {
        failure = error;
      }
      if (!(failure instanceof Error) || failure.message !== "TEST-before-preflight") {
        throw new Error("Preflight failure injection did not fire.");
      }
      const client = validationClient(url);
      try {
        const catalog = await collectCatalog(client);
        if (catalog.journalMillis !== 1_785_611_033_629 || catalog.enumLabels.includes("finalizing")) {
          throw new Error("Preflight failure changed durable state.");
        }
      } finally {
        await client.end();
      }
      await migrateLatest(url);
      evidence.push({ scenario: "Preflight-before failure and retry", result: "passed" });
    });

    await withDatabase("post_preflight_recovery", async (url) => {
      await applyThrough(url, 10);
      try {
        await migrateLatest(url, (event) => {
          if (event.stage === "preflight_committed") throw new Error("TEST-post-preflight-crash");
        });
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "TEST-post-preflight-crash") throw error;
      }
      const client = validationClient(url);
      try {
        const interrupted = await collectCatalog(client);
        if (
          interrupted.journalMillis !== 1_785_611_033_629 ||
          JSON.stringify(interrupted.enumLabels) !== JSON.stringify(expectedEnumLabels)
        ) {
          throw new Error("Post-preflight recovery state is incorrect.");
        }
      } finally {
        await client.end();
      }
      const resumed = await migrateLatest(url);
      if (resumed.find((event) => event.stage === "state_inspected")?.mode !== "resume_0010") {
        throw new Error("Committed preflight was not resumed as state D.");
      }
      evidence.push({ scenario: "Enum committed then process interruption and resume", result: "passed" });
    });

    await withDatabase("enum_add_failure", async (url) => {
      await applyThrough(url, 10);
      const role = `${validationPrefix}limited`;
      const password = "TEST-only-enum-compatibility-password";
      await admin.unsafe(`drop role if exists ${quotedIdentifier(role)}`);
      await admin.unsafe(
        `create role ${quotedIdentifier(role)} login password 'TEST-only-enum-compatibility-password'`,
      );
      const limitedUrl = new URL(url);
      limitedUrl.username = role;
      limitedUrl.password = password;
      let failure: unknown;
      try {
        await migrateLatest(limitedUrl.toString());
      } catch (error) {
        failure = error;
      }
      if (sqlState(failure) !== "42501") throw new Error("Enum ownership failure did not return 42501.");
      const client = validationClient(url);
      try {
        const catalog = await collectCatalog(client);
        if (catalog.journalMillis !== 1_785_611_033_629 || catalog.enumLabels.includes("finalizing")) {
          throw new Error("Failed enum transaction left durable changes.");
        }
      } finally {
        await client.end();
        await admin.unsafe(`drop role ${quotedIdentifier(role)}`);
      }
      evidence.push({ scenario: "Enum addition transaction failure", result: "passed", sqlState: "42501" });
    });

    for (const fault of ["0011", "0013"] as const) {
      await withDatabase(`${fault}_failure`, async (url) => {
        await applyThrough(url, 10);
        try {
          await migrateLatest(url, (event) => {
            if (event.stage === "preflight_committed") throw new Error("TEST-stop-after-preflight");
          });
        } catch (error) {
          if (!(error instanceof Error) || error.message !== "TEST-stop-after-preflight") throw error;
        }
        const client = validationClient(url);
        try {
          if (fault === "0011") {
            await client`create type object_cleanup_status as enum ('TEST-conflict')`;
          } else {
            await client`create type object_cleanup_status_before_standby as enum ('TEST-conflict')`;
          }
        } finally {
          await client.end();
        }
        let failure: unknown;
        try {
          await migrateLatest(url);
        } catch (error) {
          failure = error;
        }
        const failureSqlState = sqlState(failure);
        if (!failureSqlState) {
          const summary = failure instanceof Error
            ? `${failure.name}:${failure.message}`
            : String(failure);
          throw new Error(`${fault} failure did not return SQLSTATE (${summary}).`);
        }
        const verification = validationClient(url);
        try {
          const catalog = await collectCatalog(verification);
          if (catalog.journalMillis !== 1_785_611_033_629) {
            throw new Error(`${fault} failure advanced the Journal.`);
          }
          if (JSON.stringify(catalog.enumLabels) !== JSON.stringify(expectedEnumLabels)) {
            throw new Error(`${fault} failure lost the committed preflight enum.`);
          }
          const rolledBackTable = await verification<{ exists: boolean }[]>`
            select to_regclass('public.upload_recovery_jobs') is not null as exists
          `;
          if (rolledBackTable[0]?.exists) throw new Error(`${fault} failure left partial later Schema.`);
        } finally {
          await verification.end();
        }
        evidence.push({
          scenario: `${fault} later SQL failure rollback`,
          result: "passed",
          sqlState: failureSqlState,
          journalMillis: 1_785_611_033_629,
        });
      });
    }

    await withDatabase("concurrency", async (url) => {
      await applyThrough(url, 10);
      let releaseFirst: (() => void) | undefined;
      const firstMayContinue = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      let firstLocked: (() => void) | undefined;
      const firstHasLock = new Promise<void>((resolve) => {
        firstLocked = resolve;
      });
      const first = migrateLatest(url, async (event) => {
        if (event.stage === "lock_acquired") {
          firstLocked?.();
          await firstMayContinue;
        }
      });
      await firstHasLock;
      let secondFailure: unknown;
      try {
        await migrateLatest(url);
      } catch (error) {
        secondFailure = error;
      }
      if (
        !(secondFailure instanceof PostgresMigrationCompatibilityError) ||
        secondFailure.code !== "LOCK_UNAVAILABLE"
      ) {
        throw new Error("Second migration process crossed the Session Advisory Lock.");
      }
      releaseFirst?.();
      const firstEvents = await first;
      const afterRelease = await migrateLatest(url);
      evidence.push({
        scenario: "Two migration clients and normal lock release",
        result: "passed",
        backendPids: [...assertOneBackend(firstEvents), ...assertOneBackend(afterRelease)],
      });
    });

    await withDatabase("connection_drop_lock", async (url) => {
      const ownerPool = validationClient(url);
      const owner = await ownerPool.reserve();
      const ownerRows = await owner<{ pid: number; locked: boolean }[]>`
        select pg_backend_pid() as pid,
          pg_try_advisory_lock(
            ${POSTGRES_MIGRATION_LOCK_KEYS[0]}::integer,
            ${POSTGRES_MIGRATION_LOCK_KEYS[1]}::integer
          ) as locked
      `;
      const ownerPid = ownerRows[0]?.pid;
      if (!ownerRows[0]?.locked || !ownerPid) throw new Error("Test lock owner was not established.");
      const killer = validationClient(url);
      try {
        const terminated = await killer<{ terminated: boolean }[]>`
          select pg_terminate_backend(${ownerPid}) as terminated
        `;
        if (!terminated[0]?.terminated) throw new Error("Lock owner connection was not terminated.");
      } finally {
        await killer.end();
      }
      owner.release();
      await ownerPool.end({ timeout: 0 });
      const successor = validationClient(url);
      try {
        const lockRows = await successor<{ locked: boolean }[]>`
          select pg_try_advisory_lock(
            ${POSTGRES_MIGRATION_LOCK_KEYS[0]}::integer,
            ${POSTGRES_MIGRATION_LOCK_KEYS[1]}::integer
          ) as locked
        `;
        if (!lockRows[0]?.locked) throw new Error("Session lock survived backend termination.");
        await successor`
          select pg_advisory_unlock(
            ${POSTGRES_MIGRATION_LOCK_KEYS[0]}::integer,
            ${POSTGRES_MIGRATION_LOCK_KEYS[1]}::integer
          )
        `;
      } finally {
        await successor.end();
      }
      evidence.push({ scenario: "Backend termination releases Session Advisory Lock", result: "passed" });
    });

    await withDatabase("catalog_mismatch", async (url) => {
      const client = validationClient(url);
      try {
        await client`create type asset_upload_batch_status as enum ('created')`;
      } finally {
        await client.end();
      }
      let failure: unknown;
      try {
        await migrateLatest(url);
      } catch (error) {
        failure = error;
      }
      if (
        !(failure instanceof PostgresMigrationCompatibilityError) ||
        failure.code !== "JOURNAL_CATALOG_MISMATCH"
      ) {
        throw new Error("Catalog contradiction did not fail closed.");
      }
      evidence.push({ scenario: "Journal and Catalog contradiction", result: "passed" });
    });

    process.stdout.write(`${JSON.stringify({
      status: "passed",
      postgresVersion: (await admin<{ server_version: string }[]>`show server_version`)[0]?.server_version,
      gitScope: "new disposable validation databases only",
      scenarios: evidence,
    }, null, 2)}\n`);
  } finally {
    await admin.end();
  }
}

void main();
