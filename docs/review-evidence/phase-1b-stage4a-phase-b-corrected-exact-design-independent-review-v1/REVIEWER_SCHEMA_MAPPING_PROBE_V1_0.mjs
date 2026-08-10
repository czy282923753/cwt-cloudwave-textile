import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const require = createRequire(resolve(repositoryRoot, "package.json"));
const ts = require("typescript");
const schemaPath = resolve(repositoryRoot, "src/db/schema/ai.ts");
const schemaText = readFileSync(schemaPath, "utf8");
const source = ts.createSourceFile(schemaPath, schemaText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

function tableColumns(symbol) {
  let result;
  function visit(node) {
    if (!ts.isVariableDeclaration(node) || node.name.getText(source) !== symbol || !node.initializer || !ts.isCallExpression(node.initializer)) {
      ts.forEachChild(node, visit);
      return;
    }
    const columns = node.initializer.arguments[1];
    assert.ok(ts.isObjectLiteralExpression(columns));
    result = columns.properties.map((property) => {
      assert.ok(ts.isPropertyAssignment(property));
      let physical;
      function findString(candidate) {
        if (physical) return;
        if (ts.isStringLiteral(candidate)) physical = candidate.text;
        else ts.forEachChild(candidate, findString);
      }
      findString(property.initializer);
      assert.ok(physical, property.name.getText(source));
      return physical;
    });
  }
  visit(source);
  assert.ok(result);
  return result;
}

function designFields(markdown, startHeading, endHeading) {
  const start = markdown.indexOf(startHeading);
  const end = markdown.indexOf(endHeading, start + startHeading.length);
  assert.ok(start >= 0 && end > start);
  return [...markdown.slice(start, end).matchAll(/^\| `([^`]+)` \|/gmu)].map((match) => match[1]);
}

function migrationColumns(sql, table) {
  const match = new RegExp(`CREATE TABLE "${table}" \\(([^]*?)\\n\\);`, "u").exec(sql);
  assert.ok(match, table);
  return match[1].split("\n")
    .map((line) => /^\s*"([^"]+)"\s/u.exec(line)?.[1])
    .filter(Boolean);
}

const design = readFileSync(
  resolve(repositoryRoot, "docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_5.md"),
  "utf8",
);
const migration = readFileSync(resolve(repositoryRoot, "drizzle/0020_phase1b_ai_foundation.sql"), "utf8");
const configSchema = tableColumns("aiModelConfig");
const runsSchema = tableColumns("aiRuns");
const configDesign = designFields(design, "### 11.1 `ai_model_config`", "### 11.2 `ai_runs`");
const runsDesign = designFields(design, "### 11.2 `ai_runs`", "## 12. Prompt Registry");
const configMigration = migrationColumns(migration, "ai_model_config");
const runsMigration = migrationColumns(migration, "ai_runs");

assert.equal(configSchema.length, 21);
assert.equal(runsSchema.length, 96);
assert.deepEqual(configDesign, configSchema);
assert.deepEqual(runsDesign, runsSchema);
assert.deepEqual(configMigration, configSchema);
assert.deepEqual(runsMigration, runsSchema);

console.log("AI_MODEL_CONFIG=21/21 DESIGN=DRIZZLE=MIGRATION ORDER_EXACT");
console.log("AI_RUNS=96/96 DESIGN=DRIZZLE=MIGRATION ORDER_EXACT");
console.log("SUMMARY SCHEMA_MAPPING_PROBE=PASS");
