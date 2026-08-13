import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const currentManifestPreamble =
  "globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {};\nglobalThis.__RSC_MANIFEST[";
const legacyManifestPreamble =
  "globalThis.__RSC_MANIFEST=(globalThis.__RSC_MANIFEST||{});globalThis.__RSC_MANIFEST[";
const disposableBuilds: string[] = [];

type ManifestPayload = Record<string, unknown>;

function manifestPayload(overrides: ManifestPayload = {}): ManifestPayload {
  return {
    clientModules: {
      "/src/public-site/example.tsx": {
        id: "fixture-module",
        name: "*",
        chunks: ["fixture-chunk", "static/chunks/app/public.js"],
        async: false,
      },
    },
    ...overrides,
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

async function createBuildFixture({
  manifest = frameManifest(),
  chunk = "public fixture",
}: {
  manifest?: string;
  chunk?: string;
} = {}) {
  const buildRoot = await mkdtemp(join(tmpdir(), "cwt-public-bundle-"));
  disposableBuilds.push(buildRoot);
  await mkdir(join(buildRoot, "server/app"), { recursive: true });
  await mkdir(join(buildRoot, "static/chunks/app"), { recursive: true });
  await writeFile(join(buildRoot, "BUILD_ID"), "fixture-build\n");
  await writeFile(
    join(buildRoot, "build-manifest.json"),
    JSON.stringify({ polyfillFiles: [], rootMainFiles: [] }),
  );
  await writeFile(join(buildRoot, "server/app/page_client-reference-manifest.js"), manifest);
  await writeFile(join(buildRoot, "static/chunks/app/public.js"), chunk);

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
  it("accepts the current Next 16.2.12 assignment framing", async () => {
    const result = runChecker(await createBuildFixture());

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/1 public page manifests and 2 manifest\/chunk files/i);
  });

  it("retains the exact legacy assignment framing for Webpack rollback compatibility", async () => {
    const result = runChecker(
      await createBuildFixture({
        manifest: frameManifest({ preamble: legacyManifestPreamble, delimiter: "]=" }),
      }),
    );

    expect(result.status).toBe(0);
  });

  it("accepts only the permitted trailing ASCII whitespace", async () => {
    const result = runChecker(
      await createBuildFixture({ manifest: frameManifest({ trailing: "\n\r\n\t " }) }),
    );

    expect(result.status).toBe(0);
  });

  it.each([
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
      "an unsafe route key",
      frameManifest({ routeKey: "/../page" }),
      /invalid.*route key/i,
    ],
    [
      "an unrecognized delimiter",
      frameManifest({ delimiter: "]  = " }),
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

  it("rejects a manifest without a clientModules object", async () => {
    const result = runChecker(
      await createBuildFixture({ manifest: frameManifest({ payload: {} }) }),
    );

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/no clientModules object/i);
  });

  it("rejects an invalid client module descriptor", async () => {
    const result = runChecker(
      await createBuildFixture({
        manifest: frameManifest({
          payload: manifestPayload({ clientModules: { invalid: { chunks: "not-an-array" } } }),
        }),
      }),
    );

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/invalid client module descriptor/i);
  });

  it("rejects a malformed encoded client chunk path", async () => {
    const result = runChecker(
      await createBuildFixture({
        manifest: frameManifest({
          payload: manifestPayload({
            clientModules: {
              invalid: { chunks: ["static/chunks/%E0%A4%A.js"] },
            },
          }),
        }),
      }),
    );

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/malformed chunk path/i);
  });

  it("fails the positive forbidden-marker leak control", async () => {
    const result = runChecker(
      await createBuildFixture({ chunk: "const leak = 'RefineAdminProvider';" }),
    );

    expect(result.status).not.toBe(0);
    expect(combinedOutput(result)).toMatch(/admin-only dependencies leaked/i);
    expect(combinedOutput(result)).toMatch(/RefineAdminProvider/);
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
