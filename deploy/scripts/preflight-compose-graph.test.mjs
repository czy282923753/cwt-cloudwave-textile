import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";
import { validateComposeGraph } from "./preflight-compose-graph.mjs";

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
]) test(`rejects ${name}`, () => {
  const value = normalized(); mutate(value);
  assert.throws(() => validateComposeGraph(value), /refused/u);
});
