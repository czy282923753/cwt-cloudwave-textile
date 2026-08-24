import { execFileSync, spawnSync } from "node:child_process";
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
});
