import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

interface ManifestEntry {
  readonly promptId: string;
  readonly promptVersion: number;
  readonly sha256: string;
  readonly relativePath: string;
}

interface FixtureResource {
  readonly entry: ManifestEntry;
  readonly bytes: Buffer;
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const verifierPath = join(projectRoot, "scripts/verify-ai-prompt-history.ts");
const resourceRoot = "src/ai/prompts/resources/production";
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function git(root: string, args: readonly string[], input?: string): string {
  const result = spawnSync("git", [...args], { cwd: root, encoding: "utf8", input });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trimEnd();
}

function verify(root: string, base: string, candidate: string) {
  return spawnSync(process.execPath, [
    "--import=tsx",
    verifierPath,
    `--base=${base}`,
    `--candidate=${candidate}`,
  ], { cwd: root, encoding: "utf8" });
}

function resource(promptId: string, label: string): FixtureResource {
  const bytes = Buffer.from(`${promptId}:${label}\n`, "utf8");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return {
    entry: {
      promptId,
      promptVersion: 1,
      sha256,
      relativePath: `${promptId}/v1.${sha256}.json`,
    },
    bytes,
  };
}

async function writeManifest(root: string, entries: readonly ManifestEntry[], manifestVersion = 1) {
  const path = join(root, resourceRoot, "manifest.v1.json");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ manifestVersion, entries })}\n`, "utf8");
}

async function writeResource(root: string, fixture: FixtureResource): Promise<void> {
  const path = join(root, resourceRoot, fixture.entry.relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, fixture.bytes);
}

function commit(root: string, message: string): string {
  git(root, ["add", "-A", "--", resourceRoot]);
  git(root, ["commit", "--quiet", "-m", message]);
  return git(root, ["rev-parse", "HEAD"]);
}

async function repository(resources: readonly FixtureResource[]): Promise<{ root: string; base: string }> {
  const root = await mkdtemp(join(tmpdir(), "cwt-prompt-history-"));
  temporaryRoots.push(root);
  await symlink(join(projectRoot, "node_modules"), join(root, "node_modules"), "dir");
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.name", "CWT Verifier Fixture"]);
  git(root, ["config", "user.email", "verifier-fixture@example.invalid"]);
  await Promise.all(resources.map((fixture) => writeResource(root, fixture)));
  await writeManifest(root, resources.map((fixture) => fixture.entry));
  return { root, base: commit(root, "base") };
}

async function expectManifestFailure(
  mutate: (entry: ManifestEntry) => ManifestEntry | undefined,
): Promise<void> {
  const existing = resource("existing-prompt", "base");
  const { root, base } = await repository([existing]);
  const changed = mutate(existing.entry);
  await writeManifest(root, changed === undefined ? [] : [changed]);
  const candidate = commit(root, "manifest mutation");
  const result = verify(root, base, candidate);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Protected Prompt manifest entry changed/);
}

describe("append-only AI Prompt history verification", () => {
  it("accepts an empty base manifest followed by four exact P-style additions", async () => {
    const { root, base } = await repository([]);
    const added = [
      resource("fabric-knowledge-draft", "v1"),
      resource("product-description-draft", "v1"),
      resource("seo-content-draft", "v1"),
      resource("sourcing-guide-draft", "v1"),
    ];
    await Promise.all(added.map((fixture) => writeResource(root, fixture)));
    await writeManifest(root, added.map((fixture) => fixture.entry));
    const candidate = commit(root, "four additions");
    const result = verify(root, base, candidate);
    assert.equal(result.status, 0, result.stderr);
  });

  it("accepts an exact existing entry and resource plus a new addition", async () => {
    const existing = resource("existing-prompt", "base");
    const { root, base } = await repository([existing]);
    const added = resource("new-prompt", "candidate");
    await writeResource(root, added);
    await writeManifest(root, [existing.entry, added.entry]);
    const candidate = commit(root, "append one");
    const result = verify(root, base, candidate);
    assert.equal(result.status, 0, result.stderr);
  });

  it("rejects removal of a base manifest entry", async () => {
    await expectManifestFailure(() => undefined);
  });

  it("rejects changes to a base manifest tuple", async () => {
    await expectManifestFailure((entry) => ({ ...entry, sha256: "f".repeat(64) }));
  });

  it("rejects repointing a base manifest entry", async () => {
    await expectManifestFailure((entry) => ({
      ...entry,
      relativePath: `repointed-prompt/v1.${entry.sha256}.json`,
    }));
  });

  it("rejects a manifestVersion change", async () => {
    const existing = resource("existing-prompt", "base");
    const { root, base } = await repository([existing]);
    await writeManifest(root, [existing.entry], 2);
    const candidate = commit(root, "change manifest version");
    const result = verify(root, base, candidate);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Prompt manifestVersion changed/);
  });

  it("rejects deletion of an existing resource", async () => {
    const existing = resource("existing-prompt", "base");
    const { root, base } = await repository([existing]);
    await rm(join(root, resourceRoot, existing.entry.relativePath));
    const candidate = commit(root, "delete resource");
    const result = verify(root, base, candidate);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Protected Prompt path was deleted/);
  });

  it("rejects renaming an existing resource", async () => {
    const existing = resource("existing-prompt", "base");
    const { root, base } = await repository([existing]);
    const renamed = join(root, resourceRoot, "renamed-prompt", "v1.renamed.json");
    await mkdir(dirname(renamed), { recursive: true });
    await rename(join(root, resourceRoot, existing.entry.relativePath), renamed);
    const candidate = commit(root, "rename resource");
    const result = verify(root, base, candidate);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Protected Prompt path was deleted/);
  });

  it("rejects byte mutation of an existing resource", async () => {
    const existing = resource("existing-prompt", "base");
    const { root, base } = await repository([existing]);
    await writeFile(join(root, resourceRoot, existing.entry.relativePath), "mutated\n", "utf8");
    const candidate = commit(root, "mutate resource");
    const result = verify(root, base, candidate);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Protected Prompt bytes changed/);
  });

  it("rejects a Candidate that does not descend from base", async () => {
    const existing = resource("existing-prompt", "base");
    const { root, base } = await repository([existing]);
    const tree = git(root, ["rev-parse", "HEAD^{tree}"]);
    const candidate = git(root, ["commit-tree", tree], "divergent\n");
    const result = verify(root, base, candidate);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Prompt history base must be an ancestor/);
  });

  it("rejects an invalid Git object", async () => {
    const { root, base } = await repository([]);
    const result = verify(root, base, "not-a-git-object");
    assert.notEqual(result.status, 0);
  });
});
