import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryArg = process.argv.find((value) => value.startsWith("--repository="));
const root = repositoryArg === undefined
  ? resolve(import.meta.dirname, "../../..")
  : resolve(repositoryArg.slice("--repository=".length));
const require = createRequire(resolve(root, "package.json"));
const ts = require("typescript");

function tableColumns(symbol) {
  const path = resolve(root, "src/db/schema/ai.ts");
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let result;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === symbol &&
      node.initializer && ts.isCallExpression(node.initializer)) {
      const columns = node.initializer.arguments[1];
      assert.ok(ts.isObjectLiteralExpression(columns));
      result = columns.properties.map((property) => {
        assert.ok(ts.isPropertyAssignment(property));
        let physical;
        function findString(candidate) {
          if (physical === undefined && ts.isStringLiteral(candidate)) physical = candidate.text;
          else if (physical === undefined) ts.forEachChild(candidate, findString);
        }
        findString(property.initializer);
        assert.equal(typeof physical, "string");
        return physical;
      });
    }
    ts.forEachChild(node, visit);
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
  assert.ok(match);
  return match[1].split("\n")
    .map((line) => /^\s*"([^"]+)"\s/u.exec(line)?.[1])
    .filter(Boolean);
}

const design = readFileSync(
  resolve(root, "docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_10.md"),
  "utf8",
);
const migration = readFileSync(resolve(root, "drizzle/0020_phase1b_ai_foundation.sql"), "utf8");
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

const manifest = JSON.parse(readFileSync(resolve(root, "src/ai/prompts/resources/production/manifest.v1.json"), "utf8"));
assert.deepEqual(manifest, { manifestVersion: 1, entries: [] });

const providerRegistry = readFileSync(resolve(root, "src/ai/providers/registry.ts"), "utf8");
assert.match(providerRegistry, /createTextProviderRegistryV1\(\[\]\)/u);
assert.doesNotMatch(providerRegistry, /https?:|api[_-]?key|credential|fallback|openai|anthropic|deepseek/iu);

const contracts = readFileSync(resolve(root, "src/ai/applications/draft-assistance/contracts.ts"), "utf8");
const useCaseMatch = /export const productionAiUseCases = \[([^]*?)\] as const;/u.exec(contracts);
assert.ok(useCaseMatch);
const useCases = [...useCaseMatch[1].matchAll(/"([^"]+)"/gu)].map((match) => match[1]);
assert.deepEqual(useCases, [
  "seo_content_draft",
  "fabric_knowledge_draft",
  "product_description_draft",
  "sourcing_guide_draft",
]);

process.stdout.write(`${JSON.stringify({
  ok: true,
  node: process.versions.node,
  typescript: ts.version,
  schema: {
    aiModelConfig: `${configDesign.length}/${configSchema.length}/${configMigration.length}`,
    aiRuns: `${runsDesign.length}/${runsSchema.length}/${runsMigration.length}`,
    exactOrder: true,
  },
  productionPromptManifest: "exact-empty",
  productionProviderRegistry: "exact-empty",
  productionDraftUseCases: useCases,
}, null, 2)}\n`);
