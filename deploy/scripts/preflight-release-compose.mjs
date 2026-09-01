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
export const OWNER_DIND_REFERENCE = "docker:29.6.2-dind@sha256:bfec1f5159c63a81ca6fdedbd81404d2c0e16378ed0feec3bb3fbf3998847659";
const OWNER_DIND_ARM64_CHILD = "sha256:48bd8cb4ce95d6c03004ee4fe06db27a49813fe0c3a55785a9bf06c941d9a9df";
const OWNER_HELPER_REFERENCE = "docker:29.6.2-cli";
const SELF_TEST_BASE_REFERENCE = "alpine:3.22";
const CONFIG_SUBJECT_NAMES = [
  "database-password", "database-url", "auth-session-secret", "valkey-password", "cloudmersive-api-key", "smtp-password",
  "monitoring-dsn", "ai-api-key", "cos-access-key-id", "cos-secret-key", "backup-password", "database-url-unavailable",
  "valkey-password-wrong", "runtime.env",
];
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
const SELF_TEST_NAMED_VOLUME_PROOF_SCRIPT = [
  'test "$(cat /proof/config)" = "synthetic release validation"',
  'test "$(stat -c %a /proof/config)" = 444',
  'test -f "$1/AGENTS.md"',
  'printf \'%s\\n\' "$2" > "$3"',
  'test "$(stat -c %u:%g "$3")" = 10001:10001',
  'printf \'%s\\n\' "$2-journal-proof"',
  'rm "$3"',
].join("; ");
const SELF_TEST_SERVER_ROOT = "/tmp/cwt-self-test-server";
const SELF_TEST_SERVER_HEALTHCHECK = Object.freeze([
  "CMD", "busybox", "wget", "-T", "2", "-qO-", "http://127.0.0.1:8080/index.html",
]);
const SELF_TEST_SERVER_READINESS_ARGS = Object.freeze([
  "up", "--detach", "--wait", "--wait-timeout", "30", "--pull", "never", "--no-build", "server",
]);
const SELF_TEST_SERVER_SCRIPT = 'umask 077; mkdir -p /tmp/cwt-self-test-server; printf \'%s\\n\' "$1" > /tmp/cwt-self-test-server/index.html; test "$(cat /tmp/cwt-self-test-server/index.html)" = "$1"; exec busybox httpd -f -p 8080 -h /tmp/cwt-self-test-server';
const SELF_TEST_COMMUNICATION_SCRIPT = 'resolver="$(awk \'$1 == "nameserver" { print $2; exit }\' /etc/resolv.conf)"; test "$resolver" = 127.0.0.11; attempt=0; while test "$attempt" -lt 10; do if body="$(busybox wget -T 2 -qO- http://server:8080/index.html)" && test "$body" = "$1"; then printf \'resolver=%s\\nresult=exact-token\\n\' "$resolver"; exit 0; fi; attempt=$((attempt+1)); test "$attempt" -lt 10 && sleep 1; done; exit 1';

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

function fixedShellArgs(script, positional = []) {
  if (typeof script !== "string" || script.length === 0 || !Array.isArray(positional) || positional.some((value) => typeof value !== "string")) {
    refuse("fixed shell command inputs are invalid");
  }
  return Object.freeze(["sh", "-eu", "-c", script, "sh", ...positional]);
}

function createSelfTestShellPlan({ repositoryRoot, token, storageProof }) {
  if (!isAbsolute(repositoryRoot ?? "") || !isAbsolute(storageProof ?? "") || !SAFE_TOKEN.test(token ?? "")) {
    refuse("self-test shell inputs are invalid");
  }
  return Object.freeze({
    namedVolumeProof: fixedShellArgs(SELF_TEST_NAMED_VOLUME_PROOF_SCRIPT, [repositoryRoot, token, storageProof]),
    composeServer: fixedShellArgs(SELF_TEST_SERVER_SCRIPT, [token]),
    communication: fixedShellArgs(SELF_TEST_COMMUNICATION_SCRIPT, [token]),
  });
}

function createSelfTestComposeDefinition({ image, command }) {
  if (typeof image !== "string" || image.length === 0 || !Array.isArray(command) || command.length === 0) refuse("self-test Compose inputs are invalid");
  const definition = {
    services: {
      server: {
        image,
        command,
        healthcheck: {
          test: [...SELF_TEST_SERVER_HEALTHCHECK],
          interval: "1s",
          timeout: "3s",
          retries: 10,
          start_period: "1s",
        },
        networks: ["private"],
        logging: { driver: "journald" },
      },
    },
    networks: { private: { internal: true } },
  };
  validateSelfTestComposeDefinition(definition, { image, command });
  return definition;
}

export function validateSelfTestComposeDefinition(definition, { image, command }) {
  const services = definition?.services ?? {};
  const networks = definition?.networks ?? {};
  const server = services.server;
  const exactServerKeys = ["command", "healthcheck", "image", "logging", "networks"];
  const exactHealthcheckKeys = ["interval", "retries", "start_period", "test", "timeout"];
  if (Object.keys(services).length !== 1 || Object.keys(networks).length !== 1 || !server ||
    JSON.stringify(Object.keys(server).sort()) !== JSON.stringify(exactServerKeys) ||
    server.image !== image || JSON.stringify(server.command) !== JSON.stringify(command) ||
    !Array.isArray(server.networks) || server.networks.length !== 1 || server.networks[0] !== "private" ||
    JSON.stringify(Object.keys(server.healthcheck ?? {}).sort()) !== JSON.stringify(exactHealthcheckKeys) ||
    JSON.stringify(server.healthcheck?.test) !== JSON.stringify(SELF_TEST_SERVER_HEALTHCHECK) ||
    server.healthcheck?.interval !== "1s" || server.healthcheck?.timeout !== "3s" || server.healthcheck?.retries !== 10 || server.healthcheck?.start_period !== "1s" ||
    server.logging?.driver !== "journald" || Object.keys(server.logging ?? {}).length !== 1 ||
    networks.private?.internal !== true || Object.keys(networks.private ?? {}).length !== 1) {
    refuse("self-test Compose server authority drifted");
  }
  return true;
}

export function validateSelfTestServerState({ server, network, networkName }) {
  if (typeof networkName !== "string" || networkName.length === 0 || !server?.Id || network?.Name !== networkName || network.Internal !== true) {
    refuse("non-CWT Compose server network identity drifted");
  }
  const attachments = server.NetworkSettings?.Networks ?? {};
  const attachment = attachments[networkName];
  const aliases = attachment?.Aliases;
  const networkContainer = network.Containers?.[server.Id];
  const publishedBindings = Object.values(server.NetworkSettings?.Ports ?? {}).filter((bindings) => Array.isArray(bindings) && bindings.length > 0);
  const aliasCount = Array.isArray(aliases) ? aliases.filter((alias) => alias === "server").length : 0;
  if (server.State?.Running !== true || server.State?.Health?.Status !== "healthy" ||
    server.HostConfig?.LogConfig?.Type !== "journald" || server.HostConfig?.PublishAllPorts === true || Object.keys(server.HostConfig?.PortBindings ?? {}).length !== 0 || publishedBindings.length !== 0 ||
    Object.keys(attachments).length !== 1 || !attachment || attachment.NetworkID !== network.Id || aliasCount !== 1 ||
    typeof attachment.EndpointID !== "string" || attachment.EndpointID.length === 0 || typeof attachment.IPAddress !== "string" || attachment.IPAddress.length === 0 ||
    Object.keys(network.Containers ?? {}).length !== 1 || !networkContainer || networkContainer.EndpointID !== attachment.EndpointID || typeof networkContainer.IPv4Address !== "string" ||
    !networkContainer.IPv4Address.startsWith(`${attachment.IPAddress}/`)) {
    refuse("non-CWT Compose server is not ready on the exact private network");
  }
  return Object.freeze({
    running: true,
    health: "healthy",
    network: networkName,
    alias: "server",
    endpointId: attachment.EndpointID,
    ipAddress: attachment.IPAddress,
    logging: "journald",
    publishedPorts: 0,
  });
}

export function digestQualifiedReference(repository, indexDigest) {
  if (repository !== "cwt.local/release" || !DIGEST.test(indexDigest ?? "")) refuse("Compose image identity is not the exact release repository@index");
  return `${repository}@${indexDigest}`;
}

export function ownerResources(token) {
  if (!SAFE_TOKEN.test(token ?? "")) refuse("owner run token is invalid");
  const apiRoot = "/run/cwt-owner-api";
  const execRoot = `/run/cwt-owner-exec-${token}`;
  return Object.freeze({
    token,
    controller: `${token}-owner-dind`,
    apiVolume: `${token}-owner-api`,
    dockerDataVolume: `${token}-owner-docker-data`,
    containerdDataVolume: `${token}-owner-containerd-data`,
    configVolume: `${token}-owner-config`,
    storageVolume: `${token}-owner-storage`,
    journalVolume: `${token}-owner-journal`,
    journalHelper: `${token}-journal-sink`,
    apiRoot,
    ownerHost: `unix://${apiRoot}/docker.sock`,
    execRoot,
    pidFile: `/run/cwt-owner-${token}.pid`,
  });
}

export function assertExclusiveStore(owner, outer, expectedOwnerExecRoot) {
  for (const [label, value] of [["owner", owner], ["outer", outer]]) {
    if (!value || typeof value !== "object" || typeof value.address !== "string" || !value.address.startsWith("/") ||
      typeof value.containersNamespace !== "string" || value.containersNamespace.length === 0 ||
      typeof value.pluginsNamespace !== "string" || value.pluginsNamespace.length === 0) refuse(`${label} containerd store identity is incomplete`);
  }
  const ownerTuple = `${owner.address}\0${owner.containersNamespace}\0${owner.pluginsNamespace}`;
  const outerTuple = `${outer.address}\0${outer.containersNamespace}\0${outer.pluginsNamespace}`;
  const conventional = owner.containersNamespace === "moby" && owner.pluginsNamespace === "plugins.moby";
  const privateAddress = typeof expectedOwnerExecRoot === "string" && owner.address.startsWith(`${expectedOwnerExecRoot}/`);
  if (ownerTuple === outerTuple || owner.address === outer.address || !privateAddress || !conventional) {
    refuse("validation owner shares the outer containerd store/namespace");
  }
  return Object.freeze({
    socketIdentityClass: "private-containerd-socket",
    containerdAddressClass: "run-unique-exec-root",
    namespace: owner.containersNamespace,
    pluginsNamespace: owner.pluginsNamespace,
  });
}

export function ownerDockerArgs(ownerHost, args) {
  if (typeof ownerHost !== "string" || !ownerHost.startsWith("unix:///run/cwt-owner-api/")) refuse("owner Docker endpoint must be the private Unix socket");
  if (!Array.isArray(args) || args.length === 0) refuse("owner Docker command is empty");
  return Object.freeze(["docker", "--host", ownerHost, ...args]);
}

function samePathMount(path, readOnly = false) {
  return `type=bind,source=${path},target=${path}${readOnly ? ",readonly" : ""}`;
}

export function createOwnerControllerPlan({ token, outerHost, repositoryRoot }) {
  const resources = ownerResources(token);
  if (typeof outerHost !== "string" || !outerHost.startsWith("unix://") || !isAbsolute(repositoryRoot ?? "")) {
    refuse("owner controller inputs are invalid");
  }
  const volumes = [
    resources.apiVolume, resources.dockerDataVolume, resources.containerdDataVolume,
    resources.configVolume, resources.storageVolume, resources.journalVolume,
  ];
  const controllerRun = [
    "docker", "--host", outerHost, "run", "--detach", "--name", resources.controller,
    "--pull", "never", "--network", "none", "--privileged",
    "--mount", `type=volume,source=${resources.apiVolume},target=${resources.apiRoot}`,
    "--mount", `type=volume,source=${resources.dockerDataVolume},target=/var/lib/docker`,
    "--mount", `type=volume,source=${resources.containerdDataVolume},target=/var/lib/containerd`,
    "--mount", `type=volume,source=${resources.configVolume},target=/etc/cwt,readonly,volume-nocopy`,
    "--mount", `type=volume,source=${resources.storageVolume},target=/srv/cwt,volume-nocopy`,
    "--mount", `type=volume,source=${resources.journalVolume},target=/run/systemd/journal,volume-nocopy`,
    "--mount", samePathMount(repositoryRoot, true),
    "--env", "DOCKER_TLS_CERTDIR=", OWNER_DIND_REFERENCE, "dockerd",
    `--host=${resources.ownerHost}`, "--data-root=/var/lib/docker", `--exec-root=${resources.execRoot}`, `--pidfile=${resources.pidFile}`,
  ];
  const diagnostics = [
    ["docker", "--host", outerHost, "inspect", resources.controller],
    ["docker", "--host", outerHost, "logs", "--timestamps", resources.controller],
  ];
  const cleanup = [
    ["docker", "--host", outerHost, "stop", "--time", "20", resources.controller],
    ["docker", "--host", outerHost, "wait", resources.controller],
    ["docker", "--host", outerHost, "rm", resources.controller],
    ["docker", "--host", outerHost, "rm", "--force", resources.journalHelper],
    ...volumes.map((name) => ["docker", "--host", outerHost, "volume", "rm", name]),
  ];
  const plan = Object.freeze({
    resources,
    volumeCreate: Object.freeze(volumes.map((name) => Object.freeze(["docker", "--host", outerHost, "volume", "create", "--name", name]))),
    controllerRun: Object.freeze(controllerRun),
    readiness: Object.freeze(ownerHelperArgs({ resources, outerHost, helperImage: OWNER_HELPER_REFERENCE, mounts: [], args: ["info"] })),
    diagnostics: Object.freeze(diagnostics.map((command) => Object.freeze(command))),
    cleanup: Object.freeze(cleanup.map((command) => Object.freeze(command))),
    finalization: Object.freeze([...diagnostics, ...cleanup].map((command) => Object.freeze(command))),
  });
  validateOwnerControllerPlan(plan, { outerHost, repositoryRoot });
  return plan;
}

export function validateOwnerControllerPlan(plan, { outerHost, repositoryRoot }) {
  const { resources } = plan ?? {};
  const runArgs = plan?.controllerRun ?? [];
  const rendered = runArgs.join(" ");
  const required = [
    "--pull never", "--network none", "--privileged", OWNER_DIND_REFERENCE,
    `source=${resources?.apiVolume},target=${resources?.apiRoot}`,
    `source=${resources?.dockerDataVolume},target=/var/lib/docker`,
    `source=${resources?.containerdDataVolume},target=/var/lib/containerd`,
    `source=${resources?.configVolume},target=/etc/cwt,readonly,volume-nocopy`,
    `source=${resources?.storageVolume},target=/srv/cwt,volume-nocopy`,
    `source=${resources?.journalVolume},target=/run/systemd/journal,volume-nocopy`,
    `source=${repositoryRoot},target=${repositoryRoot},readonly`,
    `--host=${resources?.ownerHost}`, `--exec-root=${resources?.execRoot}`, `--pidfile=${resources?.pidFile}`,
  ];
  if (!Array.isArray(runArgs) || runArgs.slice(0, 3).join(" ") !== `docker --host ${outerHost}` || required.some((value) => !rendered.includes(value))) {
    refuse("private DIND controller plan is incomplete");
  }
  const mountValues = runArgs.filter((value, index) => runArgs[index - 1] === "--mount");
  const bindMounts = mountValues.filter((value) => value.startsWith("type=bind,"));
  if (bindMounts.length !== 1 || bindMounts[0] !== samePathMount(repositoryRoot, true) ||
    runArgs.filter((value) => value === "--network").length !== 1 || runArgs.some((value) => value.startsWith("--network=") || value === "--add-host" || value.startsWith("--add-host=") || value === "--ip" || value.startsWith("--ip=") || value === "--dns" || value.startsWith("--dns=")) ||
    runArgs.includes("--rm") || runArgs.includes("--pid") || runArgs.includes("host") || runArgs.includes("--publish") || runArgs.includes("-p") ||
    rendered.includes("docker.sock,target") || rendered.includes("containerd.sock") || rendered.includes("type=bind,source=/etc/cwt") ||
    rendered.includes("type=bind,source=/srv/cwt") || rendered.includes("type=bind,source=/run/systemd/journal") ||
    rendered.includes("--bridge=") || rendered.includes("--iptables") || rendered.includes("nsenter") || /tcp:\/\//u.test(rendered)) {
    refuse("private DIND controller plan escapes its isolation boundary");
  }
  const diagnostics = plan.diagnostics.flat().join(" ");
  const cleanup = plan.cleanup.flat().join(" ");
  const expectedFinalization = [...plan.diagnostics, ...plan.cleanup].map((command) => command.join("\0"));
  const actualFinalization = (plan.finalization ?? []).map((command) => command.join("\0"));
  const diagnosticLogIndex = actualFinalization.findIndex((command) => command.includes(`logs\0--timestamps\0${resources.controller}`));
  const controllerRemovalIndex = actualFinalization.findIndex((command) => command.endsWith(`rm\0${resources.controller}`));
  const helperRemovalIndex = actualFinalization.findIndex((command) => command.endsWith(`rm\0--force\0${resources.journalHelper}`));
  const journalVolumeRemovalIndex = actualFinalization.findIndex((command) => command.endsWith(`volume\0rm\0${resources.journalVolume}`));
  if (!diagnostics.includes(`inspect ${resources.controller}`) || !diagnostics.includes(`logs --timestamps ${resources.controller}`) ||
    cleanup.indexOf(`rm ${resources.controller}`) < cleanup.indexOf(`wait ${resources.controller}`) ||
    JSON.stringify(actualFinalization) !== JSON.stringify(expectedFinalization) || diagnosticLogIndex < 0 || controllerRemovalIndex < diagnosticLogIndex ||
    helperRemovalIndex < controllerRemovalIndex || journalVolumeRemovalIndex < helperRemovalIndex) refuse("owner diagnostics or cleanup order is invalid");
  return true;
}

export function ownerHelperArgs({ resources, outerHost, helperImage = OWNER_HELPER_REFERENCE, mounts = [], volumes = [], environment = {}, args }) {
  if (!resources?.ownerHost?.startsWith("unix://") || typeof outerHost !== "string" || !outerHost.startsWith("unix://") || !Array.isArray(args) || args.length === 0) refuse("owner helper plan is invalid");
  const mountArgs = [
    "--mount", `type=volume,source=${resources.apiVolume},target=${resources.apiRoot}`,
    ...mounts.flatMap(([path, readOnly = false]) => ["--mount", samePathMount(path, readOnly)]),
    ...volumes.flatMap(([source, target, readOnly = false]) => ["--mount", `type=volume,source=${source},target=${target}${readOnly ? ",readonly" : ""},volume-nocopy`]),
  ];
  const envArgs = Object.entries(environment).flatMap(([key, value]) => ["--env", `${key}=${value}`]);
  return ["docker", "--host", outerHost, "run", "--rm", "--pull", "never", "--network", "none", ...mountArgs, ...envArgs, helperImage, "docker", "--host", resources.ownerHost, ...args];
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

function createDockerClients({ resources, outerHost, helperImage, repositoryRoot, releaseRoot, workspace }) {
  const outer = (args, options = {}) => run("docker", ["--host", outerHost, ...args], options);
  const mountMap = new Map([
    [repositoryRoot, repositoryRoot, true],
    [releaseRoot, releaseRoot, true],
    [workspace, workspace, false],
  ].map((entry) => [entry[1], entry]));
  const mounts = [...mountMap.values()].map(([path,, readOnly]) => [path, readOnly]);
  const owner = (args, options = {}) => {
    const { helperEnvironment = {}, helperVolumes = [], ...runOptions } = options;
    const command = ownerHelperArgs({ resources, outerHost, helperImage, mounts, volumes: helperVolumes, environment: helperEnvironment, args });
    return run(command[0], command.slice(1), runOptions);
  };
  return { outer, owner, ownerHost: resources.ownerHost, resources };
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

export function validatePinnedDindPlatformInspection(inspection) {
  const indexDigest = OWNER_DIND_REFERENCE.split("@")[1];
  if (inspection?.Descriptor?.digest !== OWNER_DIND_ARM64_CHILD || inspection.Os !== "linux" || inspection.Architecture !== "arm64" || inspection.Variant !== "v8" ||
    !inspection.RepoDigests?.includes(`docker@${indexDigest}`)) refuse("pinned DIND index/platform identity drifted");
  return true;
}

export function pinnedDindVersionProbeArgs() {
  return Object.freeze(["run", "--rm", "--pull", "never", "--network", "none", "--entrypoint", "dockerd", OWNER_DIND_REFERENCE, "--version"]);
}

function verifyPinnedOwnerImages(clients, workspace) {
  for (const reference of [OWNER_HELPER_REFERENCE, SELF_TEST_BASE_REFERENCE, OWNER_DIND_REFERENCE]) {
    if (clients.outer(["image", "inspect", reference], { allowFailure: true }).status !== 0) refuse(`required pinned local image is absent: ${reference}`);
  }
  const child = parseInspection(clients.outer(["image", "inspect", "--platform", "linux/arm64/v8", OWNER_DIND_REFERENCE], { label: "Pinned DIND arm64 identity" }));
  const indexDigest = OWNER_DIND_REFERENCE.split("@")[1];
  validatePinnedDindPlatformInspection(child);
  const archive = resolve(workspace, "pinned-owner-dind.tar");
  clients.outer(["image", "save", "--output", archive, OWNER_DIND_REFERENCE], { label: "Pinned DIND local OCI inventory" });
  const archiveIndex = JSON.parse(run("tar", ["-xOf", archive, "index.json"], { label: "Pinned DIND archive index" }).stdout);
  if (!archiveIndex.manifests?.some((descriptor) => descriptor.digest === indexDigest)) refuse("pinned DIND archive omitted the exact index");
  const imageIndex = JSON.parse(run("tar", ["-xOf", archive, `blobs/sha256/${indexDigest.slice("sha256:".length)}`], { label: "Pinned DIND image index" }).stdout);
  if (!imageIndex.manifests?.some((descriptor) => descriptor.digest === OWNER_DIND_ARM64_CHILD && descriptor.platform?.os === "linux" && descriptor.platform?.architecture === "arm64" && descriptor.platform?.variant === "v8")) {
    refuse("pinned DIND archive arm64 child identity drifted");
  }
  const version = clients.outer(pinnedDindVersionProbeArgs(), { label: "Pinned DIND Docker version" });
  if (!/Docker version 29\.6\.2\b/u.test(version.stdout)) refuse("pinned DIND embedded Docker version drifted");
  return { indexDigest, arm64ChildDigest: OWNER_DIND_ARM64_CHILD, dockerVersion: "29.6.2" };
}

function assertOwnerResourcesAbsent(clients) {
  const { resources } = clients;
  if (clients.outer(["container", "inspect", resources.controller], { allowFailure: true }).status === 0) refuse("owner controller pre-exists");
  if (clients.outer(["container", "inspect", resources.journalHelper], { allowFailure: true }).status === 0) refuse("journal helper pre-exists");
  for (const name of [resources.apiVolume, resources.dockerDataVolume, resources.containerdDataVolume, resources.configVolume, resources.storageVolume, resources.journalVolume]) {
    if (clients.outer(["volume", "inspect", name], { allowFailure: true }).status === 0) refuse(`owner volume pre-exists: ${name}`);
  }
}

function createOwnerVolumes(clients, plan) {
  assertOwnerResourcesAbsent(clients);
  for (const command of plan.volumeCreate) run(command[0], command.slice(1), { label: "Owner volume create" });
}

function startOwnerController(clients, plan) {
  const started = run(plan.controllerRun[0], plan.controllerRun.slice(1), { label: "Private DIND controller start" });
  if (!started.stdout.trim()) refuse("private DIND controller did not start");
}

async function waitForOwnerReady(clients) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const stateResult = clients.outer(["container", "inspect", "--format", "{{json .State}}", clients.resources.controller], { allowFailure: true });
    if (stateResult.status === 0) {
      const state = JSON.parse(stateResult.stdout);
      if (state.Running !== true) refuse(`private DIND controller exited before readiness (${state.ExitCode ?? "unknown"})`);
      if (clients.owner(["info"], { allowFailure: true }).status === 0) {
        const ownerInfo = dockerInfo(clients.owner);
        const outerInfo = dockerInfo((args, options) => clients.outer(args, options));
        if (ownerInfo.serverVersion !== "29.6.2" || ownerInfo.snapshotter !== true) refuse("private DIND version or containerd snapshotter drifted");
        const isolation = assertExclusiveStore(ownerInfo.store, outerInfo.store, clients.resources.execRoot);
        return { ownerInfo, outerInfo, isolation };
      }
    }
    await pause(1000);
  }
  refuse("private DIND did not become ready within 60 seconds");
}

function captureOwnerDiagnostics(clients, evidenceRoot) {
  const inspectResult = clients.outer(["container", "inspect", clients.resources.controller], { allowFailure: true });
  const logsResult = clients.outer(["logs", "--timestamps", clients.resources.controller], { allowFailure: true });
  let state = { available: false };
  if (inspectResult.status === 0) {
    const inspected = JSON.parse(inspectResult.stdout)[0];
    state = {
      available: true,
      state: inspected.State?.Status ?? "unknown",
      running: inspected.State?.Running === true,
      exitCode: inspected.State?.ExitCode ?? null,
      error: String(inspected.State?.Error ?? "").slice(0, 500),
      image: inspected.Config?.Image ?? null,
      networkMode: inspected.HostConfig?.NetworkMode ?? null,
      privileged: inspected.HostConfig?.Privileged === true,
    };
  }
  const inspectPath = resolve(evidenceRoot, "owner-dind-inspect.sanitized.json");
  const logPath = resolve(evidenceRoot, "owner-dind.log");
  if (!existsSync(inspectPath)) writeFileSync(inspectPath, json(state), { flag: "wx", mode: 0o400 });
  if (!existsSync(logPath)) writeFileSync(logPath, `${logsResult.stdout}${logsResult.stderr}`, { flag: "wx", mode: 0o400 });
  const logSha256 = sha256File(logPath);
  const sidecar = resolve(evidenceRoot, "owner-dind.log.sha256");
  if (!existsSync(sidecar)) writeFileSync(sidecar, `${logSha256}  owner-dind.log\n`, { flag: "wx", mode: 0o400 });
  const helperInspectResult = clients.outer(["container", "inspect", clients.resources.journalHelper], { allowFailure: true });
  const helperLogsResult = clients.outer(["logs", "--timestamps", clients.resources.journalHelper], { allowFailure: true });
  let helperState = { available: false };
  if (helperInspectResult.status === 0) {
    const inspected = JSON.parse(helperInspectResult.stdout)[0];
    helperState = {
      available: true,
      state: inspected.State?.Status ?? "unknown",
      running: inspected.State?.Running === true,
      exitCode: inspected.State?.ExitCode ?? null,
      image: inspected.Config?.Image ?? null,
      networkMode: inspected.HostConfig?.NetworkMode ?? null,
      pidMode: inspected.HostConfig?.PidMode ?? null,
    };
  }
  const helperInspectPath = resolve(evidenceRoot, "owner-journal-helper-inspect.sanitized.json");
  const helperLogPath = resolve(evidenceRoot, "owner-journal-helper.log");
  if (!existsSync(helperInspectPath)) writeFileSync(helperInspectPath, json(helperState), { flag: "wx", mode: 0o400 });
  if (!existsSync(helperLogPath)) writeFileSync(helperLogPath, `${helperLogsResult.stdout}${helperLogsResult.stderr}`, { flag: "wx", mode: 0o400 });
  const helperLogSha256 = sha256File(helperLogPath);
  const helperSidecar = resolve(evidenceRoot, "owner-journal-helper.log.sha256");
  if (!existsSync(helperSidecar)) writeFileSync(helperSidecar, `${helperLogSha256}  owner-journal-helper.log\n`, { flag: "wx", mode: 0o400 });
  return { inspect: state, logSha256, journalHelperInspect: helperState, journalHelperLogSha256: helperLogSha256 };
}

function captureSelfTestComposeDiagnostics({ clients, compose, evidenceRoot, networkName, serverId }) {
  let exactServerId = serverId;
  if (!exactServerId) {
    const identity = compose(["ps", "--all", "--quiet", "server"], { allowFailure: true });
    exactServerId = identity.status === 0 ? identity.stdout.trim() : "";
  }
  const inspectResult = exactServerId
    ? clients.owner(["container", "inspect", exactServerId], { allowFailure: true })
    : { status: 1, stdout: "", stderr: "server identity unavailable" };
  const logsResult = exactServerId
    ? clients.owner(["logs", "--timestamps", "--tail", "200", exactServerId], { allowFailure: true })
    : { status: 1, stdout: "", stderr: "server identity unavailable" };
  const networkResult = clients.owner(["network", "inspect", networkName], { allowFailure: true });
  let serverEvidence = { available: false, id: exactServerId || null, error: String(inspectResult.stderr || inspectResult.stdout || "server inspect unavailable").slice(0, 2000) };
  if (inspectResult.status === 0) {
    const inspected = JSON.parse(inspectResult.stdout)[0];
    serverEvidence = {
      available: true,
      id: inspected.Id,
      state: inspected.State,
      image: inspected.Config?.Image ?? null,
      command: inspected.Config?.Cmd ?? null,
      healthcheck: inspected.Config?.Healthcheck ?? null,
      mounts: inspected.Mounts ?? [],
      logConfig: inspected.HostConfig?.LogConfig ?? null,
      portBindings: inspected.HostConfig?.PortBindings ?? null,
      ports: inspected.NetworkSettings?.Ports ?? null,
      networks: inspected.NetworkSettings?.Networks ?? null,
    };
  }
  let networkEvidence = { available: false, name: networkName, error: String(networkResult.stderr || networkResult.stdout || "network inspect unavailable").slice(0, 2000) };
  if (networkResult.status === 0) {
    const inspected = JSON.parse(networkResult.stdout)[0];
    networkEvidence = {
      available: true,
      id: inspected.Id,
      name: inspected.Name,
      driver: inspected.Driver,
      internal: inspected.Internal,
      labels: inspected.Labels,
      containers: inspected.Containers,
    };
  }
  const inspectPath = resolve(evidenceRoot, "self-test-server-inspect.sanitized.json");
  const logPath = resolve(evidenceRoot, "self-test-server.log");
  const networkPath = resolve(evidenceRoot, "self-test-network-inspect.sanitized.json");
  writeFileSync(inspectPath, json(serverEvidence), { flag: "wx", mode: 0o400 });
  writeFileSync(logPath, `${logsResult.stdout}${logsResult.stderr}`.slice(0, 64 * 1024), { flag: "wx", mode: 0o400 });
  writeFileSync(networkPath, json(networkEvidence), { flag: "wx", mode: 0o400 });
  return Object.freeze({
    serverInspectSha256: sha256File(inspectPath),
    serverLogSha256: sha256File(logPath),
    networkInspectSha256: sha256File(networkPath),
  });
}

function finalizeSelfTestCompose({ clients, compose, evidenceRoot, networkName, serverId, attempt }) {
  const diagnostics = attempt(() => captureSelfTestComposeDiagnostics({ clients, compose, evidenceRoot, networkName, serverId }));
  attempt(() => compose(["down", "--remove-orphans"], { label: "Non-CWT inner Compose down" }));
  attempt(() => {
    if (compose(["ps", "--all", "--quiet"], { allowFailure: true }).stdout.trim() !== "") throw new HarnessFailure("non-CWT Compose consumers survived cleanup");
  });
  attempt(() => {
    if (clients.owner(["network", "ls", "--quiet", "--filter", `label=com.docker.compose.project=${networkName.slice(0, -"_private".length)}`], { allowFailure: true }).stdout.trim() !== "") {
      throw new HarnessFailure("non-CWT Compose network survived cleanup");
    }
  });
  return diagnostics;
}

function cleanupOwnerInfrastructure(clients, evidenceRoot) {
  const diagnostics = captureOwnerDiagnostics(clients, evidenceRoot);
  const containerPresent = clients.outer(["container", "inspect", clients.resources.controller], { allowFailure: true }).status === 0;
  if (containerPresent) {
    if (diagnostics.inspect.running) clients.outer(["stop", "--time", "20", clients.resources.controller], { label: "Private DIND controller stop" });
    clients.outer(["wait", clients.resources.controller], { label: "Private DIND controller wait" });
    clients.outer(["rm", clients.resources.controller], { label: "Private DIND controller removal" });
  }
  if (clients.outer(["container", "inspect", clients.resources.journalHelper], { allowFailure: true }).status === 0) {
    clients.outer(["rm", "--force", clients.resources.journalHelper], { label: "Journal helper removal" });
  }
  for (const name of [
    clients.resources.apiVolume, clients.resources.dockerDataVolume, clients.resources.containerdDataVolume,
    clients.resources.configVolume, clients.resources.storageVolume, clients.resources.journalVolume,
  ]) {
    if (clients.outer(["volume", "inspect", name], { allowFailure: true }).status === 0) clients.outer(["volume", "rm", name], { label: `Owner volume removal ${name}` });
  }
  if (clients.outer(["container", "inspect", clients.resources.controller], { allowFailure: true }).status === 0) throw new HarnessFailure("private DIND controller survived cleanup");
  if (clients.outer(["container", "inspect", clients.resources.journalHelper], { allowFailure: true }).status === 0) throw new HarnessFailure("journal helper survived cleanup");
  for (const name of [
    clients.resources.apiVolume, clients.resources.dockerDataVolume, clients.resources.containerdDataVolume,
    clients.resources.configVolume, clients.resources.storageVolume, clients.resources.journalVolume,
  ]) {
    if (clients.outer(["volume", "inspect", name], { allowFailure: true }).status === 0) throw new HarnessFailure(`owner volume survived cleanup: ${name}`);
  }
  return diagnostics;
}

export async function cleanupPreservingPrimary(primaryError, cleanup) {
  let cleanupError;
  let result;
  try { result = await cleanup(); } catch (error) { cleanupError = error; }
  if (primaryError) {
    if (cleanupError) Object.defineProperty(primaryError, "cleanupFailure", { value: String(cleanupError?.message ?? cleanupError), enumerable: true });
    throw primaryError;
  }
  if (cleanupError) throw cleanupError;
  return result;
}

function composeEnvironment({ qualified, indexDigest, childDigest, repositoryRoot }) {
  return {
    CWT_IMAGE_REFERENCE: qualified,
    CWT_IMAGE_INDEX_DIGEST: indexDigest,
    CWT_IMAGE_CHILD_DIGEST: childDigest,
    CWT_CLOUDFLARE_RANGES_FILE: resolve(repositoryRoot, "deploy/proxy/cloudflare-ranges.lab.conf"),
  };
}

function composeArgs({ resources, outerHost, project, repositoryRoot, composeFile, environment, args }) {
  return ownerHelperArgs({
    resources, outerHost,
    mounts: [[repositoryRoot, true]],
    volumes: [[resources.configVolume, "/etc/cwt", true]],
    environment,
    args: ["compose", "--project-name", project, "--project-directory", repositoryRoot, "--file", composeFile, "--profile", "staging", ...args],
  });
}

function createComposeClient({ clients, project, repositoryRoot, composeFile, environment }) {
  return (args, options = {}) => {
    return clients.owner([
      "compose", "--project-name", project, "--project-directory", repositoryRoot, "--file", composeFile, "--profile", "staging", ...args,
    ], { ...options, helperEnvironment: environment, helperVolumes: [[clients.resources.configVolume, "/etc/cwt", true]] });
  };
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

export function createVolumeProjectionPlan({ resources, outerHost, configRoot, token }) {
  if (!resources || token !== resources.token || typeof outerHost !== "string" || !outerHost.startsWith("unix://") || !isAbsolute(configRoot ?? "")) {
    refuse("volume projection inputs are invalid");
  }
  const expectedConfig = [
    ".cwt-release-validation", "postgres/bootstrap-password",
    ...["production", "staging"].flatMap((environment) => CONFIG_SUBJECT_NAMES.map((name) => `${environment}/${name}`)),
  ];
  const expectedArgs = expectedConfig.map((path) => `/target/${path}`).join(" ");
  const configScript = [
    "test -f /payload/.cwt-release-validation",
    "test -z \"$(find /target -mindepth 1 -print -quit)\"",
    "cp -a /payload/. /target/",
    "chmod 0700 /target /target/postgres /target/production /target/staging",
    "find /target -type f -exec chmod 0444 {} +",
    `set -- ${expectedArgs}`,
    `test \"$#\" -eq ${expectedConfig.length}`,
    "for file; do test -f \"$file\"; test \"$(stat -c %a \"$file\")\" = 444; done",
    `test \"$(find /target -type f | wc -l)\" -eq ${expectedConfig.length}`,
    "grep -qx 'synthetic release validation' /target/.cwt-release-validation",
  ].join("\n");
  const storageScript = [
    "test -z \"$(find /target -mindepth 1 -print -quit)\"",
    "mkdir -p /target/production/media/public /target/production/media/private-inquiries /target/production/media/import /target/staging/media/public /target/staging/media/private-inquiries /target/staging/media/import /target/postgresql/data /target/backups/postgresql/production /target/backups/postgresql/staging",
    ': > "/target/.$1"',
    "chown -R 10001:10001 /target/production /target/staging",
    "chmod -R 0700 /target/production /target/staging",
    "chown -R 999:999 /target/postgresql",
    "chmod -R 0700 /target/postgresql",
    "for path in /target/production /target/staging; do test \"$(stat -c %u:%g:%a \"$path\")\" = 10001:10001:700; done",
    "test \"$(stat -c %u:%g:%a /target/postgresql)\" = 999:999:700",
    "test -d /target/backups/postgresql/production",
    "test -d /target/backups/postgresql/staging",
  ].join("; ");
  const journalScript = [
    "helper_pid=$$",
    "child_pid=",
    "cleanup() { status=$?; trap - EXIT TERM INT; if test -n \"${child_pid:-}\"; then kill -TERM \"$child_pid\" 2>/dev/null || true; attempt=0; while kill -0 \"$child_pid\" 2>/dev/null; do attempt=$((attempt+1)); if test \"$attempt\" -ge 50; then kill -KILL \"$child_pid\" 2>/dev/null || true; break; fi; sleep 0.1; done; wait \"$child_pid\" 2>/dev/null || true; fi; exit \"$status\"; }",
    "trap cleanup EXIT TERM INT",
    "nsenter -t 1 -m -- socat UNIX-RECVFROM:/proc/${helper_pid}/root/run/systemd/journal/socket,fork OPEN:/dev/null &",
    "child_pid=$!",
    "wait \"$child_pid\"",
  ].join("\n");
  const exact = (args) => Object.freeze(["docker", "--host", outerHost, ...args]);
  const plan = Object.freeze({
    expectedConfig: Object.freeze(expectedConfig),
    configPopulate: exact([
      "run", "--rm", "--pull", "never", "--network", "none",
      "--mount", `type=bind,source=${configRoot},target=/payload,readonly`,
      "--mount", `type=volume,source=${resources.configVolume},target=/target,volume-nocopy`,
      SELF_TEST_BASE_REFERENCE, ...fixedShellArgs(configScript),
    ]),
    storagePopulate: exact([
      "run", "--rm", "--pull", "never", "--network", "none",
      "--mount", `type=volume,source=${resources.storageVolume},target=/target,volume-nocopy`,
      SELF_TEST_BASE_REFERENCE, ...fixedShellArgs(storageScript, [token]),
    ]),
    journalStart: exact([
      "run", "--detach", "--name", resources.journalHelper, "--pull", "never", "--network", "none", "--privileged", "--pid", "host",
      "--mount", `type=volume,source=${resources.journalVolume},target=/run/systemd/journal,volume-nocopy`,
      SELF_TEST_BASE_REFERENCE, ...fixedShellArgs(journalScript),
    ]),
    journalProbe: exact([
      "run", "--rm", "--pull", "never", "--network", "none",
      "--mount", `type=volume,source=${resources.journalVolume},target=/probe,readonly,volume-nocopy`,
      SELF_TEST_BASE_REFERENCE, ...fixedShellArgs("attempt=0; while ! test -S /probe/socket; do attempt=$((attempt+1)); test \"$attempt\" -lt 100; sleep 0.1; done"),
    ]),
  });
  validateVolumeProjectionPlan(plan, { resources, outerHost, configRoot });
  return plan;
}

export function validateVolumeProjectionPlan(plan, { resources, outerHost, configRoot }) {
  for (const command of [plan?.configPopulate, plan?.storagePopulate, plan?.journalStart, plan?.journalProbe]) {
    if (!Array.isArray(command) || command.slice(0, 3).join(" ") !== `docker --host ${outerHost}` || command.includes("tcp://") || !command.includes("--pull") || !command.includes("never")) {
      refuse("volume projection command plan is invalid");
    }
  }
  const config = plan.configPopulate.join(" ");
  const storage = plan.storagePopulate.join(" ");
  const journal = plan.journalStart.join(" ");
  if (!config.includes(`type=bind,source=${configRoot},target=/payload,readonly`) || !config.includes(`source=${resources.configVolume},target=/target,volume-nocopy`) ||
    !storage.includes(`source=${resources.storageVolume},target=/target,volume-nocopy`) || config.includes("/srv/cwt") || storage.includes("/etc/cwt") ||
    !storage.includes(': > "/target/.$1"') || storage.includes(`: > /target/.${resources.token}`) || plan.storagePopulate.at(-2) !== "sh" || plan.storagePopulate.at(-1) !== resources.token) {
    refuse("config/storage named-volume authority drifted");
  }
  if (!journal.includes(`--name ${resources.journalHelper}`) || !journal.includes(`source=${resources.journalVolume},target=/run/systemd/journal,volume-nocopy`) ||
    !journal.includes("helper_pid=$$") || !journal.includes("child_pid=$!") || !journal.includes("trap cleanup EXIT TERM INT") ||
    !journal.includes("nsenter -t 1 -m -- socat UNIX-RECVFROM:/proc/${helper_pid}/root/run/systemd/journal/socket,fork OPEN:/dev/null &") ||
    !journal.includes("wait \"$child_pid\"") || !journal.includes("kill -TERM \"$child_pid\"") || !journal.includes("kill -KILL \"$child_pid\"") ||
    journal.includes("exec nsenter") || journal.includes("UNIX-RECV:") || journal.includes("Mountpoint")) {
    refuse("journal helper authority drifted");
  }
  return true;
}

function populateOwnerVolumes(clients, projectionPlan) {
  run(projectionPlan.configPopulate[0], projectionPlan.configPopulate.slice(1), { label: "Synthetic config volume population" });
  run(projectionPlan.storagePopulate[0], projectionPlan.storagePopulate.slice(1), { label: "Synthetic storage volume population" });
  const helper = run(projectionPlan.journalStart[0], projectionPlan.journalStart.slice(1), { label: "Disposable journal helper start" });
  if (!helper.stdout.trim()) refuse("disposable journal helper did not start");
  run(projectionPlan.journalProbe[0], projectionPlan.journalProbe.slice(1), { label: "Volume-backed journal socket readiness" });
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

function runDirectContainer(clients, args, { backendNetwork, databaseNetwork, ingressNetwork }) {
  const normalized = args.map((value) => value === "<backend-network>" ? backendNetwork : value);
  const result = clients.owner(normalized, { label: "Direct exact-subject container start" });
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

async function runDirectMatrix({ clients, qualified, nativePlatform, nativeChild, nonNativePlatform, nonNativeChild, project, token }) {
  const networks = {
    backend: `${project}_staging-backend`, database: `${project}_staging-database`, ingress: `${project}_staging-ingress`,
  };
  const cases = [];
  const runCase = async ({ id, platform, expectedStatus, failedComponent, overrides, missingImport }) => {
    const name = `${token}-${id}`;
    let container;
    try {
      container = runDirectContainer(clients, directAppArgs({ name, platform, qualified, overrides, missingImport }), {
        backendNetwork: networks.backend, databaseNetwork: networks.database, ingressNetwork: networks.ingress,
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
        backendNetwork: networks.backend, databaseNetwork: networks.database,
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
    const result = clients.owner(normalized, { allowFailure: true });
    if (result.status !== 2 || !result.stdout.includes("Work health:")) subjectRefuse("one-shot work-health signal drifted");
    roles.push({ id: "work-health-one-shot", exitCode: 2, signal: "observed-unhealthy-missing-backup" });
  }
  return { cases, roles };
}

async function selfTest(args) {
  const outerHost = args["outer-host"]; const token = args.token;
  if (!SAFE_TOKEN.test(token ?? "") || typeof outerHost !== "string" || !outerHost.startsWith("unix://") || args["owner-host"] !== undefined || args.base !== undefined || args["helper-image"] !== undefined) {
    refuse("self-test requires one private DIND owner and an explicit outer Unix endpoint");
  }
  const evidenceRoot = resolve(args.evidence);
  if (!isAbsolute(args.evidence ?? "") || existsSync(evidenceRoot)) refuse("self-test evidence output must be an absent absolute path");
  const repositoryRoot = resolve(process.cwd());
  const workspace = mkdtempSync(resolve(tmpdir(), `cwt-release-custody-${token}-`));
  mkdirSync(evidenceRoot, { recursive: false, mode: 0o700 });
  const resources = ownerResources(token);
  const plan = createOwnerControllerPlan({ token, outerHost, repositoryRoot });
  const clients = createDockerClients({ resources, outerHost, helperImage: OWNER_HELPER_REFERENCE, repositoryRoot, releaseRoot: repositoryRoot, workspace });
  const tag = `cwt.local/custody:${token}`;
  const archive = resolve(workspace, "base.tar");
  const project = `${token}-compose`;
  let ownerLoaded = false; let ownerCleanupRequired = false;
  let compose; let serverId; let serverNetworkName; let primaryError; let result;
  try {
    const configRoot = createSyntheticConfiguration(workspace, "0".repeat(40));
    const pinned = verifyPinnedOwnerImages(clients, workspace);
    const projectionPlan = createVolumeProjectionPlan({ resources, outerHost, configRoot, token });
    ownerCleanupRequired = true;
    createOwnerVolumes(clients, plan);
    populateOwnerVolumes(clients, projectionPlan);
    startOwnerController(clients, plan);
    const { ownerInfo, isolation } = await waitForOwnerReady(clients);
    const before = clients.owner(["image", "inspect", tag], { allowFailure: true });
    if (before.status === 0) refuse("self-test tag pre-exists in owner");
    clients.outer(["image", "save", "--output", archive, SELF_TEST_BASE_REFERENCE], { label: "non-CWT base archive" });
    clients.owner(["image", "load", "--input", archive], { label: "owner non-CWT image load" }); ownerLoaded = true;
    const baseInspection = ownerImageInspection(clients, SELF_TEST_BASE_REFERENCE);
    const baseDigest = baseInspection.Descriptor?.digest;
    if (!DIGEST.test(baseDigest ?? "")) refuse("self-test base digest is unavailable");
    clients.owner(["image", "tag", SELF_TEST_BASE_REFERENCE, tag], { label: "owner non-CWT tag" });
    const ownerTag = ownerImageInspection(clients, tag);
    const outerInvisible = clients.outer(["image", "inspect", tag], { allowFailure: true });
    if (outerInvisible.status === 0) refuse("outer endpoint can see isolated namespace tag");
    const outerDeletion = clients.outer(["image", "rm", tag], { allowFailure: true });
    if (outerDeletion.status === 0) refuse("outer endpoint deleted isolated namespace tag");
    ownerImageInspection(clients, tag);
    ownerImageInspection(clients, `alpine@${baseDigest}`);

    const storageProof = `/srv/cwt/staging/media/import/${token}.proof`;
    const shellPlan = createSelfTestShellPlan({ repositoryRoot, token, storageProof });
    clients.owner([
      "run", "--rm", "--pull", "never", "--network", "none", "--user", "10001:10001", "--log-driver", "journald",
      "--mount", "type=bind,source=/etc/cwt/.cwt-release-validation,target=/proof/config,readonly",
      "--mount", `type=bind,source=${repositoryRoot},target=${repositoryRoot},readonly`,
      "--mount", "type=bind,source=/srv/cwt/staging/media/import,target=/srv/cwt/staging/media/import",
      tag, ...shellPlan.namedVolumeProof,
    ], { label: "Named-volume config/storage/journal proof" });

    const composeFile = resolve(workspace, "self-test-compose.json");
    writeFileSync(composeFile, json(createSelfTestComposeDefinition({ image: tag, command: shellPlan.composeServer })), { mode: 0o444 });
    compose = createComposeClient({ clients, project, repositoryRoot, composeFile, environment: {} });
    serverNetworkName = `${project}_private`;
    compose(SELF_TEST_SERVER_READINESS_ARGS, { label: "Non-CWT inner Compose readiness" });
    serverId = compose(["ps", "--all", "--quiet", "server"], { label: "Non-CWT server identity" }).stdout.trim();
    if (!serverId) refuse("non-CWT Compose server is absent");
    const server = inspectContainer(clients, serverId);
    const network = JSON.parse(clients.owner(["network", "inspect", serverNetworkName], { label: "Non-CWT private network" }).stdout)[0];
    const serverState = validateSelfTestServerState({ server, network, networkName: serverNetworkName });
    const communication = clients.owner(["run", "--rm", "--pull", "never", "--network", serverNetworkName, tag, ...shellPlan.communication], { label: "Non-CWT inner communication" });
    if (communication.stdout !== "resolver=127.0.0.11\nresult=exact-token\n") refuse("non-CWT inner network communication result drifted");
    result = {
      schemaVersion: 1, status: "passed", ownerToken: token,
      owner: { serverVersion: ownerInfo.serverVersion, snapshotter: ownerInfo.snapshotter, ...isolation, pinned },
      base: { reference: SELF_TEST_BASE_REFERENCE, descriptorDigest: baseDigest, ownerImageId: ownerTag.Id },
      isolation: { outerInvisible: true, outerDeletionRefused: true, ownerRetainedAfterOuterAttempt: true },
      projection: { configVolume: true, storageVolume: true, journalVolume: true, configMode: "0444", storageOwner: "10001:10001", journalEmission: true, vmHostBinds: 0 },
      compose: { internalNetwork: true, containerLocalFixture: SELF_TEST_SERVER_ROOT, serverState, resolver: "127.0.0.11", boundedRetries: 10, innerCommunication: true },
    };
  } catch (error) { primaryError = error; }

  let diagnostics;
  try {
    diagnostics = await cleanupPreservingPrimary(primaryError, async () => {
      const failures = [];
      const attempt = (action) => { try { return action(); } catch (error) { failures.push(String(error?.message ?? error)); return undefined; } };
      let selfTestComposeDiagnostics;
      if (compose) selfTestComposeDiagnostics = finalizeSelfTestCompose({
        clients, compose, evidenceRoot, networkName: serverNetworkName ?? `${project}_private`, serverId, attempt,
      });
      if (ownerLoaded) attempt(() => {
        clients.owner(["image", "rm", tag, SELF_TEST_BASE_REFERENCE], { allowFailure: true }); ownerLoaded = false;
        if (clients.owner(["image", "inspect", tag], { allowFailure: true }).status === 0) throw new HarnessFailure("owner self-test tag survived cleanup");
      });
      let ownerDiagnostics;
      if (ownerCleanupRequired) ownerDiagnostics = attempt(() => cleanupOwnerInfrastructure(clients, evidenceRoot));
      attempt(() => removeExactSyntheticWorkspace(workspace));
      if (failures.length > 0) throw new HarnessFailure(`self-test cleanup failed: ${failures.join(" | ")}`);
      return { owner: ownerDiagnostics, selfTestCompose: selfTestComposeDiagnostics };
    });
  } catch (error) {
    const failure = { schemaVersion: 1, status: "blocked", message: String(error?.message ?? error).slice(0, 3000), cleanupFailure: error?.cleanupFailure ?? null };
    writeFileSync(resolve(evidenceRoot, "self-test-blocked.json"), json(failure), { flag: "wx", mode: 0o400 });
    throw error;
  }
  const outcome = { ...result, diagnostics: { ownerLogSha256: diagnostics.owner.logSha256, journalHelperLogSha256: diagnostics.owner.journalHelperLogSha256, ...diagnostics.selfTestCompose }, cleanup: { controller: 0, journalHelper: 0, volumes: 0, socket: 0, compose: 0, workspaceRemoved: true, ownerReferencesAbsent: true } };
  writeFileSync(resolve(evidenceRoot, "self-test.json"), json(outcome), { flag: "wx", mode: 0o400 });
  writeFileSync(resolve(evidenceRoot, "self-test.json.sha256"), `${sha256File(resolve(evidenceRoot, "self-test.json"))}  self-test.json\n`, { flag: "wx", mode: 0o400 });
  return outcome;
}

async function validateRelease(args) {
  const repositoryRoot = absoluteExisting(args.repository ?? process.cwd(), "repository", "directory");
  const releasePath = absoluteExisting(args.release, "release record");
  const ociRoot = absoluteExisting(args.oci, "OCI root", "directory");
  const evidenceRoot = resolve(args.evidence);
  if (!isAbsolute(args.evidence ?? "") || existsSync(evidenceRoot)) refuse("evidence output must be an absent absolute path");
  const outerHost = args["outer-host"]; const token = args.token;
  if (!SAFE_TOKEN.test(token ?? "") || typeof outerHost !== "string" || !outerHost.startsWith("unix://") || args["owner-host"] !== undefined || args["helper-image"] !== undefined) {
    refuse("validation requires one private DIND owner and an explicit outer Unix endpoint");
  }
  const releaseRoot = dirname(releasePath);
  const workspace = mkdtempSync(resolve(tmpdir(), `cwt-release-validation-${token}-`));
  mkdirSync(evidenceRoot, { recursive: false, mode: 0o700 });
  const resources = ownerResources(token);
  const plan = createOwnerControllerPlan({ token, outerHost, repositoryRoot });
  const clients = createDockerClients({ resources, outerHost, helperImage: OWNER_HELPER_REFERENCE, repositoryRoot, releaseRoot, workspace });
  const rootCompose = resolve(repositoryRoot, "compose.yaml");
  let gateOpen = false; let cleanupPhase = false; let imported = false; let dependencyImported = false; let ownerCleanupRequired = false;
  let qualified; let tag; let indexDigest; let releaseId; let nativeChild; let nativePlatform; let project;
  let outcome; let compose; let mutationComposeClient; let primaryError; let failureClassification;
  try {
    const verified = verifyReleaseRecord({ releasePath, ociRoot, requireState: "built" });
    releaseId = verified.record.releaseId; indexDigest = verified.inventory.indexDigest;
    const configRoot = createSyntheticConfiguration(workspace, releaseId);
    const pinned = verifyPinnedOwnerImages(clients, workspace);
    const projectionPlan = createVolumeProjectionPlan({ resources, outerHost, configRoot, token });
    ownerCleanupRequired = true;
    createOwnerVolumes(clients, plan);
    populateOwnerVolumes(clients, projectionPlan);
    startOwnerController(clients, plan);
    const { ownerInfo, isolation } = await waitForOwnerReady(clients);
    nativePlatform = `linux/${JSON.parse(clients.owner(["version", "--format", "{{json .Server.Arch}}"], { label: "owner platform" }).stdout)}`;
    const native = verified.inventory.children.find((child) => child.platform === nativePlatform);
    const nonNative = verified.inventory.children.find((child) => child.platform !== nativePlatform);
    if (!native || !nonNative) refuse("validation owner platform is outside the exact two-child release");
    nativeChild = native.manifestDigest; qualified = digestQualifiedReference("cwt.local/release", indexDigest); tag = `cwt.local/release:${releaseId}`;
    project = `cwt-${token}`;
    createValidationPlan({ ownerHost: resources.ownerHost, outerHost, releaseId, indexDigest, childDigest: nativeChild, project });
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
    clients.owner(["image", "load", "--input", dependencyArchive], { label: "owner dependency import" }); dependencyImported = true;
    const environment = composeEnvironment({ qualified, indexDigest, childDigest: nativeChild, repositoryRoot });
    compose = createComposeClient({ clients, project, repositoryRoot, composeFile: rootCompose, environment });
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
    mutationComposeClient = createComposeClient({ clients, project: mutationProject, repositoryRoot, composeFile: mutationCompose, environment });
    const mutated = JSON.parse(mutationComposeClient(["--profile", "production-ai", "config", "--format", "json", "--no-env-resolution", "--no-path-resolution"], { label: "mutated Compose normalization" }).stdout);
    assert.throws(() => validateComposeGraph(mutated, { projectName: mutationProject }), /tmpfs authority drifted|split tmpfs option fragment/u);

    gateOpen = true;
    await subjectOperation(() => compose(["up", "--detach", "--pull", "never", "--no-build", ...EXACT_SERVICES], { label: "authoritative root Compose up" }), "root Compose up failed");
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

    const direct = await runDirectMatrix({ clients, qualified, nativePlatform, nativeChild, nonNativePlatform: nonNative.platform, nonNativeChild: nonNative.manifestDigest, project, token });

    const negative = mutationComposeClient(["create", "--pull", "never", "valkey-staging"], { allowFailure: true });
    if (negative.status === 0 || !/invalid mount path|mount path must be absolute/u.test(`${negative.stderr}\n${negative.stdout}`)) subjectRefuse("split-tmpfs Compose mutation was not rejected");
    const negativeRunning = mutationComposeClient(["ps", "--status", "running", "--quiet"], { allowFailure: true }).stdout.trim();
    if (negativeRunning !== "") subjectRefuse("split-tmpfs mutation created a running container");
    mutationComposeClient(["down", "--remove-orphans"], { allowFailure: true });

    cleanupPhase = true;
    compose(["down", "--remove-orphans"], { label: "authoritative root Compose down" });
    if (compose(["ps", "--all", "--quiet"], { allowFailure: true }).stdout.trim() !== "") throw new HarnessFailure("Compose consumers remain after teardown");
    const remainingNetworks = clients.owner(["network", "ls", "--quiet", "--filter", `label=com.docker.compose.project=${project}`], { label: "owner zero-network proof" }).stdout.trim();
    if (remainingNetworks !== "") throw new HarnessFailure("Compose networks remain after teardown");
    clients.owner(["image", "rm", qualified, tag], { allowFailure: true }); imported = false;
    for (const reference of DEPENDENCY_REFERENCES) clients.owner(["image", "rm", reference], { allowFailure: true }); dependencyImported = false;
    if (clients.owner(["image", "inspect", qualified], { allowFailure: true }).status === 0 || clients.owner(["image", "inspect", tag], { allowFailure: true }).status === 0) {
      throw new HarnessFailure("release reference remains after owner-only cleanup");
    }
    const final = verifyReleaseRecord({ releasePath, ociRoot, requireState: "built" });
    if (final.state !== "built" || existsSync(resolve(releaseRoot, "transitions/001-staging-validated.json")) || existsSync(resolve(releaseRoot, "transitions/002-promotion-authorized.json"))) {
      throw new HarnessFailure("release lifecycle changed during validation");
    }
    outcome = {
      schemaVersion: 1, status: "passed", gateOpen: true, failureClass: null,
      release: { releaseId, indexDigest, qualifiedReference: qualified, nativePlatform, nativeChildDigest: nativeChild, nonNativePlatform: nonNative.platform, nonNativeChildDigest: nonNative.manifestDigest, releaseRecordSha256: sha256File(releasePath), finalState: "built", revoked: false, transitioned: false },
      owner: { ownerToken: token, serverVersion: ownerInfo.serverVersion, containerdSnapshotter: ownerInfo.snapshotter, ...isolation, pinned },
      rootCompose: { path: "compose.yaml", sha256: sha256File(rootCompose), positiveRuns: 1, files: ["compose.yaml"], overrides: 0, services: healthStates, networks: networkEvidence, exactTmpfs: "pass", hostnameAndLoopbackHealth: "pass", exactImageIdentity: "pass", publishedPorts: 0 },
      directRuntime: direct,
      mutation: { splitTmpfsRejected: true, composeCreateExitNonzero: true, zeroRunningContainers: true },
      isolation: { externalProviderCalls: 0, secretValuesRecorded: false, syntheticProtectedConfiguration: true },
      cleanup: { consumers: 0, networks: 0, ownerReleaseReferences: 0 },
    };
  } catch (error) {
    primaryError = error;
    failureClassification = classifyValidationFailure(error, { gateOpen, cleanup: cleanupPhase });
    if (failureClassification.revoke && releaseId && indexDigest) {
      run(process.execPath, [resolve(repositoryRoot, "deploy/scripts/preflight-image.mjs"), "revoke", "--release", releasePath, "--oci", ociRoot, "--index", indexDigest, "--reason", "post_emission_gate_failed"], { label: "immutable subject revocation" });
    }
  }

  let diagnostics;
  try {
    diagnostics = await cleanupPreservingPrimary(primaryError, async () => {
      cleanupPhase = true;
      const failures = [];
      const attempt = (action) => { try { return action(); } catch (error) { failures.push(String(error?.message ?? error)); return undefined; } };
      if (compose) attempt(() => compose(["down", "--remove-orphans"], { allowFailure: true }));
      if (mutationComposeClient) attempt(() => mutationComposeClient(["down", "--remove-orphans"], { allowFailure: true }));
      let zeroConsumers = true;
      if (compose) {
        attempt(() => { if (compose(["ps", "--all", "--quiet"], { allowFailure: true }).stdout.trim() !== "") { zeroConsumers = false; throw new HarnessFailure("Compose consumers remain during final cleanup"); } });
        attempt(() => { if (clients.owner(["network", "ls", "--quiet", "--filter", `label=com.docker.compose.project=${project}`], { allowFailure: true }).stdout.trim() !== "") { zeroConsumers = false; throw new HarnessFailure("Compose networks remain during final cleanup"); } });
      }
      if (zeroConsumers && imported && qualified && tag) attempt(() => { clients.owner(["image", "rm", qualified, tag], { allowFailure: true }); imported = false; });
      if (zeroConsumers && dependencyImported) attempt(() => { for (const reference of DEPENDENCY_REFERENCES) clients.owner(["image", "rm", reference], { allowFailure: true }); dependencyImported = false; });
      let captured;
      if (ownerCleanupRequired) captured = attempt(() => cleanupOwnerInfrastructure(clients, evidenceRoot));
      attempt(() => removeExactSyntheticWorkspace(workspace));
      if (failures.length > 0) throw new HarnessFailure(`release validator cleanup failed: ${failures.join(" | ")}`);
      return captured;
    });
  } catch (error) {
    const classification = failureClassification ?? classifyValidationFailure(error, { gateOpen, cleanup: true });
    const failure = { schemaVersion: 1, status: "blocked", gateOpen, ...classification, message: String(error?.message ?? "unknown").slice(0, 3000), cleanupFailure: error?.cleanupFailure ?? null };
    try { writeFileSync(resolve(evidenceRoot, "release-compose-validation-blocked.json"), json(failure), { flag: "wx", mode: 0o400 }); } catch {}
    throw error;
  }
  outcome.cleanup = { ...outcome.cleanup, controller: 0, journalHelper: 0, volumes: 0, socket: 0, namedVolumeStateRemoved: true, workspaceRemoved: true, ownerLogSha256: diagnostics.logSha256, journalHelperLogSha256: diagnostics.journalHelperLogSha256 };
  writeFileSync(resolve(evidenceRoot, "release-compose-validation.json"), json(outcome), { flag: "wx", mode: 0o400 });
  writeFileSync(resolve(evidenceRoot, "release-compose-validation.json.sha256"), `${sha256File(resolve(evidenceRoot, "release-compose-validation.json"))}  release-compose-validation.json\n`, { flag: "wx", mode: 0o400 });
  return outcome;
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
  SELF_TEST_COMMUNICATION_SCRIPT,
  SELF_TEST_SERVER_HEALTHCHECK,
  SELF_TEST_SERVER_READINESS_ARGS,
  captureSelfTestComposeDiagnostics,
  composeArgs,
  createSelfTestComposeDefinition,
  createSelfTestShellPlan,
  createSyntheticConfiguration,
  directAppArgs,
  finalizeSelfTestCompose,
  fixedShellArgs,
  removeExactSyntheticWorkspace,
  subjectFailure: (message = "subject") => new SubjectFailure(message),
});
