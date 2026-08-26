import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const runner = "scripts/phase-f-m6-one-case-diagnostic.ts";
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

type TerminalObservation = {
  readonly status: string;
  readonly providerResponseStatus: string;
  readonly failureCode: string | null;
};

function loadTerminalDecision(): (input: TerminalObservation) => boolean {
  const source = read(runner);
  const ast = ts.createSourceFile(runner, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const declarations = ast.statements.filter((statement) =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === "mayContinueAfterTerminal" ||
    ts.isVariableStatement(statement) && statement.declarationList.declarations.some((declaration) =>
      ts.isIdentifier(declaration.name) && declaration.name.text === "continuableTerminalOutcomes"));
  expect(declarations).toHaveLength(2);
  const executable = ts.transpileModule(
    `${declarations.map((statement) => statement.getText(ast)).join("\n")}\nmayContinueAfterTerminal;`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } },
  ).outputText;
  return runInNewContext(executable, Object.create(null)) as (input: TerminalObservation) => boolean;
}

describe("Phase F K1 four-call Product batch boundary", () => {
  it("keeps one private no-argument runner and exactly four immutable keys", () => {
    const source = read(runner);
    const ast = ts.createSourceFile(runner, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    expect(ast.statements.filter((statement) => ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some((item) => item.kind === ts.SyntaxKind.ExportKeyword))).toEqual([]);
    expect(source).toContain("process.argv.length !== 2");
    for (const key of [
      "702a422b-4bee-4130-bd8b-8f39c6e90528", "0b197c05-6005-4e3d-98a3-72f811f85a46",
      "07cd0500-39fa-4952-a3fe-7bcb8121edae", "33dec4ca-9690-44bb-8aba-ecc1978970da",
    ]) expect(source.match(new RegExp(key, "gu"))).toHaveLength(1);
    expect(source).not.toMatch(/seo_content_draft|fabric_knowledge_draft|sourcing_guide_draft|fifth|--use-case|--provider|--model/iu);
    expect(source.match(/requestDraftAssistance\s*\(/gu)).toHaveLength(1);
    expect(source.match(/createAiRunWorkerV1\s*\(/gu)).toHaveLength(1);
    expect(source).toContain("slotCount: 1");
  });

  it("uses stdin memory credential only and clears both mutable buffers", () => {
    const source = read(runner);
    expect(source).toContain("readFileSync(0)");
    expect(source).toContain("input.fill(0)");
    expect(source).toContain("credential.fill(0)");
    expect(source).toContain("credentialReader: () => credential.toString");
    expect(source).not.toContain("DEEPSEEK_API_KEY");
    expect(source).not.toMatch(/process\.env.*(?:credential|key)|Authorization|header/iu);
  });

  it("binds the singular 500000 authority and conservative prefix arithmetic", () => {
    const source = read(runner);
    expect(source).toContain("const attemptUpperMicrousd = 7_304");
    expect(source).toContain("const batchHardCapMicrousd = 500_000");
    expect(source).toContain("run_cost_limit_microusd=500000");
    expect(source).toContain("Math.max(row.budgetAccountedCostMicrousd, row.actualCostMicrousd, row.actualCostComplete ? 0 : attemptUpperMicrousd)");
    expect(source).toContain("accounted + attemptUpperMicrousd > batchHardCapMicrousd");
    expect(source).not.toMatch(/50_000|\b50000\b|20_000|\b20000\b/u);
  });

  it("uses one closed continuation allowlist with default-stop mutation behavior", () => {
    const mayContinue = loadTerminalDecision();
    const allowed = [
      ["draft_ready", "success", null],
      ["failed", "invalid_response", "output_empty"],
      ["failed", "invalid_response", "output_truncated"],
      ["failed", "invalid_response", "output_invalid_json"],
      ["failed", "invalid_response", "output_schema_invalid"],
      ["failed", "invalid_response", "output_policy_rejected"],
      ["failed", "invalid_response", "output_too_large"],
      ["failed", "safety_rejected", "provider_safety_rejected"],
      ["failed", "timeout", "provider_timeout"],
      ["failed", "rate_limited", "provider_rate_limited"],
      ["failed", "server_error", "provider_server_error"],
    ] as const;
    for (const [status, providerResponseStatus, failureCode] of allowed) {
      expect(mayContinue({ status, providerResponseStatus, failureCode })).toBe(true);
    }
    for (const [status, providerResponseStatus, failureCode] of [
      ["failed", "model_drift", "model_drift"],
      ["failed", "client_error", "provider_auth_failed"],
      ["failed", "quota_exceeded", "provider_quota_exceeded"],
      ["failed", "client_error", "provider_client_error"],
      ["failed", "transport_error", "provider_transport_error"],
      ["failed", "not_dispatched", "pricing_stale"],
      ["cancelled", "cancelled_no_response", "provider_cancelled"],
      ["failed", "unknown", "adapter_unexpected_failure"],
      ["failed", "invalid_response", null],
      ["draft_ready", "success", "output_schema_invalid"],
      ["failed", "future_terminal_category", "future_failure_code"],
    ] as const) {
      expect(mayContinue({ status, providerResponseStatus, failureCode })).toBe(false);
    }
  });

  it("places no-argument and closed stdin validation before Product work", () => {
    const source = read(runner);
    expect(source.indexOf("process.argv.length !== 2")).toBeLessThan(source.indexOf("const credential = readCredential()"));
    expect(source.indexOf("const credential = readCredential()")).toBeLessThan(source.indexOf("const fixture = await preflight()"));
    expect(source).toContain("input.length > 512");
    expect(source).toContain("input.includes(0)");
    expect(source).toContain("input.includes(10)");
    expect(source).toContain("input.includes(13)");
  });

  it("exposes only the bounded batch summary", () => {
    const line = read(runner).split("\n").find((value) => value.includes("process.stdout.write"));
    expect(line).toContain("plannedCount: 4");
    expect(line).toContain("publish: false");
    expect(line).toContain("index: false");
    expect(line).not.toMatch(/credential|candidateJson|inputContext|responseBody|Authorization/iu);
  });

  it("passes the exact architecture gate and adversarial runtime probes", () => {
    const output = execFileSync(process.execPath, ["--import=tsx", "scripts/verify-ai-architecture.ts"], {
      cwd: root, encoding: "utf8", env: { ...process.env, CWT_INSTALLED_NODE_MODULES: resolve(root, "node_modules") },
    });
    expect(JSON.parse(output)).toMatchObject({ ok: true, phaseFRuntimeAuthorityMutationCount: 7, phaseFProtectedBoundaryControlCount: 1 });
  }, 120_000);
});
