import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const verifierPath = join(projectRoot, "scripts/verify-ai-prompt-bundle.ts");
const generatorPath = join(projectRoot, "scripts/generate-ai-prompt-bundle.ts");
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function run(script: string, cwd: string, args: readonly string[] = []) {
  return spawnSync(process.execPath, ["--import=tsx", script, ...args], {
    cwd,
    encoding: "utf8",
  });
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8");
}

async function createFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "cwt-prompt-verifier-"));
  temporaryRoots.push(root);
  await symlink(join(projectRoot, "node_modules"), join(root, "node_modules"), "dir");
  await writeJson(join(root, "src/ai/prompts/resources/production/manifest.v1.json"), {
    manifestVersion: 1,
    entries: [],
  });
  await mkdir(join(root, "src/ai/prompts/generated"), { recursive: true });
  const generated = run(generatorPath, root, ["--scope", "production"]);
  assert.equal(generated.status, 0, generated.stderr);
  return root;
}

async function writeProductionResource(root: string, overrides: Record<string, unknown> = {}) {
  return writeProductionResourceBytes(root, productionResourceBytes(overrides));
}

async function writeProductionResourceBytes(root: string, bytes: Buffer) {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const relativePath = `verifier-regression-fixture/v1.${sha256}.json`;
  await mkdir(dirname(join(root, "src/ai/prompts/resources/production", relativePath)), { recursive: true });
  await writeFile(join(root, "src/ai/prompts/resources/production", relativePath), bytes);
  await writeJson(join(root, "src/ai/prompts/resources/production/manifest.v1.json"), {
    manifestVersion: 1,
    entries: [{
      promptId: "verifier-regression-fixture",
      promptVersion: 1,
      sha256,
      relativePath,
    }],
  });
  return { relativePath, sha256 };
}

function productionResourceBytes(overrides: Record<string, unknown> = {}): Buffer {
  return Buffer.from(`${JSON.stringify({
    resourceFormatVersion: 1,
    promptId: "verifier-regression-fixture",
    promptVersion: 1,
    applicationClass: "verifier_regression_fixture",
    capability: "text",
    useCase: "verifier_regression_fixture",
    locale: "en",
    inputSchemaVersion: 1,
    outputSchemaVersion: 1,
    policyVersion: "verifier-regression-fixture-v1",
    variables: [],
    body: "VERIFIER REGRESSION FIXTURE ONLY — NOT A CWT FACT.",
    ...overrides,
  })}\n`, "utf8");
}

function generateProduction(root: string): void {
  const generated = run(generatorPath, root, ["--scope", "production"]);
  assert.equal(generated.status, 0, generated.stderr);
}

describe("phase-neutral AI Prompt bundle verification", () => {
  it("accepts the legitimate empty Production manifest", async () => {
    const root = await createFixture();
    const result = run(verifierPath, root);
    assert.equal(result.status, 0, result.stderr);
  });

  it("accepts a valid non-empty Production manifest and generated bundle", async () => {
    const root = await createFixture();
    await writeProductionResource(root);
    generateProduction(root);
    const result = run(verifierPath, root);
    assert.equal(result.status, 0, result.stderr);
  });

  it("rejects a stale generated bundle", async () => {
    const root = await createFixture();
    await writeProductionResource(root);
    const result = run(verifierPath, root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /production Prompt bundle is stale\./);
  });

  it("rejects hash and path mismatches", async () => {
    const root = await createFixture();
    const { relativePath, sha256 } = await writeProductionResource(root);
    await writeJson(join(root, "src/ai/prompts/resources/production/manifest.v1.json"), {
      manifestVersion: 1,
      entries: [{
        promptId: "verifier-regression-fixture",
        promptVersion: 1,
        sha256,
        relativePath: relativePath.replace(sha256, "0".repeat(64)),
      }],
    });
    const result = run(verifierPath, root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Prompt manifest tuple\/path is invalid\./);
  });

  it("rejects resource bytes that no longer match the manifest hash", async () => {
    const root = await createFixture();
    const { relativePath } = await writeProductionResource(root);
    generateProduction(root);
    await writeFile(
      join(root, "src/ai/prompts/resources/production", relativePath),
      "tampered fixture bytes\n",
      "utf8",
    );
    const result = run(verifierPath, root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Prompt resource bytes\/hash are invalid\./);
  });

  it("rejects unreferenced resource membership", async () => {
    const root = await createFixture();
    await writeJson(join(root, "src/ai/prompts/resources/production/unreferenced.json"), {
      fixture: true,
    });
    const result = run(verifierPath, root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /resource set contains stale or unreferenced bytes/);
  });

  it("rejects resources that violate the shared Prompt contract", async () => {
    const root = await createFixture();
    await writeProductionResource(root, { body: undefined });
    generateProduction(root);
    const result = run(verifierPath, root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /resource contract does not match its manifest tuple/);
  });

  it("rejects regenerated CRLF resource bytes", async () => {
    const root = await createFixture();
    const bytes = productionResourceBytes();
    await writeProductionResourceBytes(root, Buffer.concat([
      bytes.subarray(0, -1),
      Buffer.from("\r\n"),
    ]));
    generateProduction(root);
    const result = run(verifierPath, root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Prompt resource raw text is invalid\./);
  });

  it("rejects regenerated double-final-LF resource bytes", async () => {
    const root = await createFixture();
    await writeProductionResourceBytes(root, Buffer.concat([
      productionResourceBytes(),
      Buffer.from("\n"),
    ]));
    generateProduction(root);
    const result = run(verifierPath, root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Prompt resource raw text is invalid\./);
  });

  it("rejects regenerated invalid UTF-8 resource bytes", async () => {
    const root = await createFixture();
    const bytes = productionResourceBytes();
    const invalidIndex = bytes.indexOf(Buffer.from("REGRESSION"));
    assert.notEqual(invalidIndex, -1);
    bytes[invalidIndex] = 0xff;
    await writeProductionResourceBytes(root, bytes);
    generateProduction(root);
    const result = run(verifierPath, root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Prompt resource raw text is invalid\./);
  });

  it("rejects regenerated UTF-8 BOM resource bytes", async () => {
    const root = await createFixture();
    await writeProductionResourceBytes(root, Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      productionResourceBytes(),
    ]));
    generateProduction(root);
    const result = run(verifierPath, root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Prompt resource raw text is invalid\./);
  });

  it("preserves the Production synthetic-content boundary", async () => {
    const root = await createFixture();
    await writeProductionResource(root, {
      body: "SYNTHETIC TEST DATA — NOT A CWT FACT",
    });
    const result = run(verifierPath, root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Synthetic content cannot enter Production Prompt authority\./);
  });

  it("requires the conspicuous marker in Synthetic Prompt resources", async () => {
    const root = await createFixture();
    const resource = {
      resourceFormatVersion: 1,
      promptId: "synthetic-verifier-fixture",
      promptVersion: 1,
      applicationClass: "synthetic_verifier_fixture",
      capability: "text",
      useCase: "synthetic_verifier_fixture",
      locale: "en",
      inputSchemaVersion: 1,
      outputSchemaVersion: 1,
      policyVersion: "synthetic-verifier-fixture-v1",
      variables: [],
      body: "marker intentionally absent",
    };
    const bytes = Buffer.from(`${JSON.stringify(resource)}\n`, "utf8");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const relativePath = `synthetic-verifier-fixture/v1.${sha256}.json`;
    await mkdir(dirname(join(root, "src/ai/testing/synthetic-prompts/resources", relativePath)), {
      recursive: true,
    });
    await writeFile(join(root, "src/ai/testing/synthetic-prompts/resources", relativePath), bytes);
    await writeJson(join(root, "src/ai/testing/synthetic-prompts/manifest.v1.json"), {
      manifestVersion: 1,
      entries: [{ promptId: "synthetic-verifier-fixture", promptVersion: 1, sha256, relativePath }],
    });
    const result = run(verifierPath, root, ["--include-synthetic-test"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Synthetic Prompt resources require the conspicuous marker\./);
  });
});
