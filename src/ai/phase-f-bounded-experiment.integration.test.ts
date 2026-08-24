import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const bootstrapPath = "scripts/phase-f-bounded-bootstrap.ts";
const exercisePath = "scripts/phase-f-bounded-exercise.ts";
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

function exportsOf(path: string): readonly string[] {
  const source = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const names: string[] = [];
  for (const statement of source.statements) {
    const exported = (ts.canHaveModifiers(statement) &&
      ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true) ||
      ts.isExportAssignment(statement) || ts.isExportDeclaration(statement);
    if (exported) names.push(ts.SyntaxKind[statement.kind]);
  }
  return names;
}

function importsOf(path: string): readonly string[] {
  const source = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return source.statements.filter(ts.isImportDeclaration).map((statement) => {
    if (!ts.isStringLiteral(statement.moduleSpecifier)) throw new Error(`Non-literal import in ${path}.`);
    return statement.moduleSpecifier.text;
  });
}

describe("Phase F bounded experiment CSR-01 static boundary", () => {
  it("keeps exactly two private zero-export executable roots unreachable from Product runtime", () => {
    expect(exportsOf(bootstrapPath)).toEqual([]);
    expect(exportsOf(exercisePath)).toEqual([]);
    const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
      .trim().split("\n").filter(Boolean);
    const runtimeImporters = tracked.filter((path) => path !== bootstrapPath && path !== exercisePath &&
      /\.(?:[cm]?[jt]sx?)$/u.test(path) && /(?:from\s*|import\s*\()\s*["'][^"']*phase-f-bounded-(?:bootstrap|exercise)/u.test(read(path)));
    expect(runtimeImporters).toEqual([]);
    expect(
      tracked.filter(
        (path) => path.startsWith("src/") && path.toLowerCase().includes("phase-f") && !path.endsWith(".test.ts"),
      ),
    ).toEqual([]);
    expect(tracked.filter((path) => /^scripts\/phase-f-bounded-[a-z-]+\.ts$/u.test(path)))
      .toEqual([bootstrapPath, exercisePath]);
  });

  it("fixes the bootstrap to the four reviewed config tuples and exact privileged imports", () => {
    const source = read(bootstrapPath);
    expect(importsOf(bootstrapPath)).toEqual([
      "server-only",
      "drizzle-orm",
      "@/ai/config/model-config-service",
      "@/ai/output/registry",
      "@/ai/providers/registry",
      "@/ai/prompts/loader",
      "@/auth/password",
      "@/audit/governed-mutation",
      "@/db/client",
      "@/db/schema",
      "@/integrations/ai/providers/deepseek-pricing",
      "@/integrations/ai/providers/deepseek-text-adapter",
    ]);
    for (const [useCase, promptId, promptHash] of [
      ["product_description_draft", "product-description-draft", "0aefaeb2dba08c76587f6501451dc0031b6f825ab3bb903be00f28dda5e0b198"],
      ["seo_content_draft", "seo-content-draft", "91f8868efad16310a5ed26c85a6001024572949c59725efe2b6c0df935499195"],
      ["fabric_knowledge_draft", "fabric-knowledge-draft", "b3b65d50e9ea0d5f5da2e0dca25d808463a47fbf59a7dfcb9b71b64823501a8c"],
      ["sourcing_guide_draft", "sourcing-guide-draft", "e4aaf2e39483bde7569edb529f1c1d213b0a11d68ac4a9b99075992620238adf"],
    ] as const) {
      expect(source.match(new RegExp(`useCase: "${useCase}"`, "gu"))).toHaveLength(1);
      expect(source).toContain(`promptId: "${promptId}"`);
      expect(source).toContain(`promptHash: "${promptHash}"`);
    }
    for (const required of [
      "provider: DEEPSEEK_TEXT_PROVIDER_KEY_V1",
      "model: DEEPSEEK_TEXT_MODEL_ALIAS_V1",
      "parameters: { temperature: 0 }",
      "maxInputTokens: 16_000",
      "maxOutputTokens: 200",
      "maxAttempts: 1",
      "runCostLimitMicrousd: 20_000",
      "promptVersion: 1",
      "fallbackConfigId !== null",
      "const created = await service.create(",
      "const activated = await service.activateDefault(",
      "featureAiEnabled: false",
      "configs,",
    ]) expect(source).toContain(required);
    expect(source).not.toContain("DEEPSEEK_API_KEY");
    expect(source).not.toMatch(/\.prepareTextDispatch\s*\(|\.dispatch\s*\(/u);
    expect(source).not.toMatch(/retry|rerun/iu);
  });

  it("preserves the exercise byte identity and exact 15-value contract", () => {
    const source = read(exercisePath);
    expect(createHash("sha256").update(source).digest("hex"))
      .toBe("dc72feb2920501240b8137fa5ab129e8be42dfd3f321b053cdaac7a3ef329ed6");
    const caseArguments = [...source.matchAll(
      /(?:targetIdArgument|targetVersionArgument|idempotencyArgument): "(?<name>--[a-z-]+)"/gu,
    )].map((match) => match.groups?.name);
    expect(new Set(["--actor-id", "--window-start", "--window-exclusive-end", ...caseArguments]).size).toBe(15);
    expect(caseArguments).toHaveLength(12);
  });

  it("has a closed four-case vocabulary and no caller-selected Provider, Prompt, cap, fallback, Publish or Index input", () => {
    const source = read(exercisePath);
    for (const useCase of [
      "product_description_draft",
      "seo_content_draft",
      "fabric_knowledge_draft",
      "sourcing_guide_draft",
    ]) expect(source.match(new RegExp(`useCase: "${useCase}"`, "gu"))).toHaveLength(2);
    for (const denied of ["--use-case", "--task", "--brief", "--provider", "--model", "--fallback", "--cap", "--publish", "--index"]) {
      expect(source).not.toContain(`"${denied}"`);
    }
    expect(source).toContain("fixedArguments");
    expect(source).toContain("runCostLimitMicrousd > perRowReservationCapMicrousd");
    expect(source).toContain("prepared.resolvedConfig.maxAttempts !== 1");
    expect(source).toContain("slotCount: 1");
  });

  it("binds private source, request, association, config, Provider/model, Prompt and limits across both accepted seams", () => {
    const source = read(exercisePath);
    for (const required of [
      "attestExplicitSource(input)",
      "authorizePreConfiguration(input)",
      "authorizePreparedRun(input)",
      "requestFingerprint: input.requestFingerprint",
      "inputHash: input.inputHash",
      "sameExplicitSource(prepared.inputSources, current.inputSources)",
      "associationMatches(current, prepared)",
      "prepared.resolvedConfig.requestedProvider !== DEEPSEEK_TEXT_PROVIDER_KEY_V1",
      "prepared.resolvedConfig.requestedModel !== DEEPSEEK_TEXT_MODEL_ALIAS_V1",
      "prepared.promptIdentity.promptHash !== current.specification.promptHash",
      "active = undefined",
    ]) expect(source).toContain(required);
    expect(source).not.toMatch(/\b(?:Proxy|eval|Function)\s*\(/u);
    expect(source).not.toMatch(/\bas\s+(?:any|unknown)\b/u);
    expect(source).not.toMatch(/canonicalJsonHash|createHash|requestFingerprintV/u);
  });

  it("uses one statement_timestamp observation and contains no new current-window clock/session framework", () => {
    const source = read(exercisePath);
    expect(source.match(/statement_timestamp\(\)/gu)).toHaveLength(1);
    expect(source).not.toMatch(/Date\.now\s*\(|new\s+Date\s*\(/u);
    expect(source).not.toMatch(/assertActive|controller|session|lease|renew|cutoffChannel|timeService/iu);
    expect(read(bootstrapPath)).not.toMatch(/controller|session|lease|materialization|storageWriter|timeService/iu);
  });

  it("rejects extra executable arguments before any database mutation path", () => {
    const common = {
      cwd: root,
      encoding: "utf8" as const,
      env: {
        ...process.env,
        NODE_OPTIONS: "--conditions=react-server",
        DATABASE_DRIVER: "pglite",
        PGLITE_DATA_DIR: "memory://",
      },
    };
    const bootstrap = spawnSync(process.execPath, ["--import=tsx", bootstrapPath, "unexpected"], common);
    expect(bootstrap.status).toBe(1);
    expect(bootstrap.stderr).toContain("accepts no CLI arguments");
    const exercise = spawnSync(process.execPath, ["--import=tsx", exercisePath, "--use-case", "fifth"], common);
    expect(exercise.status).toBe(1);
    expect(exercise.stderr).toContain("exact fixed argument set");
  });

  it("fails closed on the exact Phase F runtime-authority adversarial set", () => {
    const checkerPath = "scripts/verify-ai-architecture.ts";
    const checkerSource = read(checkerPath);
    expect(checkerSource).not.toContain("exactPhaseFExecutableEdge");
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
    expect(JSON.parse(output)).toMatchObject({
      ok: true,
      phaseFRuntimeAuthorityMutationCount: 7,
      phaseFProtectedBoundaryControlCount: 1,
    });
  }, 120_000);
});
