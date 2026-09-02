import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";

import { verifyReleaseRecord } from "./preflight-image.mjs";

const RELEASE = /^[0-9a-f]{40}$/u;
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const GITHUB_REPOSITORY = /^[a-z0-9](?:[a-z0-9-]{0,38})\/[a-z0-9](?:[a-z0-9._-]{0,99})$/u;
const RUNNER_NONCE = /^[0-9a-f]{32}$/u;
const OCI_INDEX_MEDIA_TYPE = "application/vnd.oci.image.index.v1+json";
const ORAS_IDENTITY = Object.freeze({
  version: "1.3.3",
  commit: "210747c29c1d38732b3194878dfd8b5a6b9ad7eb",
});

export class RegistryIntegrationFailure extends Error {
  constructor(code, message) {
    super(message);
    this.name = "RegistryIntegrationFailure";
    this.code = code;
  }
}

function refuse(code, message) {
  throw new RegistryIntegrationFailure(code, message);
}

function parseJson(value, code, message) {
  try {
    return JSON.parse(value);
  } catch {
    refuse(code, message);
  }
}

function exactExistingFile(path, kind) {
  if (!isAbsolute(path ?? "")) refuse("path_invalid", `${kind} path must be absolute.`);
  const exact = realpathSync(path);
  if (exact !== resolve(path) || !statSync(exact).isFile()) refuse("path_invalid", `${kind} path is invalid.`);
  return exact;
}

function exactExistingDirectory(path, kind) {
  if (!isAbsolute(path ?? "")) refuse("path_invalid", `${kind} path must be absolute.`);
  const exact = realpathSync(path);
  if (exact !== resolve(path) || !statSync(exact).isDirectory()) refuse("path_invalid", `${kind} path is invalid.`);
  return exact;
}

function exactNewDirectory(path, kind) {
  if (!isAbsolute(path ?? "") || existsSync(path)) refuse("path_invalid", `${kind} must be a new absolute path.`);
  const parent = realpathSync(dirname(path));
  const normalized = resolve(path);
  if (dirname(normalized) !== parent || normalized === parent || normalized.startsWith(`${parent}${sep}..${sep}`)) {
    refuse("path_invalid", `${kind} parent is invalid.`);
  }
  return normalized;
}

function exactRegistryConfig(path) {
  const exact = exactExistingFile(path, "Registry credential config");
  const stat = lstatSync(exact);
  if ((stat.mode & 0o077) !== 0) refuse("registry_credentials_permissions_invalid", "Registry credential config must not be group/world accessible.");
  return exact;
}

function commandEnvironment() {
  const environment = {
    PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
    HOME: process.env.HOME ?? "/nonexistent",
    LANG: "C",
    LC_ALL: "C",
    TZ: "UTC",
  };
  for (const name of ["SSL_CERT_FILE", "SSL_CERT_DIR"]) {
    if (process.env[name]) environment[name] = process.env[name];
  }
  return environment;
}

function run(binary, args, { allowFailure = false } = {}) {
  const result = spawnSync(binary, args, {
    encoding: "utf8",
    env: commandEnvironment(),
    maxBuffer: 32 * 1024 * 1024,
  });
  if (!allowFailure && (result.status !== 0 || result.error)) {
    refuse("registry_command_failed", "Registry command failed closed.");
  }
  return result;
}

export function canonicalGhcrRepository(githubRepository) {
  if (!GITHUB_REPOSITORY.test(githubRepository ?? "") || githubRepository !== githubRepository.toLowerCase()) {
    refuse("github_repository_invalid", "GitHub repository identity must be exact lowercase owner/name.");
  }
  return `ghcr.io/${githubRepository}`;
}

export function validateOrasIdentity(output) {
  if (typeof output !== "string" ||
    !new RegExp(`^Version:\\s+${ORAS_IDENTITY.version}$`, "mu").test(output) ||
    !new RegExp(`^Git commit:\\s+${ORAS_IDENTITY.commit}$`, "mu").test(output) ||
    !/^Git tree state:\s+clean$/mu.test(output)) {
    refuse("oras_identity_mismatch", "ORAS executable identity is not the pinned release.");
  }
  return ORAS_IDENTITY;
}

export function validateReleaseIdentity(record, { releaseId, indexDigest }) {
  if (!RELEASE.test(releaseId ?? "") || !DIGEST.test(indexDigest ?? "") ||
    record?.releaseId !== releaseId || record?.source?.commit !== releaseId || record?.oci?.indexDigest !== indexDigest ||
    record?.state !== "built") {
    refuse("release_identity_mismatch", "Release record does not match the exact immutable inputs.");
  }
  return true;
}

export function validateRegistryDescriptor(descriptor, indexDigest) {
  if (descriptor?.digest !== indexDigest || descriptor?.mediaType !== OCI_INDEX_MEDIA_TYPE ||
    !Number.isSafeInteger(descriptor?.size) || descriptor.size <= 0) {
    refuse("registry_digest_mismatch", "Registry descriptor does not preserve the exact OCI index.");
  }
  return true;
}

export function createRegistryCommandPlan({ orasPath, authFile, ociRoot, repository, releaseId, indexDigest, outputRoot }) {
  if (!isAbsolute(orasPath ?? "") || !isAbsolute(authFile ?? "") || !isAbsolute(ociRoot ?? "") ||
    !RELEASE.test(releaseId ?? "") || !DIGEST.test(indexDigest ?? "") || !/^ghcr\.io\/[a-z0-9][a-z0-9-]{0,38}\/[a-z0-9][a-z0-9._-]{0,99}$/u.test(repository ?? "")) {
    refuse("registry_plan_invalid", "Registry command plan inputs are invalid.");
  }
  const tagReference = `${repository}:${releaseId}`;
  const digestReference = `${repository}@${indexDigest}`;
  return Object.freeze({
    publish: Object.freeze(["cp", "--from-oci-layout", "--to-registry-config", authFile, "--no-tty", `${ociRoot}@${indexDigest}`, tagReference]),
    tagDescriptor: Object.freeze(["manifest", "fetch", "--descriptor", "--registry-config", authFile, tagReference]),
    digestDescriptor: Object.freeze(["manifest", "fetch", "--descriptor", "--registry-config", authFile, digestReference]),
    materialize: outputRoot ? Object.freeze(["cp", "--from-registry-config", authFile, "--to-oci-layout", "--no-tty", digestReference, `${outputRoot}:${releaseId}`]) : null,
    tagReference,
    digestReference,
  });
}

export function validateRuntimeRunnerBinding({ eventName, runAttempt, runnerEnvironment, runnerOs, runnerArch, runnerName, nonce }) {
  if (!RUNNER_NONCE.test(nonce ?? "")) refuse("runner_nonce_invalid", "Runtime Runner nonce must be 128-bit lowercase hex.");
  const expectedName = `cwt-tencent-sg-${nonce}`;
  if (eventName !== "workflow_dispatch" || runAttempt !== "1" || runnerEnvironment !== "self-hosted" ||
    runnerOs !== "Linux" || runnerArch !== "X64" || runnerName !== expectedName) {
    refuse("runner_binding_mismatch", "Runtime job is not bound to the selected single-use Tencent Singapore Runner identity.");
  }
  return Object.freeze({
    runnerName: expectedName,
    runnerLabel: `cwt-job-${nonce}`,
    selectedProvider: "tencent-cloud",
    selectedRegion: "ap-singapore",
    lifecycleContract: "single-use-ephemeral",
    actualProviderAndDestructionProven: false,
  });
}

function parseArguments(argv) {
  const command = argv[0];
  if (!["publish", "materialize", "verify-runner"].includes(command) || argv.length % 2 !== 1) {
    refuse("arguments_invalid", "Registry integration arguments are invalid.");
  }
  const values = {};
  const allowed = command === "verify-runner"
    ? new Set(["event", "attempt", "environment", "os", "arch", "name", "nonce"])
    : new Set(["oras", "auth", "release", "oci", "output", "github-repository", "release-id", "index-digest"]);
  for (let index = 1; index < argv.length; index += 2) {
    const key = argv[index]?.replace(/^--/u, "");
    const value = argv[index + 1];
    if (!allowed.has(key) || !value || values[key] !== undefined) refuse("arguments_invalid", "Registry integration arguments are invalid.");
    values[key] = value;
  }
  return { command, values };
}

function exactOras(path) {
  const binary = exactExistingFile(path, "ORAS executable");
  if ((statSync(binary).mode & 0o111) === 0) refuse("oras_not_executable", "ORAS executable is not executable.");
  validateOrasIdentity(run(binary, ["version"]).stdout);
  return binary;
}

function releaseRecord(path) {
  return parseJson(readFileSync(path, "utf8"), "release_record_invalid", "Release record is invalid.");
}

function verifiedRelease({ releasePath, ociRoot, releaseId, indexDigest }) {
  const result = verifyReleaseRecord({ releasePath, ociRoot, requireState: "built" });
  validateReleaseIdentity(result.record, { releaseId, indexDigest });
  if (result.inventory.indexDigest !== indexDigest) refuse("release_identity_mismatch", "OCI layout does not match the exact immutable input.");
  return result;
}

function provePrivate(binary, digestReference) {
  const temporary = mkdtempSync(join(tmpdir(), "cwt-ghcr-anonymous-"));
  try {
    const anonymousConfig = join(temporary, "config.json");
    writeFileSync(anonymousConfig, '{"auths":{}}\n', { flag: "wx", mode: 0o600 });
    chmodSync(anonymousConfig, 0o600);
    const result = run(binary, ["manifest", "fetch", "--descriptor", "--registry-config", anonymousConfig, digestReference], { allowFailure: true });
    if (result.status === 0 || !/(denied|unauthorized|authentication required)/iu.test(`${result.stderr ?? ""}${result.stdout ?? ""}`)) {
      refuse("ghcr_privacy_unproven", "GHCR subject did not prove authenticated-only access.");
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

function publish(values) {
  const orasPath = exactOras(values.oras);
  const authFile = exactRegistryConfig(values.auth);
  const releasePath = exactExistingFile(values.release, "Release record");
  const ociRoot = exactExistingDirectory(values.oci, "OCI layout");
  const repository = canonicalGhcrRepository(values["github-repository"]);
  verifiedRelease({ releasePath, ociRoot, releaseId: values["release-id"], indexDigest: values["index-digest"] });
  const plan = createRegistryCommandPlan({
    orasPath,
    authFile,
    ociRoot,
    repository,
    releaseId: values["release-id"],
    indexDigest: values["index-digest"],
  });
  run(orasPath, plan.publish);
  validateRegistryDescriptor(parseJson(run(orasPath, plan.tagDescriptor).stdout, "registry_descriptor_invalid", "Registry descriptor is invalid."), values["index-digest"]);
  validateRegistryDescriptor(parseJson(run(orasPath, plan.digestDescriptor).stdout, "registry_descriptor_invalid", "Registry descriptor is invalid."), values["index-digest"]);
  provePrivate(orasPath, plan.digestReference);
  return { status: "PASS", releaseId: values["release-id"], indexDigest: values["index-digest"], reference: plan.digestReference, mutableTagIsAuthority: false };
}

function materialize(values) {
  const orasPath = exactOras(values.oras);
  const authFile = exactRegistryConfig(values.auth);
  const releasePath = exactExistingFile(values.release, "Release record");
  const ociRoot = exactNewDirectory(values.output, "OCI evidence layout");
  const repository = canonicalGhcrRepository(values["github-repository"]);
  validateReleaseIdentity(releaseRecord(releasePath), { releaseId: values["release-id"], indexDigest: values["index-digest"] });
  const plan = createRegistryCommandPlan({
    orasPath,
    authFile,
    ociRoot,
    outputRoot: ociRoot,
    repository,
    releaseId: values["release-id"],
    indexDigest: values["index-digest"],
  });
  try {
    validateRegistryDescriptor(parseJson(run(orasPath, plan.digestDescriptor).stdout, "registry_descriptor_invalid", "Registry descriptor is invalid."), values["index-digest"]);
    run(orasPath, plan.materialize);
    verifiedRelease({ releasePath, ociRoot, releaseId: values["release-id"], indexDigest: values["index-digest"] });
  } catch (error) {
    if (existsSync(ociRoot)) rmSync(ociRoot, { recursive: true, force: true });
    throw error;
  }
  return { status: "PASS", releaseId: values["release-id"], indexDigest: values["index-digest"], reference: plan.digestReference, ociRoot };
}

function main(argv) {
  const { command, values } = parseArguments(argv);
  if (command === "verify-runner") {
    return { status: "PASS", ...validateRuntimeRunnerBinding({
      eventName: values.event,
      runAttempt: values.attempt,
      runnerEnvironment: values.environment,
      runnerOs: values.os,
      runnerArch: values.arch,
      runnerName: values.name,
      nonce: values.nonce,
    }) };
  }
  if (command === "publish") return publish(values);
  return materialize(values);
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  try {
    process.stdout.write(`${JSON.stringify(main(process.argv.slice(2)))}\n`);
  } catch (error) {
    const code = error instanceof RegistryIntegrationFailure ? error.code : "integration_not_pass";
    process.stderr.write(`${JSON.stringify({ status: "NOT_PASS", reasonCode: code })}\n`);
    process.exitCode = 1;
  }
}

export const __testOnly = Object.freeze({
  DIGEST,
  RELEASE,
  RUNNER_NONCE,
  OCI_INDEX_MEDIA_TYPE,
  ORAS_IDENTITY,
  parseArguments,
  sha256: (value) => createHash("sha256").update(value).digest("hex"),
});
