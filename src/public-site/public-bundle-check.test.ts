import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const currentManifestPreamble =
  "globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {};\nglobalThis.__RSC_MANIFEST[";
const legacyManifestPreamble =
  "globalThis.__RSC_MANIFEST=(globalThis.__RSC_MANIFEST||{});globalThis.__RSC_MANIFEST[";
const currentChunkPath = "/_next/static/chunks/app/public.js";
const legacyChunkPath = "static/chunks/app/public.js";
const disposableBuilds: string[] = [];
const serverBoundaryMarker = "CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A";
const promptBundleMarker = "CWT_SERVER_AI_PROMPT_BUNDLE_V1_91B6E4A3";
const promptTuples = [
  ["fabric-knowledge-draft", 1, "b3b65d50e9ea0d5f5da2e0dca25d808463a47fbf59a7dfcb9b71b64823501a8c"],
  ["product-description-draft", 1, "0aefaeb2dba08c76587f6501451dc0031b6f825ab3bb903be00f28dda5e0b198"],
  ["seo-content-draft", 1, "91f8868efad16310a5ed26c85a6001024572949c59725efe2b6c0df935499195"],
  ["sourcing-guide-draft", 1, "e4aaf2e39483bde7569edb529f1c1d213b0a11d68ac4a9b99075992620238adf"],
] as const;
const validServerEvidence = [
  serverBoundaryMarker,
  promptBundleMarker,
  ...promptTuples.map(([promptId, promptVersion, sha256]) =>
    `{promptId:"${promptId}",promptVersion:${promptVersion},sha256:"${sha256}"}`),
].join("\n");
const promptBundleSource = readFileSync(
  "src/ai/prompts/generated/production-prompt-bundle.generated.ts",
  "utf8",
);
const productionRawBase64 = [...promptBundleSource.matchAll(
  /rawBase64: "([A-Za-z0-9+/=]+)"/g,
)].map((match) => match[1]);

type ManifestPayload = Record<string, unknown>;

function manifestPayload({
  modulePath = "/src/public-site/example.tsx",
  chunks = [currentChunkPath],
}: {
  modulePath?: string;
  chunks?: unknown;
} = {}): ManifestPayload {
  return {
    clientModules: {
      [modulePath]: {
        id: "fixture-module",
        name: "*",
        chunks,
        async: false,
      },
    },
  };
}

function frameManifest({
  preamble = currentManifestPreamble,
  routeKey = "/page",
  delimiter = "] = ",
  payload = manifestPayload(),
  trailing = "",
}: {
  preamble?: string;
  routeKey?: string;
  delimiter?: string;
  payload?: unknown;
  trailing?: string;
} = {}) {
  return `${preamble}${JSON.stringify(routeKey)}${delimiter}${JSON.stringify(payload)};${trailing}`;
}

async function writeBuildFile(buildRoot: string, relativePath: string, content: string) {
  const path = join(buildRoot, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

async function createBuildFixture({
  manifest = frameManifest(),
  manifestRelativePath = "page_client-reference-manifest.js",
  rootChunks = [],
  chunkFiles = { "static/chunks/app/public.js": "public fixture" },
  serverFiles = { "server/app/admin-ai.js": validServerEvidence },
}: {
  manifest?: string;
  manifestRelativePath?: string;
  rootChunks?: unknown[];
  chunkFiles?: Record<string, string>;
  serverFiles?: Record<string, string>;
} = {}) {
  const buildRoot = await mkdtemp(join(tmpdir(), "cwt-public-bundle-"));
  disposableBuilds.push(buildRoot);
  await writeBuildFile(buildRoot, "BUILD_ID", "fixture-build\n");
  await writeBuildFile(
    buildRoot,
    "build-manifest.json",
    JSON.stringify({ polyfillFiles: [], rootMainFiles: rootChunks }),
  );
  await writeBuildFile(buildRoot, `server/app/${manifestRelativePath}`, manifest);
  for (const [relativePath, content] of Object.entries(serverFiles)) {
    await writeBuildFile(buildRoot, relativePath, content);
  }
  for (const [relativePath, content] of Object.entries(chunkFiles)) {
    await writeBuildFile(buildRoot, relativePath, content);
  }

  const freshTime = new Date(Date.now() + 60_000);
  await utimes(join(buildRoot, "BUILD_ID"), freshTime, freshTime);
  return buildRoot;
}

function runChecker(buildRoot: string) {
  return spawnSync(process.execPath, ["scripts/check-public-bundle.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, CWT_BUILD_DIR: buildRoot },
  });
}

function combinedOutput(result: SpawnSyncReturns<string>) {
  return `${result.stdout}${result.stderr}`;
}

afterEach(async () => {
  await Promise.all(disposableBuilds.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("public bundle checker", () => {
  it("accepts current Next framing and reports nonzero manifest chunk coverage", async () => {
    const result = runChecker(await createBuildFixture());

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(
      /1 public page manifests; 0 root chunks; 1 manifest chunks; 1 distinct chunk files/i,
    );
    expect(result.stdout).toMatch(/server JavaScript files with required AI evidence/i);
  });

  it.each([serverBoundaryMarker, promptBundleMarker])(
    "fails closed when required server marker %s is missing",
    async (marker) => {
      const result = runChecker(await createBuildFixture({
        serverFiles: { "server/app/admin-ai.js": validServerEvidence.replace(marker, "") },
      }));

      expect(result.status).not.toBe(0);
      expect(combinedOutput(result)).toMatch(/required server ai marker is missing/i);
    },
  );

  it("fails closed when a server Prompt tuple carries the wrong hash", async () => {
    const expectedHash = promptTuples[0][2];
    const result = runChecker(await createBuildFixture({
      serverFiles: {
        "server/app/admin-ai.js": validServerEvidence.replace(expectedHash, "f".repeat(64)),
      },
    }));

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/co-bound server Prompt tuple is missing/i);
  });

  it("fails closed when a server Prompt tuple is split between files", async () => {
    const promptId = promptTuples[0][0];
    const sha256 = promptTuples[0][2];
    const intactOtherTuples = promptTuples.slice(1).map(([id, version, hash]) =>
      `{promptId:"${id}",promptVersion:${version},sha256:"${hash}"}`).join("\n");
    const result = runChecker(await createBuildFixture({
      serverFiles: {
        "server/app/admin-ai-id.js": `${serverBoundaryMarker}\n${promptBundleMarker}\n` +
          `{promptId:"${promptId}",promptVersion:1}\n${intactOtherTuples}`,
        "server/chunks/admin-ai-hash.js": `const splitHash="${sha256}";`,
      },
    }));

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/co-bound server Prompt tuple is missing/i);
  });

  it.each([
    ["Prompt tuple id", promptTuples[0][0]],
    ["Prompt tuple hash", promptTuples[1][2]],
    ["Production raw Prompt bytes", productionRawBase64[0]],
    ["Provider endpoint", "api.deepseek.com"],
    ["Provider model", "deepseek-v4-flash"],
    ["AI testing module", "src/ai/testing"],
    ["private target key", '"targetRevisionId"'],
    ["private run key", '"runId"'],
  ])("rejects a public client %s leak", async (_label, leak) => {
    expect(leak).toBeTruthy();
    const result = runChecker(await createBuildFixture({
      chunkFiles: {
        "static/chunks/app/public.js": _label.startsWith("private")
          ? `const leaked={${leak}:"private"};`
          : `const leaked=${JSON.stringify(leak)};`,
      },
    }));

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/admin-only dependencies leaked/i);
  });

  it("rejects non-file server JavaScript evidence", async () => {
    const buildRoot = await createBuildFixture({ serverFiles: {} });
    await mkdir(join(buildRoot, "server/evidence"), { recursive: true });
    await symlink(join(buildRoot, "server/evidence"), join(buildRoot, "server/admin-ai.js"));

    const result = runChecker(buildRoot);

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/server JavaScript output is not a regular file/i);
  });

  it.skipIf(process.platform === "win32")(
    "rejects server JavaScript evidence that escapes through a symlink",
    async () => {
      const buildRoot = await createBuildFixture({ serverFiles: {} });
      const outsideRoot = await mkdtemp(join(tmpdir(), "cwt-server-evidence-outside-"));
      disposableBuilds.push(outsideRoot);
      const outsidePath = join(outsideRoot, "admin-ai.js");
      await writeFile(outsidePath, validServerEvidence);
      await symlink(outsidePath, join(buildRoot, "server/admin-ai.js"));

      const result = runChecker(buildRoot);

      expect(result.status).not.toBe(0);
      expect(combinedOutput(result)).toMatch(/server JavaScript output escapes the real build root/i);
    },
  );

  it("retains exact legacy framing and chunk pairs for rollback compatibility", async () => {
    const result = runChecker(
      await createBuildFixture({
        manifest: frameManifest({
          preamble: legacyManifestPreamble,
          delimiter: "]=",
          payload: manifestPayload({ chunks: ["fixture-chunk", legacyChunkPath] }),
        }),
      }),
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/1 manifest chunks/i);
  });

  it("accepts only permitted trailing ASCII whitespace", async () => {
    const result = runChecker(
      await createBuildFixture({ manifest: frameManifest({ trailing: "\n\r\n\t " }) }),
    );

    expect(result.status).toBe(0);
  });

  it("accepts a valid escaped JSON route literal without executing the manifest", async () => {
    const payload = JSON.stringify(manifestPayload());
    const manifest = `${currentManifestPreamble}"\\/page"] = ${payload};`;
    const result = runChecker(await createBuildFixture({ manifest }));

    expect(result.status).toBe(0);
  });

  it("does not confuse delimiter-looking JSON string content with manifest framing", async () => {
    const result = runChecker(
      await createBuildFixture({
        manifest: frameManifest({
          payload: manifestPayload({ modulePath: "/src/public-site/delimiters-]= ] = .tsx" }),
        }),
      }),
    );

    expect(result.status).toBe(0);
  });

  it.each([
    ["page_client-reference-manifest.js", "/page"],
    ["about/page_client-reference-manifest.js", "/about/page"],
    ["products/[slug]/page_client-reference-manifest.js", "/products/[slug]/page"],
    [
      "(marketing)/catalog/[slug]/page_client-reference-manifest.js",
      "/(marketing)/catalog/[slug]/page",
    ],
  ])("binds %s to route key %s", async (manifestRelativePath, routeKey) => {
    const result = runChecker(
      await createBuildFixture({
        manifestRelativePath,
        manifest: frameManifest({ routeKey }),
      }),
    );

    expect(result.status).toBe(0);
  });

  it.skipIf(process.platform === "win32")(
    "rejects a POSIX manifest segment containing a raw backslash",
    async () => {
      const result = runChecker(
        await createBuildFixture({
          manifestRelativePath: "bad\\segment/page_client-reference-manifest.js",
          manifest: frameManifest({ routeKey: "/bad/segment/page" }),
        }),
      );

      expect(result.status).not.toBe(0);
      expect(combinedOutput(result)).toContain(
        "Invalid client-reference manifest filesystem path.",
      );
      expect(combinedOutput(result)).not.toContain("bad\\segment");
    },
  );

  it("rejects a safe-shaped route key that does not match the manifest path", async () => {
    const result = runChecker(
      await createBuildFixture({
        manifestRelativePath: "about/page_client-reference-manifest.js",
        manifest: frameManifest({ routeKey: "/different/page" }),
      }),
    );

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/route key does not match its path/i);
  });

  it.each([
    ["a leading prefix", ` ${frameManifest()}`, /unrecognized.*framing/i],
    ["a missing final semicolon", frameManifest().slice(0, -1), /unrecognized.*framing/i],
    ["a second statement", `${frameManifest()}globalThis.extra={};`, /invalid.*manifest json/i],
    [
      "a missing preamble",
      frameManifest().slice(currentManifestPreamble.length),
      /unrecognized.*framing/i,
    ],
    [
      "a non-JSON route key",
      `${currentManifestPreamble}/page] = ${JSON.stringify(manifestPayload())};`,
      /invalid.*route key/i,
    ],
    [
      "an unrecognized delimiter",
      frameManifest({ delimiter: "]  = " }),
      /unrecognized.*framing/i,
    ],
    [
      "current preamble with legacy delimiter",
      frameManifest({ delimiter: "]=" }),
      /unrecognized.*framing/i,
    ],
    [
      "legacy preamble with current delimiter",
      frameManifest({ preamble: legacyManifestPreamble }),
      /unrecognized.*framing/i,
    ],
    ["a non-ASCII trailing suffix", `${frameManifest()}\u00a0`, /unrecognized.*framing/i],
    [
      "invalid JSON on the right-hand side",
      `${currentManifestPreamble}"/page"] = {;`,
      /invalid.*json/i,
    ],
  ])("fails closed for %s", async (_case, manifest, expected) => {
    const result = runChecker(await createBuildFixture({ manifest }));

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(expected);
  });

  it.each([
    ["an invalid JSON escape", `${currentManifestPreamble}"/\\x/page"] = ${JSON.stringify(manifestPayload())};`],
    ["a lone surrogate", `${currentManifestPreamble}"/\\uD800/page"] = ${JSON.stringify(manifestPayload())};`],
    ["a replacement character", frameManifest({ routeKey: "/�/page" })],
  ])("rejects %s in the route literal", async (_case, manifest) => {
    const result = runChecker(await createBuildFixture({ manifest }));

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/invalid.*route key/i);
  });

  it.each(["/../page", "/%2e%2e/page", "/encoded%2Fseparator/page", "//page", "/café/page"])(
    "rejects unsafe route key %s",
    async (routeKey) => {
      const result = runChecker(
        await createBuildFixture({ manifest: frameManifest({ routeKey }) }),
      );

      expect(result.status).not.toBe(0);
      expect(combinedOutput(result)).toMatch(/invalid.*route key/i);
    },
  );

  it("rejects a manifest without a clientModules object", async () => {
    const result = runChecker(
      await createBuildFixture({ manifest: frameManifest({ payload: {} }) }),
    );

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/no clientModules object/i);
  });

  it.each([
    ["an array RHS", []],
    ["an array clientModules value", { clientModules: [] }],
  ])("rejects %s", async (_case, payload) => {
    const result = runChecker(
      await createBuildFixture({ manifest: frameManifest({ payload }) }),
    );

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/no clientModules object/i);
  });

  it.each([
    ["a non-array chunks field", "not-an-array"],
    ["a non-string chunk entry", [42]],
  ])("rejects a descriptor with %s", async (_case, chunks) => {
    const result = runChecker(
      await createBuildFixture({
        manifest: frameManifest({ payload: manifestPayload({ chunks }) }),
      }),
    );

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/invalid client module descriptor/i);
  });

  it("fails closed when selected public manifests reference zero normalized chunks", async () => {
    const result = runChecker(
      await createBuildFixture({
        manifest: frameManifest({ payload: manifestPayload({ chunks: [] }) }),
      }),
    );

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/no normalized manifest-referenced public chunks/i);
  });

  it("fails a current-format non-root forbidden-marker chunk control", async () => {
    const result = runChecker(
      await createBuildFixture({
        manifestRelativePath: "products/page_client-reference-manifest.js",
        manifest: frameManifest({ routeKey: "/products/page" }),
        chunkFiles: {
          "static/chunks/app/public.js": "const leak = 'RefineAdminProvider';",
        },
      }),
    );

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/admin-only dependencies leaked/i);
    expect(combinedOutput(result)).toMatch(/RefineAdminProvider/);
  });

  it("checks active module forbidden paths for the current chunk namespace", async () => {
    const result = runChecker(
      await createBuildFixture({
        manifest: frameManifest({
          payload: manifestPayload({ modulePath: "/src/admin/current-leak.tsx" }),
        }),
      }),
    );

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/active module \/src\/admin\//i);
  });

  it.each([
    ["raw traversal", "/_next/static/chunks/../escape.js"],
    ["raw dot segment", "/_next/static/chunks/./escape.js"],
    ["encoded traversal", "/_next/static/chunks/%2e%2e/escape.js"],
    ["encoded separator", "/_next/static/chunks/nested%2Fescape.js"],
    ["encoded backslash", "/_next/static/chunks/nested%5Cescape.js"],
    ["absolute filesystem path", "/tmp/outside.js"],
    ["alternate URL origin", "https://example.test/static/chunks/outside.js"],
    ["query suffix", "/_next/static/chunks/app/public.js?x=1"],
    ["fragment suffix", "/_next/static/chunks/app/public.js#x"],
    ["raw backslash", "/_next/static/chunks/app\\public.js"],
    ["malformed encoding", "/_next/static/chunks/%E0%A4%A.js"],
    ["empty suffix", "/_next/static/chunks/"],
    ["missing JavaScript suffix", "/_next/static/chunks/app/public.css"],
    ["empty path segment", "/_next/static/chunks/app//public.js"],
    ["unrecognized namespace", "/_next/assets/public.js"],
    ["non-file ambiguity", "fixture-chunk"],
  ])("rejects descriptor chunk path with %s", async (_case, chunkPath) => {
    const result = runChecker(
      await createBuildFixture({
        manifest: frameManifest({ payload: manifestPayload({ chunks: [chunkPath] }) }),
      }),
    );

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/chunk (path|namespace|entry)|malformed chunk path/i);
  });

  it("uses the same closed normalization authority for root build-manifest chunks", async () => {
    const result = runChecker(
      await createBuildFixture({ rootChunks: ["static/chunks/../../outside.js"] }),
    );

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/invalid public bundle chunk path/i);
  });

  it("scans root build-manifest chunks for forbidden markers", async () => {
    const result = runChecker(
      await createBuildFixture({
        rootChunks: ["static/chunks/root.js"],
        chunkFiles: {
          "static/chunks/root.js": "const rootLeak = '@refinedev/core';",
          "static/chunks/app/public.js": "manifest fixture",
        },
      }),
    );

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/admin-only dependencies leaked/i);
    expect(combinedOutput(result)).toMatch(/@refinedev/);
  });

  it("reports separate valid root and manifest chunk coverage", async () => {
    const result = runChecker(
      await createBuildFixture({
        rootChunks: ["static/chunks/root.js"],
        chunkFiles: {
          "static/chunks/root.js": "root fixture",
          "static/chunks/app/public.js": "manifest fixture",
        },
      }),
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(
      /1 public page manifests; 1 root chunks; 1 manifest chunks; 2 distinct chunk files/i,
    );
  });

  it.skipIf(process.platform === "win32")(
    "fails closed when an in-root manifest chunk symlink escapes the real build root",
    async () => {
      const buildRoot = await createBuildFixture();
      const outsideRoot = await mkdtemp(join(tmpdir(), "cwt-public-bundle-outside-"));
      disposableBuilds.push(outsideRoot);
      const outsidePath = join(outsideRoot, "outside.js");
      const outsideContent = "OUTSIDE_CONTENT_MUST_NOT_BE_PRINTED";
      await writeFile(outsidePath, outsideContent);
      const inRootPath = join(buildRoot, "static/chunks/app/public.js");
      await rm(inRootPath);
      await symlink(outsidePath, inRootPath);

      const result = runChecker(buildRoot);

      expect(result.status).not.toBe(0);
      expect(combinedOutput(result)).toMatch(/escapes the real build root/i);
      expect(combinedOutput(result)).not.toContain(outsideContent);
    },
  );

  it.skipIf(process.platform === "win32")(
    "applies real-root symlink containment to root build-manifest chunks",
    async () => {
      const buildRoot = await createBuildFixture({
        rootChunks: ["static/chunks/root.js"],
      });
      const outsideRoot = await mkdtemp(join(tmpdir(), "cwt-public-bundle-root-outside-"));
      disposableBuilds.push(outsideRoot);
      const outsidePath = join(outsideRoot, "outside.js");
      await writeFile(outsidePath, "outside root fixture");
      await symlink(outsidePath, join(buildRoot, "static/chunks/root.js"));

      const result = runChecker(buildRoot);

      expect(result.status).not.toBe(0);
      expect(combinedOutput(result)).toMatch(/escapes the real build root/i);
    },
  );

  it("rejects a directory where a normalized chunk file is required", async () => {
    const buildRoot = await createBuildFixture();
    const chunkPath = join(buildRoot, "static/chunks/app/public.js");
    await rm(chunkPath);
    await mkdir(chunkPath);

    const result = runChecker(buildRoot);

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/chunk is not a file/i);
  });

  it("preserves public manifest selection exclusions", async () => {
    const buildRoot = await createBuildFixture();
    const invalidManifest = "this excluded manifest must not be parsed";
    await writeBuildFile(
      buildRoot,
      "server/app/admin/page_client-reference-manifest.js",
      invalidManifest,
    );
    await writeBuildFile(
      buildRoot,
      "server/app/(admin-preview)/admin/preview/page_client-reference-manifest.js",
      invalidManifest,
    );
    await writeBuildFile(
      buildRoot,
      "server/app/operations-login/page_client-reference-manifest.js",
      invalidManifest,
    );

    const result = runChecker(buildRoot);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/1 public page manifests/i);
  });

  it("fails clearly when no fresh production build exists", async () => {
    const buildRoot = await mkdtemp(join(tmpdir(), "cwt-public-bundle-missing-"));
    disposableBuilds.push(buildRoot);
    const result = runChecker(buildRoot);

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/requires a fresh production build/i);
  });

  it("refuses a stale production build", async () => {
    const buildRoot = await createBuildFixture();
    const staleTime = new Date("2000-01-01T00:00:00.000Z");
    await utimes(join(buildRoot, "BUILD_ID"), staleTime, staleTime);
    const result = runChecker(buildRoot);

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/refused a stale build/i);
  });
});
