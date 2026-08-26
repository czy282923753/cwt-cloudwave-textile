import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const bootstrapPath = "scripts/phase-f-bounded-bootstrap.ts";
const diagnosticPath = "scripts/phase-f-m6-one-case-diagnostic.ts";
const obsoletePath = "scripts/phase-f-bounded-exercise.ts";
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

function exportsOf(path: string): readonly string[] {
  const source = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return source.statements.filter((statement) =>
    (ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true) ||
    ts.isExportAssignment(statement) || ts.isExportDeclaration(statement)).map((statement) => ts.SyntaxKind[statement.kind]);
}

function importsOf(path: string): readonly string[] {
  const source = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return source.statements.filter(ts.isImportDeclaration).map((statement) => {
    if (!ts.isStringLiteral(statement.moduleSpecifier)) throw new Error(`Non-literal import in ${path}.`);
    return statement.moduleSpecifier.text;
  });
}

describe("Phase F M6 one-case diagnostic static boundary", () => {
  it("replaces the obsolete path with exactly two private zero-export Phase F executables", () => {
    const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).trim().split("\n").filter(Boolean);
    expect(tracked).not.toContain(obsoletePath);
    expect(tracked.filter((path) => /^scripts\/phase-f-(?:bounded-bootstrap|m6-one-case-diagnostic)\.ts$/u.test(path)))
      .toEqual([bootstrapPath, diagnosticPath]);
    expect(exportsOf(bootstrapPath)).toEqual([]);
    expect(exportsOf(diagnosticPath)).toEqual([]);
    const importers = tracked.filter((path) => path !== diagnosticPath && /\.(?:[cm]?[jt]sx?)$/u.test(path) &&
      /(?:from\s*|import\s*\()\s*["'][^"']*phase-f-m6-one-case-diagnostic/u.test(read(path)));
    expect(importers).toEqual([]);
  });

  it("has the exact closed K1 identity, one use case, one request and no argument selector or second path", () => {
    const source = read(diagnosticPath);
    for (const required of [
      'const databaseName = "cwt_phase_f_synthetic_20260826_k1"',
      'const useCase = "product_description_draft"',
      'const fixtureId = "SYN-AI-PHASE-F-PRODUCT-DESCRIPTION-V1"',
      'const fixtureHash = "059362d1dbbf92db0746bfd4402ff6fe89c3815d82c134141c02896af473f5e8"',
      'const promptId = "product-description-draft"',
      'const promptHash = "0aefaeb2dba08c76587f6501451dc0031b6f825ab3bb903be00f28dda5e0b198"',
      'const idempotencyKey = "702a422b-4bee-4130-bd8b-8f39c6e90528"',
      'tone: "concise_professional_b2b"',
      "selectedMediaPlacementIds: []",
      'target: { type: "product_draft", productId: targetId, locale: "en", expectedVersion: 1 }',
      "process.argv.length !== 2",
      "slotCount: 1",
    ]) expect(source).toContain(required);
    expect(source.match(/requestDraftAssistance\s*\(/gu)).toHaveLength(1);
    expect(source.match(/const runId\s*=/gu)).toHaveLength(1);
    expect(source.match(/createAiRunWorkerV1\s*\(/gu)).toHaveLength(1);
    expect(source).not.toMatch(/\b(?:for|while|do)\s*\(/u);
    expect(source).not.toMatch(/fixedCases|case array|selector|second job|second request/iu);
    for (const denied of ["seo_content_draft", "fabric_knowledge_draft", "sourcing_guide_draft", "--use-case", "--provider", "--model", "--cap", "--publish", "--index"]) {
      expect(source).not.toContain(denied);
    }
  });

  it("uses only the reviewed canonical private authority and execution imports", () => {
    expect(importsOf(diagnosticPath)).toEqual([
      "server-only",
      "drizzle-orm",
      "@/ai/applications/draft-assistance/composition",
      "@/ai/applications/draft-assistance/context",
      "@/ai/applications/draft-assistance/contracts",
      "@/ai/core/contracts",
      "@/ai/errors",
      "@/ai/internal/worker-entry",
      "@/ai/providers/registry",
      "@/ai/prompts/loader",
      "@/db/client",
      "@/db/schema",
      "@/integrations/ai/providers/deepseek-pricing",
      "@/integrations/ai/providers/deepseek-text-adapter",
    ]);
    const source = read(diagnosticPath);
    for (const required of [
      "attestExplicitSource(input)",
      "authorizePreConfiguration(input)",
      "authorizePreparedRun(input)",
      "sameExplicitSource(prepared.inputSources, inputSources)",
      "associationMatches(fixture.targetId, prepared)",
      "prepared.resolvedConfig.maxAttempts !== 1",
      "prepared.resolvedConfig.runCostLimitMicrousd !== reservationCapMicrousd",
      "prepared.providerEnvelope.hash !== DEEPSEEK_TEXT_ENVELOPE_HASH_V1",
    ]) expect(source).toContain(required);
    expect(source).not.toMatch(/\b(?:Proxy|eval|Function)\s*\(/u);
    expect(source).not.toMatch(/\bas\s+(?:any|unknown)\b/u);
    expect(source).not.toMatch(/canonicalJsonHash|createHash|requestFingerprintV/u);
  });

  it("fails preflight on any prior run or used idempotency and exposes only safe scalar output", () => {
    const source = read(diagnosticPath);
    for (const required of [
      "Number(row.run_count) !== 0",
      "Number(row.idempotency_count) !== 0",
      "Number(row.actor_count) !== 1",
      "Number(row.product_count) !== 1",
      "Number(row.localization_count) !== 1",
      "Number(row.primary_category_count) !== 1",
      "Number(row.public_asset_count) !== 1",
      "Number(row.content_count) !== 0",
      "Number(row.author_count) !== 0",
      "Number(row.config_count) !== 1",
      "status: terminal.status, runId: terminal.id, attemptCount: terminal.attemptCount, publish: false, index: false",
    ]) expect(source).toContain(required);
    const safeOutput = source.split("\n").find((line) => line.includes("process.stdout.write"));
    expect(safeOutput).toBeDefined();
    expect(safeOutput).not.toMatch(/candidate|failure|provider|requestIdentity|raw|credential/iu);
  });

  it("rejects every CLI argument before query or Provider construction", () => {
    const source = read(diagnosticPath);
    expect(source.indexOf("process.argv.length !== 2")).toBeLessThan(source.indexOf("await preflight()"));
    expect(source.indexOf("process.argv.length !== 2")).toBeLessThan(source.indexOf("const providerRegistryResult"));
    const result = spawnSync(process.execPath, ["--import=tsx", diagnosticPath, "unexpected"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, NODE_OPTIONS: "--conditions=react-server", DATABASE_DRIVER: "pglite", PGLITE_DATA_DIR: "memory://" },
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("accepts no CLI arguments");
  });

  it("keeps the exact architecture gate and adversarial Phase F authority probes fail closed", () => {
    const checkerPath = "scripts/verify-ai-architecture.ts";
    const checkerSource = read(checkerPath);
    for (const probeId of [
      "phase-f-runtime-imports-test-only",
      "phase-f-runtime-imports-evidence-only",
      "phase-f-runtime-imports-unapproved-protected",
      "phase-f-runtime-imports-extra-server-authority",
      "phase-f-runtime-imports-public-browser",
      "phase-f-runtime-imports-project-tooling",
      "phase-f-bootstrap-imports-worker-authority",
    ]) expect(checkerSource).toContain(probeId);
    const output = execFileSync(process.execPath, ["--import=tsx", checkerPath], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, CWT_INSTALLED_NODE_MODULES: resolve(root, "node_modules") },
    });
    expect(JSON.parse(output)).toMatchObject({ ok: true, phaseFRuntimeAuthorityMutationCount: 7, phaseFProtectedBoundaryControlCount: 1 });
  }, 120_000);
});
