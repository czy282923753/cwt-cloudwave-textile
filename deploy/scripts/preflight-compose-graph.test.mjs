import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";
import {
  __testOnly as composeGraphTestOnly,
  exactProtectedSecretFiles,
  parseComposePsRows,
  validateComposeGraph,
} from "./preflight-compose-graph.mjs";

function normalized(projectName) {
  const digestA = `sha256:${"a".repeat(64)}`;
  const digestB = `sha256:${"b".repeat(64)}`;
  const digestC = `sha256:${"c".repeat(64)}`;
  const project = projectName === undefined ? [] : ["--project-name", projectName];
  return JSON.parse(execFileSync("docker", ["compose", ...project, "--file", resolve("compose.yaml"), "--profile", "staging", "--profile", "production-ai", "config", "--format", "json", "--no-env-resolution", "--no-path-resolution"], {
    encoding: "utf8",
    env: { ...process.env, CWT_IMAGE_REFERENCE: `cwt.invalid/app@${digestA}`, CWT_IMAGE_INDEX_DIGEST: digestA, CWT_IMAGE_CHILD_DIGEST: digestB, CWT_PROXY_IMAGE_REFERENCE: `cwt.invalid/proxy@${digestC}`, CWT_CLOUDFLARE_RANGES_FILE: resolve("deploy/proxy/cloudflare-ranges.lab.conf") },
  }));
}

test("parses bounded Compose ps JSON Lines and compatible single-document shapes", () => {
  const rows = [
    { Service: "postgres", State: "running" },
    { Service: "valkey-staging", State: "running" },
  ];
  assert.deepEqual(parseComposePsRows(rows.map(JSON.stringify).join("\n")), rows);
  assert.deepEqual(parseComposePsRows(rows.map(JSON.stringify).join("\r\n")), rows);
  assert.deepEqual(parseComposePsRows(JSON.stringify(rows)), rows);
  assert.deepEqual(parseComposePsRows(JSON.stringify(rows[0])), [rows[0]]);
  assert.deepEqual(parseComposePsRows(" \r\n\t "), []);

  const maximumRows = Array.from({ length: 128 }, (_, index) => ({ Service: `service-${index}` }));
  assert.equal(parseComposePsRows(JSON.stringify(maximumRows))?.length, 128);
  assert.equal(parseComposePsRows(JSON.stringify([...maximumRows, { Service: "overflow" }])), null);
  assert.equal(parseComposePsRows("x".repeat(64 * 1024 + 1)), null);
  assert.equal(parseComposePsRows(1), null);
});

test("rejects malformed or non-row Compose ps records before any consumer policy", () => {
  for (const value of [
    "not-json",
    `${JSON.stringify({ Service: "postgres" })}\n\n${JSON.stringify({ Service: "valkey-staging" })}`,
    "null",
    "1",
    '"postgres"',
    JSON.stringify([[{ Service: "postgres" }]]),
    JSON.stringify({}),
    JSON.stringify({ Service: 1 }),
    `${JSON.stringify({ Service: "postgres" })}\n${JSON.stringify(null)}`,
  ]) assert.equal(parseComposePsRows(value), null);
});

function protectedRows(mode) {
  const running = (Service) => ({ Service, State: "running", Health: "healthy", Paused: false });
  const rows = [
    running("proxy"), running("web-production"), running("postgres"), running("valkey-production"),
    { Service: "scheduler-production", State: "paused", Health: "healthy", Paused: true },
    { Service: "worker-production", State: "exited", Health: "", Paused: false },
  ];
  for (const service of ["scheduler-staging", "valkey-staging", "web-staging", "worker-staging"]) {
    rows.push(mode === "pre" ? { Service: service, State: "exited", Health: "", Paused: false } : running(service));
  }
  return rows;
}

test("protected pre/post state consumes the shared parser and keeps its state predicates", () => {
  assert.doesNotThrow(() => composeGraphTestOnly.validateProtectedState(
    "pre",
    JSON.stringify(protectedRows("pre")),
  ));
  assert.doesNotThrow(() => composeGraphTestOnly.validateProtectedState(
    "post",
    protectedRows("post").map(JSON.stringify).join("\r\n"),
  ));
  assert.throws(
    () => composeGraphTestOnly.validateProtectedState("post", JSON.stringify({})),
    /project state is not a JSON array/u,
  );
  assert.throws(
    () => composeGraphTestOnly.validateProtectedState("post", JSON.stringify({ Service: 1 })),
    /project state is not a JSON array/u,
  );
  const duplicate = [...protectedRows("post"), { ...protectedRows("post")[0] }];
  assert.throws(
    () => composeGraphTestOnly.validateProtectedState("post", JSON.stringify(duplicate)),
    /project state contains duplicate services/u,
  );
  const unhealthy = protectedRows("post");
  unhealthy.find((row) => row.Service === "web-staging").Health = "unhealthy";
  assert.throws(
    () => composeGraphTestOnly.validateProtectedState("post", JSON.stringify(unhealthy)),
    /web-staging is not stably running\/healthy/u,
  );
});

test("accepts the default-project graph with exact default authority", () => {
  const document = normalized();
  assert.equal(document.name, "cwt");
  assert.equal(document.secrets["postgres-bootstrap-password"].name, "cwt_postgres-bootstrap-password");
  assert.deepEqual(validateComposeGraph(document), { services: 10, defaultBytes: 2080374784, stagingBytes: 1275068416, minimumStagingAvailableBytes: 1476395008 });
});

test("accepts actual dynamic Compose normalization only with its exact explicit authority", () => {
  const projectName = "cwt-graph-dynamic-proof";
  const document = normalized(projectName);
  assert.equal(document.name, projectName);
  for (const [subject, secret] of Object.entries(document.secrets)) assert.equal(secret.name, `${projectName}_${subject}`);
  assert.deepEqual(validateComposeGraph(document, { projectName }), { services: 10, defaultBytes: 2080374784, stagingBytes: 1275068416, minimumStagingAvailableBytes: 1476395008 });
});

test("rejects an absent or mismatched requested project authority", () => {
  const projectName = "cwt-graph-authority-proof";
  const document = normalized(projectName);
  assert.throws(() => validateComposeGraph(document, { projectName: "" }), /project authority is invalid/u);
  assert.throws(() => validateComposeGraph(document, { projectName: "cwt-graph-other-proof" }), /project authority drifted/u);
});

test("rejects fixed cwt secret names under a dynamic project", () => {
  const projectName = "cwt-graph-fixed-prefix-proof";
  const document = normalized(projectName);
  for (const [subject, secret] of Object.entries(document.secrets)) secret.name = `cwt_${subject}`;
  assert.throws(() => validateComposeGraph(document, { projectName }), /top-level secret custody drifted/u);
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
  ["outbound removed", (v) => { delete v.services['scheduler-production'].networks['production-outbound']; }],
  ["cross-environment outbound", (v) => { v.services['web-staging'].networks['production-outbound'] = { gw_priority: 1 }; }],
  ["Production Worker egress", (v) => { v.services['worker-production'].networks['production-outbound'] = { gw_priority: 1 }; }],
  ["cache egress", (v) => { v.services['valkey-staging'].networks['staging-outbound'] = { gw_priority: 1 }; }],
  ["outbound internal", (v) => { v.networks['staging-outbound'].internal = true; }],
  ["global outbound name", (v) => { v.networks['production-outbound'].name = 'global-outbound'; }],
  ["shared private bridge identity", (v) => { v.networks['staging-backend'].name = 'cwt_production-backend'; }],
  ["custom bridge driver options", (v) => { v.networks['production-outbound'].driver_opts = { 'com.docker.network.bridge.enable_ip_masquerade': 'false' }; }],
  ["external outbound", (v) => { v.networks['production-outbound'].external = true; }],
  ["missing gateway priority", (v) => { delete v.services['web-staging'].networks['staging-outbound'].gw_priority; }],
  ["private gateway preferred", (v) => { v.services['web-production'].networks['production-database'].gw_priority = 2; }],
  ["host networking", (v) => { v.services['scheduler-production'].network_mode = 'host'; }],
  ["host alias routing", (v) => { v.services['scheduler-staging'].extra_hosts = ['escape:host-gateway']; }],
  ["cross-environment work root", (v) => { v.services['scheduler-production'].volumes.find(m => m.target.includes('/backups/sets/')).source = '/srv/cwt/backups/sets/staging'; }],
  ["writable mutex", (v) => { v.services['scheduler-staging'].volumes.find(m => m.target === '/run/cwt/backup-migration.lock').read_only = false; }],
  ["default Production Worker", (value) => { delete value.services["worker-production"].profiles; }],
  ["Production Worker restart", (value) => { value.services["worker-production"].restart = "unless-stopped"; }],
  ["cross-environment database", (value) => { value.services["web-staging"].networks["production-database"] = null; }],
  ["resource drift", (value) => { value.services["web-staging"].mem_limit += 1; }],
  ["runtime pnpm", (value) => { value.services["worker-staging"].command = ["pnpm", "ai:runs:process"]; }],
  ["Worker stop grace", (value) => { value.services["worker-staging"].stop_grace_period = "10s"; }],
  ["missing protected secret", (value) => { delete value.secrets["production-cos-access-key-id"]; }],
  ["extra protected secret", (value) => { value.secrets["production-extra"] = { name: "cwt_production-extra", file: "/etc/cwt/production/extra" }; }],
  ["wrong protected secret file", (value) => { value.secrets["postgres-bootstrap-password"].file = "/etc/cwt/postgres/wrong"; }],
  ["protected service source drift", (value) => { value.services["web-production"].secrets[0].source = "production-auth-session-secret"; }],
  ["protected service target drift", (value) => { value.services["worker-staging"].secrets[0].target = "/run/secrets/wrong"; }],
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
  ["missing PostgreSQL tmpfs mount", (value) => { value.services.postgres.tmpfs.pop(); }],
  ["wrong Valkey tmpfs options", (value) => { value.services["valkey-production"].tmpfs[0] = value.services["valkey-production"].tmpfs[0].replace("size=16777216", "size=1"); }],
  ["split tmpfs option fragments", (value) => { value.services["valkey-staging"].tmpfs = ["/tmp:rw", "noexec", "uid=999", "gid=999", "mode=0700"]; }],
  ["extra PostgreSQL tmpfs mount", (value) => { value.services.postgres.tmpfs.push("/unexpected:rw,noexec,nosuid,nodev,size=1,uid=999,gid=999,mode=0700"); }],
  ["wrong PostgreSQL tmpfs path", (value) => { value.services.postgres.tmpfs[0] = value.services.postgres.tmpfs[0].replace("/tmp:", "/var/tmp:"); }],
  ["weakened Valkey tmpfs permission", (value) => { value.services["valkey-staging"].tmpfs[0] = value.services["valkey-staging"].tmpfs[0].replace("mode=0700", "mode=0755"); }],
  ["non-journald logging", (value) => { value.services["worker-staging"].logging.driver = "json-file"; }],
  ["cross-environment backup evidence", (value) => {
    const mount = value.services["scheduler-production"].volumes.find((entry) => entry.target.includes("/backups/postgresql/"));
    mount.source = "/srv/cwt/backups/postgresql/staging";
  }],
]) test(`rejects ${name}`, () => {
  const value = normalized(); mutate(value);
  assert.throws(() => validateComposeGraph(value), /refused/u);
});

for (const role of ["web-production", "worker-production", "web-staging", "worker-staging"]) {
  test(`refuses backup mount on ${role}`, () => {
    const document = normalized();
    document.services[role].volumes ??= [];
    document.services[role].volumes.push({type: "bind", source: "/srv/cwt/backups/postgresql/production", target: "/backup"});
    assert.throws(() => validateComposeGraph(document), /cannot mount backups/u);
  });
}
test("requires writable scheduler backup root for daily and one-shot operations", () => {
  const document = normalized();
  document.services["scheduler-production"].volumes.find(entry => entry.target.includes("/backups/postgresql/")).read_only = true;
  assert.throws(() => validateComposeGraph(document), /backup work\/completion mount drifted/u);
});
