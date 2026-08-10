import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function section(document, start, end) {
  const startAt = document.indexOf(start);
  const endAt = document.indexOf(end, startAt + start.length);
  assert.notEqual(startAt, -1, `missing ${start}`);
  assert.notEqual(endAt, -1, `missing ${end}`);
  return document.slice(startAt, endAt);
}

function designColumns(document, start, end) {
  return section(document, start, end)
    .split("\n")
    .filter((line) => /^\| `[^`]+` \|/.test(line))
    .map((line) => line.split("|")[1].trim().replaceAll("`", ""));
}

function deepestStringLiteral(node) {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isCallExpression(node)) {
    const fromExpression = deepestStringLiteral(node.expression);
    if (fromExpression !== null) return fromExpression;
    for (const argument of node.arguments) {
      const found = deepestStringLiteral(argument);
      if (found !== null) return found;
    }
  }
  if (ts.isPropertyAccessExpression(node)) return deepestStringLiteral(node.expression);
  return null;
}

function drizzleColumns(sourceText, variableName) {
  const source = ts.createSourceFile("ai.ts", sourceText, ts.ScriptTarget.Latest, true);
  let result = null;
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === variableName &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    ) {
      const object = node.initializer.arguments[1];
      assert.ok(object && ts.isObjectLiteralExpression(object), `${variableName} column object missing`);
      result = object.properties.map((property) => {
        assert.ok(ts.isPropertyAssignment(property), `${variableName} contains non-property column`);
        const literal = deepestStringLiteral(property.initializer);
        assert.ok(literal, `${variableName} column has no database name`);
        return literal;
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(result, `${variableName} declaration missing`);
  return result;
}

function migrationColumns(sql, tableName) {
  const marker = `CREATE TABLE "${tableName}" (`;
  const start = sql.indexOf(marker);
  assert.notEqual(start, -1, `${tableName} migration table missing`);
  const end = sql.indexOf("\n);", start + marker.length);
  assert.notEqual(end, -1, `${tableName} migration table end missing`);
  return sql.slice(start + marker.length, end)
    .split("\n")
    .flatMap((line) => {
      const match = /^\s*"([^"]+)"\s/.exec(line);
      return match ? [match[1]] : [];
    });
}

const [designBuffer, snapshotBuffer, schemaText, migrationText] = await Promise.all([
  readFile("docs/PHASE_1B_STAGE4A_PHASE_A_0020_AI_FOUNDATION_SCHEMA_DESIGN_V1_0.md"),
  readFile("drizzle/meta/0020_snapshot.json"),
  readFile("src/db/schema/ai.ts", "utf8"),
  readFile("drizzle/0020_phase1b_ai_foundation.sql", "utf8"),
]);
const design = designBuffer.toString("utf8");
const snapshot = JSON.parse(snapshotBuffer);

const tables = [
  {
    table: "ai_model_config",
    variable: "aiModelConfig",
    expected: 21,
    design: designColumns(design, "### 4.1 Columns", "### 4.2 Foreign keys"),
  },
  {
    table: "ai_runs",
    variable: "aiRuns",
    expected: 96,
    design: designColumns(design, "### 5.1 Identity", "## 6. `ai_runs` foreign keys"),
  },
];

const output = [];
for (const entry of tables) {
  const snapshotColumns = Object.values(snapshot.tables[`public.${entry.table}`].columns)
    .map((column) => column.name);
  const schemaColumns = drizzleColumns(schemaText, entry.variable);
  const sqlColumns = migrationColumns(migrationText, entry.table);
  assert.equal(entry.design.length, entry.expected);
  assert.deepEqual(snapshotColumns, entry.design);
  assert.deepEqual(schemaColumns, entry.design);
  assert.deepEqual(sqlColumns, entry.design);
  output.push({
    table: entry.table,
    count: entry.expected,
    orderSha256: sha256(entry.design.join("\n")),
    designSnapshotDrizzleMigrationExact: true,
  });
}

process.stdout.write(JSON.stringify({
  ok: true,
  acceptedDesignSha256: sha256(designBuffer),
  snapshotSha256: sha256(snapshotBuffer),
  tables: output,
}, null, 2) + "\n");
