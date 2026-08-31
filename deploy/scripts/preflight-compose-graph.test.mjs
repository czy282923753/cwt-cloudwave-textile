import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";
import { exactProtectedSecretFiles, validateComposeGraph } from "./preflight-compose-graph.mjs";

function normalized() {
  const digestA = `sha256:${"a".repeat(64)}`;
  const digestB = `sha256:${"b".repeat(64)}`;
  const digestC = `sha256:${"c".repeat(64)}`;
  return JSON.parse(execFileSync("docker", ["compose", "--file", resolve("compose.yaml"), "--profile", "staging", "--profile", "production-ai", "config", "--format", "json", "--no-env-resolution", "--no-path-resolution"], {
    encoding: "utf8",
    env: { ...process.env, CWT_IMAGE_REFERENCE: `cwt.invalid/app@${digestA}`, CWT_IMAGE_INDEX_DIGEST: digestA, CWT_IMAGE_CHILD_DIGEST: digestB, CWT_PROXY_IMAGE_REFERENCE: `cwt.invalid/proxy@${digestC}`, CWT_CLOUDFLARE_RANGES_FILE: resolve("deploy/proxy/cloudflare-ranges.lab.conf") },
  }));
}

test("accepts the frozen ten-service graph", () => {
  assert.deepEqual(validateComposeGraph(normalized()), { services: 10, defaultBytes: 2080374784, stagingBytes: 1275068416, minimumStagingAvailableBytes: 1476395008 });
});

test("matches every protected parser secret-file class to the root Compose closure one-to-one", () => {
  const source = readFileSync(resolve("src/config/env.ts"), "utf8");
  const block = source.match(/export const PROTECTED_SECRET_FILE_REQUIREMENTS = \[([\s\S]*?)\] as const;/u)?.[1] ?? "";
  const parserRequirements = [...block.matchAll(/\["([A-Z_]+)", "([A-Z_]+_FILE)", "([a-z0-9-]+)", \d+\]/gu)]
    .map((match) => ({ literalField: match[1], fileField: match[2], subjectSuffix: match[3] }));
  assert.deepEqual(parserRequirements, exactProtectedSecretFiles);
  assert.equal(parserRequirements.length, 10);
});

test("keeps the durable AI Worker signal lifecycle and database cleanup explicit", () => {
  const source = readFileSync(resolve("scripts/process-ai-runs.ts"), "utf8");
  const composition = readFileSync(resolve("src/server/ai/phase-d-provider-composition.ts"), "utf8");
  assert.match(source, /process\.once\("SIGINT", onSigint\)/u);
  assert.match(source, /process\.once\("SIGTERM", onSigterm\)/u);
  assert.match(source, /process\.off\("SIGINT", onSigint\)/u);
  assert.match(source, /process\.off\("SIGTERM", onSigterm\)/u);
  assert.match(source, /if \(worker\?\.running\) await worker\.stop\(stopSignal \?\? "SIGTERM"\)/u);
  assert.doesNotMatch(source, /@\/db\//u);
  assert.match(composition, /try \{\s+await worker\.stop\(signal\);\s+\} finally \{\s+await databaseConnection\.close\(\);\s+\}/u);
});

for (const [name, mutate] of [
  ["default Production Worker", (value) => { delete value.services["worker-production"].profiles; }],
  ["Production Worker restart", (value) => { value.services["worker-production"].restart = "unless-stopped"; }],
  ["cross-environment database", (value) => { value.services["web-staging"].networks["production-database"] = null; }],
  ["resource drift", (value) => { value.services["web-staging"].mem_limit += 1; }],
  ["runtime pnpm", (value) => { value.services["worker-staging"].command = ["pnpm", "ai:runs:process"]; }],
  ["Worker stop grace", (value) => { value.services["worker-staging"].stop_grace_period = "10s"; }],
  ["missing protected secret", (value) => { delete value.secrets["production-cos-access-key-id"]; }],
  ["cross-environment secret grant", (value) => {
    const secret = value.services["web-production"].secrets.find((entry) => entry.source === "production-cos-access-key-id");
    secret.source = "staging-cos-access-key-id"; secret.target = "/run/secrets/staging-cos-access-key-id";
  }],
  ["cross-environment secret-file mapping", (value) => { value.services["worker-production"].environment.COS_ACCESS_KEY_ID_FILE = "/run/secrets/staging-cos-access-key-id"; }],
  ["missing Web bind authority", (value) => { delete value.services["web-production"].environment.HOSTNAME; }],
  ["wrong Web bind authority", (value) => { value.services["web-staging"].environment.HOSTNAME = "127.0.0.1"; }],
  ["empty Web bind authority", (value) => { value.services["web-production"].environment.HOSTNAME = ""; }],
  ["hostname-derived Web bind authority", (value) => { value.services["web-staging"].environment.HOSTNAME = "${HOSTNAME}"; }],
  ["service-only bind drift", (value) => { delete value.services["scheduler-production"].environment.HOSTNAME; }],
  ["application readiness healthcheck", (value) => { value.services["web-production"].healthcheck.test[3] = "fetch('http://127.0.0.1:3000/robots.txt')"; }],
  ["hostname-derived health target", (value) => { value.services["web-production"].healthcheck.test[3] = "fetch(`http://${process.env.HOSTNAME}:3000/api/health/ready/`)"; }],
  ["non-loopback health target", (value) => { value.services["web-staging"].healthcheck.test[3] = "fetch('http://0.0.0.0:3000/api/health/ready/')"; }],
  ["non-journald logging", (value) => { value.services["worker-staging"].logging.driver = "json-file"; }],
  ["cross-environment backup evidence", (value) => {
    const mount = value.services["scheduler-production"].volumes.find((entry) => entry.target.includes("/backups/postgresql/"));
    mount.source = "/srv/cwt/backups/postgresql/staging";
  }],
]) test(`rejects ${name}`, () => {
  const value = normalized(); mutate(value);
  assert.throws(() => validateComposeGraph(value), /refused/u);
});
