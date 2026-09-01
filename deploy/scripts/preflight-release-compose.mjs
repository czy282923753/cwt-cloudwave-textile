import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, resolve } from "node:path";

import { validateComposeGraph } from "./preflight-compose-graph.mjs";
import { sha256File, verifyReleaseRecord } from "./preflight-image.mjs";

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const RELEASE = /^[0-9a-f]{40}$/u;
const SAFE_TOKEN = /^[a-z0-9][a-z0-9-]{7,63}$/u;
const EXACT_SERVICES = ["postgres", "valkey-production", "valkey-staging", "web-production", "web-staging"];
const APP_SERVICES = ["web-production", "web-staging"];
const DEPENDENCY_REFERENCES = [
  "postgres:18.4-bookworm@sha256:882236b897e39051d2368c5ccc6cda944904723506b2dfc97f2a8f5bc9afa382",
  "valkey/valkey:8.1.9@sha256:f0ba225266310efba5fb33383e21c64fbd07907304224786c780606e7ebd7327",
];
const EXPECTED_TMPFS = Object.freeze({
  postgres: Object.freeze({
    "/tmp": "rw,noexec,nosuid,nodev,size=33554432,uid=999,gid=999,mode=0700",
    "/var/run/postgresql": "rw,noexec,nosuid,nodev,size=16777216,uid=999,gid=999,mode=0750",
  }),
  "valkey-production": Object.freeze({ "/tmp": "rw,noexec,nosuid,nodev,size=16777216,uid=999,gid=999,mode=0700" }),
  "valkey-staging": Object.freeze({ "/tmp": "rw,noexec,nosuid,nodev,size=16777216,uid=999,gid=999,mode=0700" }),
});
const EXPECTED_TMPFS_ARRAYS = Object.freeze({
  postgres: Object.freeze([
    "/tmp:rw,noexec,nosuid,nodev,size=33554432,uid=999,gid=999,mode=0700",
    "/var/run/postgresql:rw,noexec,nosuid,nodev,size=16777216,uid=999,gid=999,mode=0750",
  ]),
  "valkey-production": Object.freeze(["/tmp:rw,noexec,nosuid,nodev,size=16777216,uid=999,gid=999,mode=0700"]),
  "valkey-staging": Object.freeze(["/tmp:rw,noexec,nosuid,nodev,size=16777216,uid=999,gid=999,mode=0700"]),
});
const EXPECTED_WEB_COMMAND = ["node", ".next/standalone/server.js"];
const EXPECTED_WEB_HEALTH = [
  "CMD", "node", "-e",
  "fetch('http://127.0.0.1:3000/api/health/ready/',{cache:'no-store',signal:AbortSignal.timeout(3000)}).then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))",
];

class HarnessFailure extends Error {
  constructor(message) { super(message); this.name = "HarnessFailure"; }
}
class SubjectFailure extends Error {
  constructor(message) { super(message); this.name = "SubjectFailure"; }
}

function refuse(message) { throw new HarnessFailure(`Release Compose preflight refused: ${message}`); }
function subjectRefuse(message) { throw new SubjectFailure(`Release subject failed: ${message}`); }
function json(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function pause(milliseconds) { return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds)); }
function secret(bytes = 32) { return randomBytes(bytes).toString("hex"); }

export function digestQualifiedReference(repository, indexDigest) {
  if (repository !== "cwt.local/release" || !DIGEST.test(indexDigest ?? "")) refuse("Compose image identity is not the exact release repository@index");
  return `${repository}@${indexDigest}`;
}

export function assertExclusiveStore(owner, outer) {
  for (const [label, value] of [["owner", owner], ["outer", outer]]) {
    if (!value || typeof value !== "object" || typeof value.address !== "string" || !value.address.startsWith("/") ||
      typeof value.containersNamespace !== "string" || value.containersNamespace.length === 0 ||
      typeof value.pluginsNamespace !== "string" || value.pluginsNamespace.length === 0) refuse(`${label} containerd store identity is incomplete`);
  }
  const ownerTuple = `${owner.address}\0${owner.containersNamespace}`;
  const outerTuple = `${outer.address}\0${outer.containersNamespace}`;
  if (ownerTuple === outerTuple || owner.containersNamespace === "moby" || owner.pluginsNamespace === "plugins.moby") {
    refuse("validation owner shares the outer containerd store/namespace");
  }
  return Object.freeze({
    socketIdentityClass: owner.address === outer.address ? "shared-socket-isolated-namespace" : "private-containerd-socket",
    namespace: owner.containersNamespace,
  });
}

export function ownerDockerArgs(ownerHost, args) {
  if (typeof ownerHost !== "string" || !/^(?:tcp|unix):\/\//u.test(ownerHost)) refuse("owner Docker endpoint must be explicit");
  if (!Array.isArray(args) || args.length === 0) refuse("owner Docker command is empty");
  return Object.freeze(["docker", "--host", ownerHost, ...args]);
}

export function createValidationPlan({ ownerHost, outerHost, releaseId, indexDigest, childDigest, project }) {
  if (!RELEASE.test(releaseId ?? "") || !DIGEST.test(indexDigest ?? "") || !DIGEST.test(childDigest ?? "") ||
    !SAFE_TOKEN.test(project ?? "") || ownerHost === outerHost) refuse("validation plan identity is invalid");
  const tag = `cwt.local/release:${releaseId}`;
  const qualified = digestQualifiedReference("cwt.local/release", indexDigest);
  const owner = (phase, operation, args, extra = {}) => Object.freeze({ phase, operation, endpoint: "owner", argv: ownerDockerArgs(ownerHost, args), ...extra });
  const plan = [
    owner("pre-gate", "tag-absent", ["image", "inspect", tag]),
    owner("pre-gate", "image-load", ["image", "load", "--input", "<oci-archive>"]),
    owner("pre-gate", "index-inspect", ["image", "inspect", qualified]),
    owner("pre-gate", "child-inspect", ["image", "inspect", "--platform", "<native-platform>", qualified]),
    owner("pre-gate", "compose-config", ["compose", "--file", "<root-compose>", "config"]),
    owner("subject", "compose-up", ["compose", "--project-name", project, "--file", "<root-compose>", "up", "--detach", "--pull", "never", "--no-build", ...EXACT_SERVICES], { composeReference: qualified }),
    owner("subject", "container-inspect", ["inspect", "<compose-container>"]),
    owner("cleanup", "compose-down", ["compose", "--project-name", project, "--file", "<root-compose>", "down", "--remove-orphans"]),
    owner("cleanup", "zero-consumers", ["compose", "--project-name", project, "--file", "<root-compose>", "ps", "--all", "--quiet"]),
    owner("cleanup", "image-rm", ["image", "rm", qualified, tag]),
  ];
  validateValidationPlan(plan, { ownerHost, qualified, tag });
  return Object.freeze(plan);
}

export function validateValidationPlan(plan, { ownerHost, qualified, tag }) {
  if (!Array.isArray(plan) || plan.length === 0 || !qualified?.includes("@sha256:") || tag?.includes("@")) refuse("command plan reference identity is invalid");
  let composeDown = -1; let zeroConsumers = -1; let imageRemoval = -1; let composeUp = -1;
  for (const [index, command] of plan.entries()) {
    if (command.endpoint !== "owner" || command.argv?.[0] !== "docker" || command.argv?.[1] !== "--host" || command.argv?.[2] !== ownerHost) {
      refuse("release operation escapes the one explicit owner endpoint");
    }
    const rendered = command.argv.join(" ");
    if ((command.operation === "compose-up" || command.operation === "compose-config") && command.operation === "compose-up" && !rendered.includes("--pull never --no-build")) {
      refuse("Compose runtime may pull or build");
    }
    if (command.operation === "compose-up") {
      composeUp = index;
      if (command.composeReference !== qualified) refuse("Compose input is tag-only or bound to the wrong digest");
    }
    if (command.operation === "compose-down") composeDown = index;
    if (command.operation === "zero-consumers") zeroConsumers = index;
    if (command.operation === "image-rm") imageRemoval = index;
  }
  if (composeUp < 0 || composeDown < composeUp || zeroConsumers < composeDown || imageRemoval < zeroConsumers) refuse("release reference cleanup occurs before consumer teardown");
  if (plan.some((command) => command.operation === "image-rm" && command.endpoint !== "owner")) refuse("outer deletion is prohibited");
  return true;
}

export function validateResolvedIdentity({ expectedIndex, expectedChild, expectedRevision, neutralInspection, platformInspection }) {
  if (!DIGEST.test(expectedIndex ?? "") || !DIGEST.test(expectedChild ?? "") || !RELEASE.test(expectedRevision ?? "")) refuse("expected release identity is invalid");
  if (neutralInspection?.Descriptor?.digest !== expectedIndex || !neutralInspection.RepoDigests?.includes(`cwt.local/release@${expectedIndex}`)) {
    refuse("same-daemon repository/index identity drifted");
  }
  if (platformInspection?.Descriptor?.digest !== expectedChild || platformInspection?.Config?.Labels?.["org.opencontainers.image.revision"] !== expectedRevision) {
    refuse("same-daemon child/revision identity drifted");
  }
  return true;
}

export function classifyValidationFailure(error, { gateOpen, cleanup }) {
  if (error instanceof SubjectFailure) return Object.freeze({ failureClass: "subject", revoke: true });
  if (cleanup) return Object.freeze({ failureClass: "harness_cleanup", revoke: false });
  return Object.freeze({ failureClass: gateOpen ? "harness_process_after_gate_open" : "harness_pre_gate", revoke: false });
}

function parseArgs(argv) {
  const values = { command: argv[0] };
  for (let index = 1; index < argv.length; index += 2) {
    const key = argv[index]; const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) refuse("invalid command arguments");
    values[key.slice(2)] = value;
  }
  return values;
}

function absoluteExisting(path, label, kind = "file") {
  if (!isAbsolute(path ?? "") || !existsSync(path)) refuse(`${label} must be an existing absolute path`);
  const absolute = resolve(path);
  if (kind === "directory" && !existsSync(resolve(absolute))) refuse(`${label} directory is absent`);
  return absolute;
}

function run(program, args, options = {}) {
  const result = spawnSync(program, args, { encoding: "utf8", maxBuffer: 1024 * 1024 * 128, ...options });
  if (result.status !== 0 && !options.allowFailure) {
    throw new HarnessFailure(`${options.label ?? program} failed (${result.status ?? "signal"}): ${(result.stderr || result.stdout || "no output").trim().slice(0, 3000)}`);
  }
  return result;
}

function createDockerClients({ ownerHost, outerHost, helperImage, repositoryRoot, releaseRoot, workspace }) {
  const outer = (args, options = {}) => run("docker", ["--host", outerHost, ...args], options);
  const mountMap = new Map([
    [repositoryRoot, repositoryRoot, true],
    [releaseRoot, releaseRoot, true],
    [workspace, workspace, false],
  ].map((entry) => [entry[1], entry]));
  const mounts = [...mountMap.values()];
  const owner = (args, options = {}) => {
    const mountArgs = mounts.flatMap(([source, target, readOnly]) => ["--mount", `type=bind,source=${source},target=${target}${readOnly ? ",readonly" : ""}`]);
    const command = [
      "run", "--rm", "--pull", "never", "--network", "none", "--privileged", "--pid", "host",
      ...mountArgs,
      helperImage, "nsenter", "-t", "1", "-n", "--", "docker", "--host", ownerHost, ...args,
    ];
    return outer(command, options);
  };
  return { outer, owner };
}

function dockerInfo(client) {
  const value = JSON.parse(client(["info", "--format", "{{json .}}"], { label: "Docker owner discovery" }).stdout);
  const containerd = value.Containerd;
  if (!containerd?.Address || !containerd?.Namespaces?.Containers || !containerd?.Namespaces?.Plugins) refuse("Docker endpoint does not expose containerd store identity");
  return {
    serverVersion: value.ServerVersion,
    snapshotter: (value.DriverStatus ?? []).some((entry) => entry?.[0] === "driver-type" && entry?.[1] === "io.containerd.snapshotter.v1"),
    store: {
      address: containerd.Address,
      containersNamespace: containerd.Namespaces.Containers,
      pluginsNamespace: containerd.Namespaces.Plugins,
    },
  };
}

function composeEnvironment({ qualified, indexDigest, childDigest, repositoryRoot }) {
  return {
    CWT_IMAGE_REFERENCE: qualified,
    CWT_IMAGE_INDEX_DIGEST: indexDigest,
    CWT_IMAGE_CHILD_DIGEST: childDigest,
    CWT_CLOUDFLARE_RANGES_FILE: resolve(repositoryRoot, "deploy/proxy/cloudflare-ranges.lab.conf"),
  };
}

function composeArgs({ project, repositoryRoot, composeFile, environment, args }) {
  const env = Object.entries(environment).flatMap(([key, value]) => ["--env", `${key}=${value}`]);
  return [
    "run", "--rm", "--pull", "never", "--network", "none", "--privileged", "--pid", "host",
    "--mount", `type=bind,source=${repositoryRoot},target=${repositoryRoot},readonly`,
    ...env,
    "docker:29.6.2-cli", "nsenter", "-t", "1", "-n", "--", "docker", "--host", "<owner-host>",
    "compose", "--project-name", project, "--project-directory", repositoryRoot, "--file", composeFile, "--profile", "staging", ...args,
  ];
}

function createComposeClient({ clients, ownerHost, project, repositoryRoot, composeFile, environment, workspace, configRoot }) {
  return (args, options = {}) => {
    const env = Object.entries(environment).flatMap(([key, value]) => ["--env", `${key}=${value}`]);
    const command = [
      "run", "--rm", "--pull", "never", "--network", "none", "--privileged", "--pid", "host",
      "--mount", `type=bind,source=${repositoryRoot},target=${repositoryRoot},readonly`,
      "--mount", `type=bind,source=${workspace},target=${workspace}`,
      ...(configRoot ? ["--mount", `type=bind,source=${configRoot},target=/etc/cwt,readonly`] : []),
      ...env,
      "docker:29.6.2-cli", "nsenter", "-t", "1", "-n", "--", "docker", "--host", ownerHost,
      "compose", "--project-name", project, "--project-directory", repositoryRoot, "--file", composeFile, "--profile", "staging", ...args,
    ];
    return clients.outer(command, options);
  };
}

function vmShell(clients, script, options = {}) {
  return clients.outer([
    "run", "--rm", "--pull", "never", "--network", "none", "--privileged", "--pid", "host",
    "alpine:3.22", "nsenter", "-t", "1", "-m", "--", "sh", "-eu", "-c", script,
  ], options);
}

function createSyntheticConfiguration(workspace, releaseId) {
  const root = resolve(workspace, "cwt-config");
  mkdirSync(resolve(root, "postgres"), { recursive: true, mode: 0o700 });
  for (const environment of ["production", "staging"]) mkdirSync(resolve(root, environment), { recursive: true, mode: 0o700 });
  writeFileSync(resolve(root, "postgres/bootstrap-password"), `${secret()}\n`, { mode: 0o444 });
  for (const environment of ["production", "staging"]) {
    const directory = resolve(root, environment);
    const databasePassword = secret();
    const values = {
      "database-password": databasePassword,
      "database-url": `postgres://cwt_${environment}:${databasePassword}@postgres:5432/cwt_${environment}`,
      "auth-session-secret": secret(),
      "valkey-password": secret(),
      "cloudmersive-api-key": secret(),
      "smtp-password": secret(),
      "monitoring-dsn": `https://synthetic-${secret(8)}@monitoring.invalid/1`,
      "ai-api-key": secret(),
      "cos-access-key-id": secret(),
      "cos-secret-key": secret(),
      "backup-password": secret(),
    };
    for (const [name, value] of Object.entries(values)) writeFileSync(resolve(directory, name), `${value}\n`, { mode: 0o444 });
    writeFileSync(resolve(directory, "database-url-unavailable"), `postgres://cwt_${environment}:${databasePassword}@127.0.0.1:9/cwt_${environment}\n`, { mode: 0o444 });
    writeFileSync(resolve(directory, "valkey-password-wrong"), `${secret()}\n`, { mode: 0o444 });
    const production = environment === "production";
    const runtime = {
      APP_ENV: environment,
      NEXT_PUBLIC_SITE_URL: production ? "https://cwtextile.com" : "https://staging.cwtextile.com",
      NON_PRODUCTION_NOINDEX: production ? "false" : "true",
      DATABASE_DRIVER: "postgres", DATABASE_URL: "", DATABASE_POOL_MAX: production ? "6" : "2", AUTH_SESSION_SECRET: "",
      STORAGE_DRIVER: "local", PUBLIC_STORAGE_ROOT: `/srv/cwt/${environment}/media/public`, PRIVATE_STORAGE_ROOT: `/srv/cwt/${environment}/media/private-inquiries`, IMPORT_STORAGE_ROOT: `/srv/cwt/${environment}/media/import`,
      TRUSTED_PROXY_MODE: "cloudflare", FILE_SCAN_DRIVER: "cloudmersive", FILE_SCAN_ORIGIN: "https://scanner.synthetic.invalid", FILE_SCAN_API_KEY: "", FILE_SCAN_ACCOUNT_CUSTODY: `${environment}:synthetic-local-only`,
      SHARED_RATE_LIMIT_DRIVER: "valkey", VALKEY_ENDPOINT: `redis://valkey-${environment}:6379`, VALKEY_USERNAME: `cwt-${environment}`, VALKEY_PASSWORD: "", RATE_LIMIT_KEY_PREFIX: `cwt:${environment}:rate:`,
      EMAIL_DRIVER: "smtp", EMAIL_FROM: "synthetic@invalid.example", INQUIRY_NOTIFICATION_TO: "synthetic@invalid.example", SMTP_HOST: "mail.synthetic.invalid", SMTP_USER: "synthetic@invalid.example", SMTP_PASSWORD: "",
      INQUIRY_FILE_RETENTION_DAYS: "30", CUSTOMER_DATA_RETENTION_DAYS: "365", AUDIT_LOG_RETENTION_DAYS: "365", MONITORING_DRIVER: "external", SENTRY_DSN: "", AI_PROVIDER_API_KEY: "", COS_ACCESS_KEY_ID: "", COS_SECRET_ACCESS_KEY: "", BACKUP_REPOSITORY_PASSWORD: "",
      ANALYTICS_DRIVER: "disabled", FEATURE_REFINE_ADMIN: "false", FEATURE_SOURCE_DECLARATION: "false", FEATURE_AI: "false", FEATURE_SEO_ASSISTANT: "false", FEATURE_PRODUCT_IMPORT: "false", CWT_RELEASE_ID: releaseId,
    };
    writeFileSync(resolve(directory, "runtime.env"), `${Object.entries(runtime).map(([key, value]) => `${key}=${value}`).join("\n")}\n`, { mode: 0o444 });
  }
  writeFileSync(resolve(root, ".cwt-release-validation"), "synthetic release validation\n", { mode: 0o444 });
  return root;
}

function removeExactSyntheticWorkspace(workspace) {
  rmSync(workspace, { recursive: true, force: true });
}

function installSyntheticVmState(clients, configRoot, token) {
  clients.outer([
    "run", "--rm", "--pull", "never", "--network", "none", "--privileged", "--pid", "host",
    "--mount", `type=bind,source=${configRoot},target=/payload,readonly`, "alpine:3.22", "sh", "-eu", "-c",
    `nsenter -t 1 -m -- sh -eu -c 'test ! -e /etc/cwt; test ! -e /srv/cwt; mkdir /etc/cwt /srv/cwt'; tar -C /payload -cf - . | nsenter -t 1 -m -- tar -C /etc/cwt -xf -; nsenter -t 1 -m -- sh -eu -c 'mkdir -p /srv/cwt/production/media/public /srv/cwt/production/media/private-inquiries /srv/cwt/production/media/import /srv/cwt/staging/media/public /srv/cwt/staging/media/private-inquiries /srv/cwt/staging/media/import /srv/cwt/postgresql/data /srv/cwt/backups/postgresql/production /srv/cwt/backups/postgresql/staging; : > /srv/cwt/.${token}; chown -R 10001:10001 /srv/cwt/production /srv/cwt/staging; chmod -R 0700 /srv/cwt/production /srv/cwt/staging; chown -R 999:999 /srv/cwt/postgresql; chmod -R 0700 /srv/cwt/postgresql'`,
  ], { label: "Synthetic VM state install" });
}

function startJournalSink(clients, token) {
  const name = `${token}-journal`;
  const result = clients.outer([
    "run", "--detach", "--name", name, "--pull", "never", "--network", "none", "--privileged", "--pid", "host",
    "alpine:3.22", "nsenter", "-t", "1", "-m", "--", "sh", "-eu", "-c",
    "test ! -e /run/systemd/journal; mkdir -p /run/systemd/journal; exec socat UNIX-RECVFROM:/run/systemd/journal/socket,fork OPEN:/dev/null",
  ], { label: "disposable journal sink" });
  if (!result.stdout.trim()) refuse("disposable journal sink did not start");
  return name;
}

function stopJournalSink(clients, name, options = {}) {
  if (name) clients.outer(["rm", "--force", name], options);
  return vmShell(clients, "if test -e /run/systemd/journal; then rm -rf /run/systemd/journal; fi; test ! -e /run/systemd/journal", options);
}

function removeSyntheticVmState(clients, token, options = {}) {
  return vmShell(clients, `if test -e /etc/cwt; then test -f /etc/cwt/.cwt-release-validation; rm -rf /etc/cwt; fi; if test -e /srv/cwt; then test -f /srv/cwt/.${token}; rm -rf /srv/cwt; fi; test ! -e /etc/cwt; test ! -e /srv/cwt`, options);
}

function createOciArchive(ociRoot, archive) {
  run("tar", ["-C", ociRoot, "-cf", archive, "."], { label: "OCI transfer archive" });
}

function parseInspection(result) {
  const value = JSON.parse(result.stdout);
  if (!Array.isArray(value) || value.length !== 1) refuse("Docker image inspection shape drifted");
  return value[0];
}

function ownerImageInspection(clients, reference, platform) {
  const args = ["image", "inspect"];
  if (platform) args.push("--platform", platform);
  args.push(reference);
  return parseInspection(clients.owner(args, { label: "Owner image inspection" }));
}

async function waitForComposeHealth(compose) {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const states = Object.fromEntries(EXACT_SERVICES.map((service) => {
      const id = compose(["ps", "--all", "--quiet", service], { allowFailure: true }).stdout.trim();
      if (!id) return [service, "missing"];
      const status = compose(["exec", "-T", service, "sh", "-c", "true"], { allowFailure: true }).status === 0 ?
        compose(["ps", "--format", "json", service], { allowFailure: true }).stdout : "";
      try { const parsed = JSON.parse(status); const row = Array.isArray(parsed) ? parsed[0] : parsed; return [service, row?.Health ?? "starting"]; } catch { return [service, "starting"]; }
    }));
    if (Object.values(states).every((state) => state === "healthy")) return states;
    if (Object.values(states).some((state) => state === "unhealthy")) subjectRefuse(`root Compose unhealthy: ${JSON.stringify(states)}`);
    await pause(1000);
  }
  subjectRefuse("root Compose services did not become healthy");
}

function serviceContainer(compose, service) {
  const id = compose(["ps", "--all", "--quiet", service]).stdout.trim();
  if (!id) subjectRefuse(`${service} container is absent`);
  return id;
}

function inspectContainer(clients, id) {
  const value = JSON.parse(clients.owner(["inspect", id], { label: "Owner container inspection" }).stdout);
  if (!Array.isArray(value) || value.length !== 1) subjectRefuse("container inspection shape drifted");
  return value[0];
}

function directSecretMounts(environment, overrides = {}) {
  const names = ["database-url", "auth-session-secret", "valkey-password", "cloudmersive-api-key", "smtp-password", "monitoring-dsn", "ai-api-key", "cos-access-key-id", "cos-secret-key", "backup-password"];
  return names.flatMap((name) => {
    const sourceName = overrides[name] ?? name;
    return ["--mount", `type=bind,source=/etc/cwt/${environment}/${sourceName},target=/run/secrets/${environment}-${name},readonly`];
  });
}

function directAppArgs({ name, platform, qualified, environment = "staging", missingImport = false, overrides = {}, command, detached = true }) {
  const storage = ["public", "private-inquiries", ...(missingImport ? [] : ["import"])].flatMap((nameValue) => ["--mount", `type=bind,source=/srv/cwt/${environment}/media/${nameValue},target=/srv/cwt/${environment}/media/${nameValue}`]);
  return [
    "run", ...(detached ? ["--detach"] : ["--rm"]), "--name", name, "--platform", platform, "--user", "10001:10001", "--read-only", "--init",
    "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true", "--pids-limit", "128",
    "--tmpfs", "/tmp:rw,noexec,nosuid,nodev,size=67108864,uid=10001,gid=10001,mode=0700",
    "--env-file", `/etc/cwt/${environment}/runtime.env`, "--env", "HOSTNAME=0.0.0.0",
    "--env", `DATABASE_URL_FILE=/run/secrets/${environment}-database-url`, "--env", `AUTH_SESSION_SECRET_FILE=/run/secrets/${environment}-auth-session-secret`,
    "--env", `FILE_SCAN_API_KEY_FILE=/run/secrets/${environment}-cloudmersive-api-key`, "--env", `VALKEY_PASSWORD_FILE=/run/secrets/${environment}-valkey-password`,
    "--env", `SMTP_PASSWORD_FILE=/run/secrets/${environment}-smtp-password`, "--env", `SENTRY_DSN_FILE=/run/secrets/${environment}-monitoring-dsn`,
    "--env", `AI_PROVIDER_API_KEY_FILE=/run/secrets/${environment}-ai-api-key`, "--env", `COS_ACCESS_KEY_ID_FILE=/run/secrets/${environment}-cos-access-key-id`,
    "--env", `COS_SECRET_ACCESS_KEY_FILE=/run/secrets/${environment}-cos-secret-key`, "--env", `BACKUP_REPOSITORY_PASSWORD_FILE=/run/secrets/${environment}-backup-password`,
    ...directSecretMounts(environment, overrides), ...storage,
    "--network", "<backend-network>", qualified, ...(command ?? EXPECTED_WEB_COMMAND),
  ];
}

function runDirectContainer(clients, args, { backendNetwork, databaseNetwork, ingressNetwork, configRoot }) {
  const normalized = args.map((value) => value === "<backend-network>" ? backendNetwork : value);
  const mountArgs = ["--mount", `type=bind,source=${configRoot},target=/etc/cwt,readonly`];
  const command = [
    "run", "--rm", "--pull", "never", "--network", "none", "--privileged", "--pid", "host",
    ...mountArgs, "docker:29.6.2-cli", "nsenter", "-t", "1", "-n", "--", "docker", "--host", clients.ownerHost,
    ...normalized,
  ];
  const result = clients.outer(command, { label: "Direct exact-subject container start" });
  const id = result.stdout.trim();
  if (!id) subjectRefuse("direct exact-subject container did not start");
  if (databaseNetwork) clients.owner(["network", "connect", databaseNetwork, id], { label: "Direct database network connect" });
  if (ingressNetwork) clients.owner(["network", "connect", ingressNetwork, id], { label: "Direct ingress network connect" });
  return id;
}

async function subjectOperation(action, label) {
  try { return await action(); } catch (error) {
    if (error instanceof HarnessFailure && /Cannot connect to the Docker daemon|dial tcp|context deadline|no space left|helper image|permission denied/iu.test(error.message)) throw error;
    if (error instanceof SubjectFailure) throw error;
    subjectRefuse(`${label}: ${error?.message ?? "unknown"}`);
  }
}

async function probeDirectWeb(clients, id, expectedStatus, expectedFailedComponent) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const probe = clients.owner(["exec", id, "node", "-e", "Promise.all(['/api/health/live/','/api/health/ready/'].map(async p=>{const r=await fetch('http://127.0.0.1:3000'+p,{cache:'no-store'});return {path:p,status:r.status,cache:r.headers.get('cache-control'),robots:r.headers.get('x-robots-tag'),body:await r.json()}})).then(v=>console.log(JSON.stringify(v))).catch(()=>process.exit(1))"], { allowFailure: true });
    if (probe.status === 0) {
      const values = JSON.parse(probe.stdout.trim());
      assert.equal(values[0].status, 200);
      assert.equal(values[1].status, expectedStatus);
      for (const value of values) { assert.match(value.cache ?? "", /no-store/u); assert.equal(value.robots, "noindex, nofollow, noarchive"); }
      if (expectedFailedComponent) {
        const components = values[1].body?.checks;
        if (!components || typeof components !== "object") subjectRefuse("readiness body omitted the fixed check map");
        const failed = Object.entries(components).filter(([, status]) => status === "fail").map(([name]) => name);
        assert.deepEqual(failed, [expectedFailedComponent]);
      }
      return { live: 200, ready: expectedStatus, failedComponent: expectedFailedComponent ?? null, headers: "pass" };
    }
    await pause(1000);
  }
  subjectRefuse(`direct Web probe did not reach expected status ${expectedStatus}`);
}

async function runDirectMatrix({ clients, qualified, nativePlatform, nativeChild, nonNativePlatform, nonNativeChild, project, configRoot, token }) {
  const networks = {
    backend: `${project}_staging-backend`, database: `${project}_staging-database`, ingress: `${project}_staging-ingress`,
  };
  const cases = [];
  const runCase = async ({ id, platform, expectedStatus, failedComponent, overrides, missingImport }) => {
    const name = `${token}-${id}`;
    let container;
    try {
      container = runDirectContainer(clients, directAppArgs({ name, platform, qualified, overrides, missingImport }), {
        backendNetwork: networks.backend, databaseNetwork: networks.database, ingressNetwork: networks.ingress, configRoot,
      });
      const result = await probeDirectWeb(clients, container, expectedStatus, failedComponent);
      cases.push({ id, platform, childDigest: platform === nativePlatform ? nativeChild : nonNativeChild, ...result });
    } catch (error) {
      if (error instanceof SubjectFailure) throw error;
      subjectRefuse(`${id} assertion failed: ${error?.message ?? "unknown"}`);
    } finally {
      if (container) clients.owner(["rm", "--force", container], { allowFailure: true });
    }
  };
  await runCase({ id: "non-native-positive", platform: nonNativePlatform, expectedStatus: 200 });
  await runCase({ id: "database-unavailable-native", platform: nativePlatform, expectedStatus: 503, failedComponent: "database", overrides: { "database-url": "database-url-unavailable" } });
  await runCase({ id: "wrong-valkey-acl-native", platform: nativePlatform, expectedStatus: 503, failedComponent: "valkey", overrides: { "valkey-password": "valkey-password-wrong" } });
  await runCase({ id: "storage-missing-native", platform: nativePlatform, expectedStatus: 503, failedComponent: "storage", missingImport: true });

  const roles = [];
  for (const role of [
    { id: "worker-sigterm", command: ["node", "--conditions=react-server", "--import=tsx", "/app/scripts/process-ai-runs.ts"] },
    { id: "scheduler-sigterm", command: ["supercronic", "-passthrough-logs", "/app/deploy/schedule/staging.crontab"] },
  ]) {
    const name = `${token}-${role.id}`; let container;
    try {
      container = runDirectContainer(clients, directAppArgs({ name, platform: nativePlatform, qualified, command: role.command }), {
        backendNetwork: networks.backend, databaseNetwork: networks.database, configRoot,
      });
      await pause(2000);
      clients.owner(["stop", "--signal", "SIGTERM", "--time", "20", container], { label: `${role.id} stop` });
      const inspection = inspectContainer(clients, container);
      if (inspection.State.ExitCode !== 0) subjectRefuse(`${role.id} did not stop cleanly`);
      roles.push({ id: role.id, signal: "SIGTERM", exitCode: 0 });
    } finally { if (container) clients.owner(["rm", "--force", container], { allowFailure: true }); }
  }
  const oneShotName = `${token}-work-health`;
  {
    const foreground = directAppArgs({ name: oneShotName, platform: nativePlatform, qualified, command: ["node", "--conditions=react-server", "--import=tsx", "/app/scripts/check-work-health.ts"], detached: false });
    const normalized = foreground.map((value) => value === "<backend-network>" ? networks.database : value);
    const command = ["run", "--rm", "--pull", "never", "--network", "none", "--privileged", "--pid", "host", "--mount", `type=bind,source=${configRoot},target=/etc/cwt,readonly`, "docker:29.6.2-cli", "nsenter", "-t", "1", "-n", "--", "docker", "--host", clients.ownerHost, ...normalized];
    const result = clients.outer(command, { allowFailure: true });
    if (result.status !== 2 || !result.stdout.includes("Work health:")) subjectRefuse("one-shot work-health signal drifted");
    roles.push({ id: "work-health-one-shot", exitCode: 2, signal: "observed-unhealthy-missing-backup" });
  }
  return { cases, roles };
}

async function selfTest(args) {
  const ownerHost = args["owner-host"]; const outerHost = args["outer-host"];
  const token = args.token;
  if (!SAFE_TOKEN.test(token ?? "") || ownerHost === outerHost) refuse("self-test owner/token identity is invalid");
  const base = args.base ?? "alpine:3.22";
  const helperImage = args["helper-image"] ?? "docker:29.6.2-cli";
  const repositoryRoot = resolve(process.cwd());
  const workspace = mkdtempSync(resolve(tmpdir(), `cwt-release-custody-${token}-`));
  const clients = createDockerClients({ ownerHost, outerHost, helperImage, repositoryRoot, releaseRoot: repositoryRoot, workspace });
  clients.ownerHost = ownerHost;
  const tag = `cwt.local/custody:${token}`;
  const archive = resolve(workspace, "base.tar");
  let ownerLoaded = false;
  try {
    const ownerInfo = dockerInfo(clients.owner); const outerInfo = dockerInfo((command, options) => clients.outer(command, options));
    const isolation = assertExclusiveStore(ownerInfo.store, outerInfo.store);
    const before = clients.owner(["image", "inspect", tag], { allowFailure: true });
    if (before.status === 0) refuse("self-test tag pre-exists in owner");
    clients.outer(["image", "save", "--output", archive, base], { label: "non-CWT base archive" });
    clients.owner(["image", "load", "--input", archive], { label: "owner non-CWT image load" }); ownerLoaded = true;
    const baseInspection = ownerImageInspection(clients, base);
    const baseDigest = baseInspection.Descriptor?.digest;
    if (!DIGEST.test(baseDigest ?? "")) refuse("self-test base digest is unavailable");
    clients.owner(["image", "tag", base, tag], { label: "owner non-CWT tag" });
    const ownerTag = ownerImageInspection(clients, tag);
    const outerInvisible = clients.outer(["image", "inspect", tag], { allowFailure: true });
    if (outerInvisible.status === 0) refuse("outer endpoint can see isolated namespace tag");
    const outerDeletion = clients.outer(["image", "rm", tag], { allowFailure: true });
    if (outerDeletion.status === 0) refuse("outer endpoint deleted isolated namespace tag");
    ownerImageInspection(clients, tag);
    ownerImageInspection(clients, `${base.split(":")[0]}@${baseDigest}`);
    clients.owner(["image", "rm", tag], { label: "owner non-CWT tag cleanup" });
    clients.owner(["image", "rm", base], { allowFailure: true }); ownerLoaded = false;
    if (clients.owner(["image", "inspect", tag], { allowFailure: true }).status === 0) refuse("owner self-test tag survived cleanup");
    return {
      schemaVersion: 1, status: "passed", ownerToken: token,
      owner: { serverVersion: ownerInfo.serverVersion, snapshotter: ownerInfo.snapshotter, ...isolation },
      base: { reference: base, descriptorDigest: baseDigest, ownerImageId: ownerTag.Id },
      isolation: { outerInvisible: true, outerDeletionRefused: true, ownerRetainedAfterOuterAttempt: true },
      cleanup: { ownerReferencesAbsent: true, workspaceRemoved: true },
    };
  } finally {
    if (ownerLoaded) { clients.owner(["image", "rm", tag, base], { allowFailure: true }); }
    removeExactSyntheticWorkspace(workspace);
  }
}

async function validateRelease(args) {
  const repositoryRoot = absoluteExisting(args.repository ?? process.cwd(), "repository", "directory");
  const releasePath = absoluteExisting(args.release, "release record");
  const ociRoot = absoluteExisting(args.oci, "OCI root", "directory");
  const evidenceRoot = resolve(args.evidence);
  if (!isAbsolute(args.evidence ?? "") || existsSync(evidenceRoot)) refuse("evidence output must be an absent absolute path");
  const ownerHost = args["owner-host"]; const outerHost = args["outer-host"]; const token = args.token;
  if (!SAFE_TOKEN.test(token ?? "") || ownerHost === outerHost) refuse("validation owner/token identity is invalid");
  const helperImage = args["helper-image"] ?? "docker:29.6.2-cli";
  const releaseRoot = dirname(releasePath);
  const workspace = mkdtempSync(resolve(tmpdir(), `cwt-release-validation-${token}-`));
  mkdirSync(evidenceRoot, { recursive: false, mode: 0o700 });
  const clients = createDockerClients({ ownerHost, outerHost, helperImage, repositoryRoot, releaseRoot, workspace });
  clients.ownerHost = ownerHost;
  const rootCompose = resolve(repositoryRoot, "compose.yaml");
  let gateOpen = false; let cleanupPhase = false; let imported = false; let composeStarted = false; let syntheticInstalled = false; let journalController;
  let qualified; let tag; let indexDigest; let releaseId; let nativeChild; let nativePlatform; let project;
  let outcome;
  try {
    const verified = verifyReleaseRecord({ releasePath, ociRoot, requireState: "built" });
    releaseId = verified.record.releaseId; indexDigest = verified.inventory.indexDigest;
    const outerInfo = dockerInfo((command, options) => clients.outer(command, options));
    const ownerInfo = dockerInfo(clients.owner); const isolation = assertExclusiveStore(ownerInfo.store, outerInfo.store);
    nativePlatform = `linux/${JSON.parse(clients.owner(["version", "--format", "{{json .Server.Arch}}"], { label: "owner platform" }).stdout)}`;
    const native = verified.inventory.children.find((child) => child.platform === nativePlatform);
    const nonNative = verified.inventory.children.find((child) => child.platform !== nativePlatform);
    if (!native || !nonNative) refuse("validation owner platform is outside the exact two-child release");
    nativeChild = native.manifestDigest; qualified = digestQualifiedReference("cwt.local/release", indexDigest); tag = `cwt.local/release:${releaseId}`;
    project = `cwt-${token}`;
    createValidationPlan({ ownerHost, outerHost, releaseId, indexDigest, childDigest: nativeChild, project });
    if (clients.owner(["image", "inspect", tag], { allowFailure: true }).status === 0) refuse("release tag pre-exists in validation owner");

    const archive = resolve(workspace, "subject.oci.tar"); createOciArchive(ociRoot, archive);
    clients.owner(["image", "load", "--input", archive], { label: "owner OCI import" }); imported = true;
    const neutralInspection = ownerImageInspection(clients, qualified);
    const platformInspection = ownerImageInspection(clients, qualified, nativePlatform);
    validateResolvedIdentity({ expectedIndex: indexDigest, expectedChild: nativeChild, expectedRevision: releaseId, neutralInspection, platformInspection });
    const afterImport = verifyReleaseRecord({ releasePath, ociRoot, requireState: "built" });
    if (afterImport.state !== "built" || afterImport.inventory.indexDigest !== indexDigest) refuse("release record changed during owner import");

    const dependencyArchive = resolve(workspace, "dependencies.tar");
    clients.outer(["image", "save", "--output", dependencyArchive, ...DEPENDENCY_REFERENCES], { label: "pinned dependency archive" });
    clients.owner(["image", "load", "--input", dependencyArchive], { label: "owner dependency import" });
    const configRoot = createSyntheticConfiguration(workspace, releaseId);
    installSyntheticVmState(clients, configRoot, token); syntheticInstalled = true;
    journalController = startJournalSink(clients, token);
    const environment = composeEnvironment({ qualified, indexDigest, childDigest: nativeChild, repositoryRoot });
    const compose = createComposeClient({ clients, ownerHost, project, repositoryRoot, composeFile: rootCompose, environment, workspace, configRoot });
    const normalized = JSON.parse(compose(["--profile", "production-ai", "config", "--format", "json", "--no-env-resolution", "--no-path-resolution"], { label: "owner Compose normalization" }).stdout);
    validateComposeGraph(normalized, { projectName: project });
    for (const [service, expected] of Object.entries(EXPECTED_TMPFS_ARRAYS)) assert.deepEqual(normalized.services[service].tmpfs, expected);

    const mutationCompose = resolve(workspace, "compose.split-tmpfs.yaml");
    const source = readFileSync(rootCompose, "utf8");
    const oldLine = '      - "/tmp:rw,noexec,nosuid,nodev,size=16777216,uid=999,gid=999,mode=0700"';
    const replacement = "    tmpfs: [/tmp:rw,noexec,nosuid,nodev,size=16777216,uid=999,gid=999,mode=0700]";
    const stagingStart = source.indexOf("  valkey-staging:");
    if (stagingStart < 0 || source.slice(stagingStart).split(oldLine).length - 1 !== 1) refuse("split-tmpfs mutation anchor drifted");
    writeFileSync(mutationCompose, `${source.slice(0, stagingStart)}${source.slice(stagingStart).replace(`    tmpfs:\n${oldLine}`, replacement)}`);
    const mutationProject = `${project}-mutation`;
    const mutationComposeClient = createComposeClient({ clients, ownerHost, project: mutationProject, repositoryRoot, composeFile: mutationCompose, environment, workspace, configRoot });
    const mutated = JSON.parse(mutationComposeClient(["--profile", "production-ai", "config", "--format", "json", "--no-env-resolution", "--no-path-resolution"], { label: "mutated Compose normalization" }).stdout);
    assert.throws(() => validateComposeGraph(mutated, { projectName: mutationProject }), /tmpfs authority drifted|split tmpfs option fragment/u);

    gateOpen = true;
    await subjectOperation(() => compose(["up", "--detach", "--pull", "never", "--no-build", ...EXACT_SERVICES], { label: "authoritative root Compose up" }), "root Compose up failed"); composeStarted = true;
    const healthStates = await subjectOperation(() => waitForComposeHealth(compose), "root Compose health failed");
    const inspections = Object.fromEntries(EXACT_SERVICES.map((service) => [service, inspectContainer(clients, serviceContainer(compose, service))]));
    for (const service of ["postgres", "valkey-production", "valkey-staging"]) {
      try { assert.deepEqual(inspections[service].HostConfig.Tmpfs, EXPECTED_TMPFS[service]); assert.equal(inspections[service].State.Health.Status, "healthy"); }
      catch (error) { subjectRefuse(`${service} runtime authority drifted: ${error.message}`); }
    }
    for (const service of APP_SERVICES) {
      const value = inspections[service];
      try {
        assert.deepEqual(value.Config.Cmd, EXPECTED_WEB_COMMAND); assert.deepEqual(value.Config.Healthcheck.Test, EXPECTED_WEB_HEALTH);
        assert.equal(value.Config.Env.includes("HOSTNAME=0.0.0.0"), true); assert.equal(value.State.Health.Status, "healthy");
        assert.equal(value.Config.Labels?.["cwt.release.index"], indexDigest); assert.equal(value.Config.Labels?.["cwt.release.child"], nativeChild);
        assert.equal(value.Image, indexDigest); assert.deepEqual(value.HostConfig.PortBindings ?? {}, {});
      } catch (error) { subjectRefuse(`${service} exact image/health authority drifted: ${error.message}`); }
      clients.owner(["exec", value.Id, "node", "-e", "fetch('http://127.0.0.1:3000/api/health/ready/',{cache:'no-store'}).then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"], { label: `${service} loopback readiness` });
    }
    const networkNames = [...new Set(Object.values(inspections).flatMap((value) => Object.keys(value.NetworkSettings.Networks ?? {})))];
    const networkEvidence = {};
    for (const name of networkNames) {
      const value = JSON.parse(clients.owner(["network", "inspect", name], { label: "owner network inspection" }).stdout)[0];
      if (value.Internal !== true) subjectRefuse(`${name} is not internal`);
      networkEvidence[name.replace(project, "<project>")] = { internal: value.Internal, driver: value.Driver };
    }
    for (const value of Object.values(inspections)) if (Object.keys(value.HostConfig.PortBindings ?? {}).length !== 0) subjectRefuse("application/dependency port was published");

    const direct = await runDirectMatrix({ clients, qualified, nativePlatform, nativeChild, nonNativePlatform: nonNative.platform, nonNativeChild: nonNative.manifestDigest, project, configRoot, token });

    const negative = mutationComposeClient(["create", "--pull", "never", "valkey-staging"], { allowFailure: true });
    if (negative.status === 0 || !/invalid mount path|mount path must be absolute/u.test(`${negative.stderr}\n${negative.stdout}`)) subjectRefuse("split-tmpfs Compose mutation was not rejected");
    const negativeRunning = mutationComposeClient(["ps", "--status", "running", "--quiet"], { allowFailure: true }).stdout.trim();
    if (negativeRunning !== "") subjectRefuse("split-tmpfs mutation created a running container");
    mutationComposeClient(["down", "--remove-orphans"], { allowFailure: true });

    cleanupPhase = true;
    compose(["down", "--remove-orphans"], { label: "authoritative root Compose down" }); composeStarted = false;
    if (compose(["ps", "--all", "--quiet"], { allowFailure: true }).stdout.trim() !== "") throw new HarnessFailure("Compose consumers remain after teardown");
    const remainingNetworks = clients.owner(["network", "ls", "--quiet", "--filter", `label=com.docker.compose.project=${project}`], { label: "owner zero-network proof" }).stdout.trim();
    if (remainingNetworks !== "") throw new HarnessFailure("Compose networks remain after teardown");
    clients.owner(["image", "rm", qualified, tag], { allowFailure: true }); imported = false;
    for (const reference of DEPENDENCY_REFERENCES) clients.owner(["image", "rm", reference], { allowFailure: true });
    if (clients.owner(["image", "inspect", qualified], { allowFailure: true }).status === 0 || clients.owner(["image", "inspect", tag], { allowFailure: true }).status === 0) {
      throw new HarnessFailure("release reference remains after owner-only cleanup");
    }
    removeSyntheticVmState(clients, token, { label: "Synthetic VM state cleanup" }); syntheticInstalled = false;
    stopJournalSink(clients, journalController, { label: "disposable journal sink cleanup" }); journalController = undefined;
    const final = verifyReleaseRecord({ releasePath, ociRoot, requireState: "built" });
    if (final.state !== "built" || existsSync(resolve(releaseRoot, "transitions/001-staging-validated.json")) || existsSync(resolve(releaseRoot, "transitions/002-promotion-authorized.json"))) {
      throw new HarnessFailure("release lifecycle changed during validation");
    }
    outcome = {
      schemaVersion: 1, status: "passed", gateOpen: true, failureClass: null,
      release: { releaseId, indexDigest, qualifiedReference: qualified, nativePlatform, nativeChildDigest: nativeChild, nonNativePlatform: nonNative.platform, nonNativeChildDigest: nonNative.manifestDigest, releaseRecordSha256: sha256File(releasePath), finalState: "built", revoked: false, transitioned: false },
      owner: { ownerToken: token, serverVersion: ownerInfo.serverVersion, containerdSnapshotter: ownerInfo.snapshotter, ...isolation },
      rootCompose: { path: "compose.yaml", sha256: sha256File(rootCompose), positiveRuns: 1, files: ["compose.yaml"], overrides: 0, services: healthStates, networks: networkEvidence, exactTmpfs: "pass", hostnameAndLoopbackHealth: "pass", exactImageIdentity: "pass", publishedPorts: 0 },
      directRuntime: direct,
      mutation: { splitTmpfsRejected: true, composeCreateExitNonzero: true, zeroRunningContainers: true },
      isolation: { externalProviderCalls: 0, secretValuesRecorded: false, syntheticProtectedConfiguration: true },
      cleanup: { consumers: 0, networks: 0, ownerReleaseReferences: 0, syntheticVmStateRemoved: true },
    };
    writeFileSync(resolve(evidenceRoot, "release-compose-validation.json"), json(outcome), { flag: "wx", mode: 0o444 });
    writeFileSync(resolve(evidenceRoot, "release-compose-validation.json.sha256"), `${sha256File(resolve(evidenceRoot, "release-compose-validation.json"))}  release-compose-validation.json\n`, { flag: "wx", mode: 0o444 });
    return outcome;
  } catch (error) {
    const classification = classifyValidationFailure(error, { gateOpen, cleanup: cleanupPhase });
    const failure = { schemaVersion: 1, status: "blocked", gateOpen, ...classification, message: String(error?.message ?? "unknown").slice(0, 3000) };
    try { writeFileSync(resolve(evidenceRoot, "release-compose-validation-blocked.json"), json(failure), { flag: "wx", mode: 0o444 }); } catch {}
    if (classification.revoke && releaseId && indexDigest) {
      run(process.execPath, [resolve(repositoryRoot, "deploy/scripts/preflight-image.mjs"), "revoke", "--release", releasePath, "--oci", ociRoot, "--index", indexDigest, "--reason", "post_emission_gate_failed"], { label: "immutable subject revocation" });
    }
    throw error;
  } finally {
    cleanupPhase = true;
    if (project && composeStarted && qualified && nativeChild) {
      try {
        const environment = composeEnvironment({ qualified, indexDigest, childDigest: nativeChild, repositoryRoot });
        const compose = createComposeClient({ clients, ownerHost, project, repositoryRoot, composeFile: rootCompose, environment, workspace, configRoot: resolve(workspace, "cwt-config") });
        compose(["down", "--remove-orphans"], { allowFailure: true });
      } catch {}
    }
    if (imported && qualified && tag) clients.owner(["image", "rm", qualified, tag], { allowFailure: true });
    if (syntheticInstalled) { try { removeSyntheticVmState(clients, token, { allowFailure: true }); } catch {} }
    if (journalController) { try { stopJournalSink(clients, journalController, { allowFailure: true }); } catch {} }
    removeExactSyntheticWorkspace(workspace);
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  const args = parseArgs(process.argv.slice(2));
  try {
    if (args.command === "self-test") {
      const result = await selfTest(args); process.stdout.write(`${JSON.stringify(result)}\n`);
    } else if (args.command === "validate") {
      const result = await validateRelease(args); process.stdout.write(`${JSON.stringify({ ok: true, releaseId: result.release.releaseId, indexDigest: result.release.indexDigest, state: result.release.finalState })}\n`);
    } else refuse("unknown command");
  } catch (error) {
    process.stderr.write(`${error?.message ?? "Release Compose preflight failed"}\n`);
    process.exitCode = 1;
  }
}

export const __testOnly = Object.freeze({
  EXACT_SERVICES,
  composeArgs,
  createSyntheticConfiguration,
  directAppArgs,
  removeExactSyntheticWorkspace,
  subjectFailure: (message = "subject") => new SubjectFailure(message),
});
