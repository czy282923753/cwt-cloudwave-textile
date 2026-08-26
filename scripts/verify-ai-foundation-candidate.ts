import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const approvedDesignSha256 =
  "db6ae44d3548e2c0c23ab2b95ee3550fefedb93224f878f5a9ab3070898b60a8";
const historicalFilesSha256 =
  "b71aff17998f5352dbd63a7b8be51f89ac4c34530cba6e22474922219822d903";
const journalPrefixSha256 =
  "e9227f4e2929f3add18e0efade5ff23d935967a6dbd21d45df18bc262ebc8852";

const root = process.cwd();
const designPath = path.join(
  root,
  "docs/PHASE_1B_STAGE4A_PHASE_A_0020_AI_FOUNDATION_SCHEMA_DESIGN_V1_0.md",
);
const migrationPath = path.join(root, "drizzle/0020_phase1b_ai_foundation.sql");
const previousSnapshotPath = path.join(root, "drizzle/meta/0019_snapshot.json");
const snapshotPath = path.join(root, "drizzle/meta/0020_snapshot.json");
const successorMigrationPath = path.join(root, "drizzle/0021_phase_f_k1_run_cost_ceiling.sql");
const successorSnapshotPath = path.join(root, "drizzle/meta/0021_snapshot.json");
const journalPath = path.join(root, "drizzle/meta/_journal.json");

type SnapshotColumn = {
  name: string;
  type: string;
  primaryKey: boolean;
  notNull: boolean;
  default?: string | number | boolean;
};

type SnapshotIndex = {
  name: string;
  isUnique: boolean;
  where?: string;
};

type SnapshotForeignKey = {
  name: string;
  onDelete?: string;
  onUpdate?: string;
};

type SnapshotCheck = {
  name: string;
  value: string;
};

type SnapshotTable = {
  columns: Record<string, SnapshotColumn>;
  indexes: Record<string, SnapshotIndex>;
  foreignKeys: Record<string, SnapshotForeignKey>;
  checkConstraints: Record<string, SnapshotCheck>;
};

type Snapshot = {
  id: string;
  prevId: string;
  version: string;
  dialect: string;
  tables: Record<string, SnapshotTable>;
  enums: unknown;
  schemas: unknown;
  sequences: unknown;
  roles: unknown;
  policies: unknown;
  views: unknown;
  _meta: unknown;
};

type Journal = {
  entries: Array<{
    idx: number;
    version: string;
    when: number;
    tag: string;
    breakpoints: boolean;
  }>;
};

type DesignColumn = {
  name: string;
  type: string;
  nullable: "Yes" | "No";
  defaultValue: string;
};

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function section(document: string, start: string, end: string): string {
  const startAt = document.indexOf(start);
  const endAt = document.indexOf(end, startAt + start.length);
  assert.notEqual(startAt, -1, `Missing design section: ${start}`);
  assert.notEqual(endAt, -1, `Missing design section terminator: ${end}`);
  return document.slice(startAt, endAt);
}

function cleanMarkdownCode(value: string): string {
  return value.replaceAll("`", "").trim();
}

function tableCells(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function parseDesignColumns(value: string): DesignColumn[] {
  return value
    .split("\n")
    .filter((line) => /^\| `[^`]+` \|/.test(line))
    .map((line) => {
      const cells = tableCells(line);
      assert.ok(cells.length >= 4, `Malformed design column row: ${line}`);
      const nullable = cells[2];
      assert.ok(nullable === "Yes" || nullable === "No", `Invalid nullability: ${line}`);
      return {
        name: cleanMarkdownCode(cells[0]!),
        type: cleanMarkdownCode(cells[1]!),
        nullable,
        defaultValue: cleanMarkdownCode(cells[3]!),
      };
    });
}

function parseNamedRows(value: string): string[] {
  return value
    .split("\n")
    .filter((line) => /^\| `[^`]+` \|/.test(line))
    .map((line) => cleanMarkdownCode(tableCells(line)[0]!));
}

function normalizedDesignType(type: string): string {
  if (type === "timestamptz") return "timestamp with time zone";
  if (type === "existing app_environment enum") return "app_environment";
  return type;
}

function normalizedDesignDefault(value: string): string | undefined {
  if (value === "none" || value === "NULL") return undefined;
  return value;
}

function normalizedSnapshotDefault(value: SnapshotColumn["default"]): string | undefined {
  return value === undefined ? undefined : String(value);
}

function assertColumnsMatchDesign(
  tableName: string,
  table: SnapshotTable,
  designColumns: DesignColumn[],
): void {
  const snapshotColumns = Object.values(table.columns);
  assert.deepEqual(
    snapshotColumns.map((column) => column.name),
    designColumns.map((column) => column.name),
    `${tableName} column names/order differ from the approved design`,
  );

  for (const designColumn of designColumns) {
    const snapshotColumn = table.columns[designColumn.name];
    assert.ok(snapshotColumn, `${tableName}.${designColumn.name} missing from snapshot`);
    assert.equal(
      snapshotColumn.type,
      normalizedDesignType(designColumn.type),
      `${tableName}.${designColumn.name} type mismatch`,
    );
    assert.equal(
      snapshotColumn.notNull,
      designColumn.nullable === "No",
      `${tableName}.${designColumn.name} nullability mismatch`,
    );
    assert.equal(
      normalizedSnapshotDefault(snapshotColumn.default),
      normalizedDesignDefault(designColumn.defaultValue),
      `${tableName}.${designColumn.name} default mismatch`,
    );
  }
}

function assertNamedCatalog(
  label: string,
  actual: string[],
  expected: string[],
): void {
  assert.deepEqual([...actual].sort(), [...expected].sort(), `${label} differs from design`);
}

async function historicalFilesDigest(): Promise<string> {
  const migrationNames = await readdir(path.join(root, "drizzle"));
  const snapshotNames = await readdir(path.join(root, "drizzle/meta"));
  const historicalPaths: string[] = [];

  for (let migrationNumber = 0; migrationNumber < 20; migrationNumber += 1) {
    const prefix = String(migrationNumber).padStart(4, "0");
    const sqlMatches = migrationNames.filter(
      (name) => name.startsWith(`${prefix}_`) && name.endsWith(".sql"),
    );
    const snapshotMatches = snapshotNames.filter(
      (name) => name.startsWith(`${prefix}_`) && name.endsWith("_snapshot.json"),
    );
    assert.equal(sqlMatches.length, 1, `Expected one historical SQL file for ${prefix}`);
    assert.equal(snapshotMatches.length, 1, `Expected one historical snapshot for ${prefix}`);
    historicalPaths.push(
      path.join("drizzle", sqlMatches[0]!),
      path.join("drizzle/meta", snapshotMatches[0]!),
    );
  }

  const entries: string[] = [];
  for (const relativePath of historicalPaths.sort()) {
    const contents = await readFile(path.join(root, relativePath));
    entries.push(`${relativePath}\0${sha256(contents)}\n`);
  }
  return sha256(entries.join(""));
}

async function main(): Promise<void> {
  const [designBuffer, migration, previousSnapshotBuffer, snapshotBuffer, journalBuffer] =
    await Promise.all([
      readFile(designPath),
      readFile(migrationPath, "utf8"),
      readFile(previousSnapshotPath, "utf8"),
      readFile(snapshotPath, "utf8"),
      readFile(journalPath, "utf8"),
    ]);
  const design = designBuffer.toString("utf8");
  const previousSnapshot = JSON.parse(previousSnapshotBuffer) as Snapshot;
  const snapshot = JSON.parse(snapshotBuffer) as Snapshot;
  const journal = JSON.parse(journalBuffer) as Journal;

  assert.equal(sha256(designBuffer), approvedDesignSha256, "Approved design identity changed");
  assert.equal(
    await historicalFilesDigest(),
    historicalFilesSha256,
    "A historical 0000-0019 SQL or snapshot identity changed",
  );
  assert.equal(
    sha256(JSON.stringify(journal.entries.slice(0, 20))),
    journalPrefixSha256,
    "The historical 0000-0019 journal prefix changed",
  );
  assert.equal(journal.entries.length, 22, "Journal must contain the exact 0020 and 0021 appended entries");
  assert.deepEqual(journal.entries[20], {
    idx: 20,
    version: "7",
    when: journal.entries[20]?.when,
    tag: "0020_phase1b_ai_foundation",
    breakpoints: true,
  });
  assert.ok(Number.isInteger(journal.entries[20]?.when), "0020 journal timestamp must be an integer");
  assert.deepEqual(journal.entries[21], {
    idx: 21,
    version: "7",
    when: journal.entries[21]?.when,
    tag: "0021_phase_f_k1_run_cost_ceiling",
    breakpoints: true,
  });
  assert.ok(Number.isInteger(journal.entries[21]?.when), "0021 journal timestamp must be an integer");

  const successorMigration = await readFile(successorMigrationPath, "utf8");
  const successorSnapshot = JSON.parse(await readFile(successorSnapshotPath, "utf8")) as Snapshot;
  assert.equal(successorSnapshot.prevId, snapshot.id, "0021 snapshot does not follow 0020");
  assert.match(successorMigration, /SET DEFAULT 500000/u);
  assert.match(successorMigration, /ai_model_config_limits_check/u);
  assert.match(successorMigration, /ai_runs_environment_budget_policy_check/u);
  assert.doesNotMatch(successorMigration, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE)\b/iu, "0021 must not rewrite data");

  assert.equal(snapshot.prevId, previousSnapshot.id, "0020 snapshot does not follow 0019");
  assert.equal(snapshot.version, "7");
  assert.equal(snapshot.dialect, "postgresql");

  const newTables = Object.keys(snapshot.tables).filter(
    (tableName) => !(tableName in previousSnapshot.tables),
  );
  assert.deepEqual(newTables.sort(), ["public.ai_model_config", "public.ai_runs"]);
  for (const [tableName, previousTable] of Object.entries(previousSnapshot.tables)) {
    assert.deepEqual(snapshot.tables[tableName], previousTable, `${tableName} changed in 0020`);
  }
  for (const key of [
    "enums",
    "schemas",
    "sequences",
    "roles",
    "policies",
    "views",
    "_meta",
  ] as const) {
    assert.deepEqual(snapshot[key], previousSnapshot[key], `${key} changed in 0020`);
  }

  const modelConfigTable = snapshot.tables["public.ai_model_config"];
  const runsTable = snapshot.tables["public.ai_runs"];
  assert.ok(modelConfigTable);
  assert.ok(runsTable);

  const modelConfigColumns = parseDesignColumns(
    section(design, "### 4.1 Columns", "### 4.2 Foreign keys"),
  );
  const runColumns = parseDesignColumns(
    section(design, "### 5.1 Identity", "## 6. `ai_runs` foreign keys"),
  );
  assert.equal(modelConfigColumns.length, 21);
  assert.equal(runColumns.length, 96);
  assertColumnsMatchDesign("ai_model_config", modelConfigTable, modelConfigColumns);
  assertColumnsMatchDesign("ai_runs", runsTable, runColumns);

  const modelConfigChecks = parseNamedRows(
    section(design, "### 4.3 Check constraints", "### 4.4 Indexes"),
  );
  const runChecks = parseNamedRows(
    section(design, "## 7. `ai_runs` Check-constraint catalog", "## 8. `ai_runs` indexes"),
  );
  assert.equal(modelConfigChecks.length, 12);
  assert.equal(runChecks.length, 28);
  assertNamedCatalog(
    "ai_model_config Checks",
    Object.keys(modelConfigTable.checkConstraints),
    modelConfigChecks,
  );
  assertNamedCatalog("ai_runs Checks", Object.keys(runsTable.checkConstraints), runChecks);

  const modelConfigForeignKeys = parseNamedRows(
    section(design, "### 4.2 Foreign keys", "### 4.3 Check constraints"),
  );
  const runForeignKeys = parseNamedRows(
    section(design, "## 6. `ai_runs` foreign keys", "## 7. `ai_runs` Check-constraint catalog"),
  );
  assert.equal(modelConfigForeignKeys.length, 3);
  assert.equal(runForeignKeys.length, 8);
  assertNamedCatalog(
    "ai_model_config foreign keys",
    Object.keys(modelConfigTable.foreignKeys),
    modelConfigForeignKeys,
  );
  assertNamedCatalog("ai_runs foreign keys", Object.keys(runsTable.foreignKeys), runForeignKeys);
  for (const foreignKey of [
    ...Object.values(modelConfigTable.foreignKeys),
    ...Object.values(runsTable.foreignKeys),
  ]) {
    assert.equal(foreignKey.onDelete, "restrict", `${foreignKey.name} must use ON DELETE RESTRICT`);
    assert.equal(foreignKey.onUpdate, "no action", `${foreignKey.name} must use ON UPDATE NO ACTION`);
  }

  const modelConfigIndexes = parseNamedRows(
    section(design, "### 4.4 Indexes", "### 4.5 Domain Service invariants"),
  ).filter((name) => name !== "ai_model_config_pkey");
  const runIndexes = parseNamedRows(
    section(design, "## 8. `ai_runs` indexes", "## 9. Idempotent enqueue and retry"),
  ).filter((name) => name !== "ai_runs_pkey");
  assert.equal(modelConfigIndexes.length, 3);
  assert.equal(runIndexes.length, 15);
  assertNamedCatalog(
    "ai_model_config indexes",
    Object.keys(modelConfigTable.indexes),
    modelConfigIndexes,
  );
  assertNamedCatalog("ai_runs indexes", Object.keys(runsTable.indexes), runIndexes);

  assert.equal(modelConfigTable.indexes.ai_model_config_enabled_default_unique?.isUnique, true);
  assert.ok(modelConfigTable.indexes.ai_model_config_enabled_default_unique?.where);
  assert.equal(runsTable.indexes.ai_runs_idempotency_key_unique?.isUnique, true);
  assert.equal(runsTable.indexes.ai_runs_active_lease_token_unique?.isUnique, true);
  assert.ok(runsTable.indexes.ai_runs_active_lease_token_unique?.where);

  const createdTables = [...migration.matchAll(/CREATE TABLE "([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(createdTables.sort(), ["ai_model_config", "ai_runs"]);
  const alteredTables = [...migration.matchAll(/ALTER TABLE "([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.ok(
    alteredTables.every((tableName) => tableName === "ai_model_config" || tableName === "ai_runs"),
    "0020 may alter only its two new tables to add approved foreign keys",
  );
  assert.doesNotMatch(
    migration,
    /(?:^|\n)(?:CREATE (?:TYPE|EXTENSION|FUNCTION|TRIGGER|SCHEMA|VIEW|POLICY)|DROP |INSERT |UPDATE |DELETE |TRUNCATE )/i,
    "0020 contains forbidden DDL or data mutation",
  );
  assert.match(
    migration,
    /CREATE INDEX "ai_runs_budget_day_idx"[^\n]+\("budget_charge_day"\) INCLUDE \("budget_accounted_cost_microusd","budget_reserved_cost_microusd"\) WHERE/,
  );
  assert.match(
    migration,
    /CREATE INDEX "ai_runs_budget_month_idx"[^\n]+\("budget_charge_month"\) INCLUDE \("budget_accounted_cost_microusd","budget_reserved_cost_microusd"\) WHERE/,
  );
  assert.doesNotMatch(migration, /NULLS (?:FIRST|LAST)/, "Exact DESC indexes must not add NULLS syntax");

  process.stdout.write(
    "AI foundation candidate verification passed: approved design identity, 40 historical artifacts, journal append, exact columns/defaults/nullability/types, constraints, indexes, and scope.\n",
  );
}

void main();
