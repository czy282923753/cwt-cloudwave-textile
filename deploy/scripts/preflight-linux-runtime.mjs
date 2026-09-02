import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  chownSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { arch } from "node:os";
import { basename, dirname, isAbsolute, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { sha256File, verifyReleaseRecord } from "./preflight-image.mjs";
import { exactProtectedSecretFiles, validateComposeGraph } from "./preflight-compose-graph.mjs";

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const RELEASE = /^[0-9a-f]{40}$/u;
const SAFE_TOKEN = /^[a-z][a-z0-9-]{5,47}$/u;
const EXACT_SERVICES = Object.freeze(["postgres", "valkey-staging", "web-staging"]);
const CONFIG_ROOT = "/etc/cwt";
const STORAGE_ROOT = "/srv/cwt";
const LOCAL_DOCKER_HOST = "unix:///var/run/docker.sock";
const LOCAL_DOCKER_SOCKET = "/var/run/docker.sock";
const DEFAULT_PROFILE = resolve(dirname(fileURLToPath(import.meta.url)), "../runtime-validation/linux-amd64-compatibility.v1.json");
const REVOKED_SUBJECTS = Object.freeze([
  Object.freeze({
    releaseId: "fe6e5b057aa7054d42f02f76d31858d3f71be3a9",
    indexDigest: "sha256:0a2f4651c569db1eba3eab465c3092122c0d80b8fe7b81166e11be1b4293fc46",
  }),
  Object.freeze({
    releaseId: "e105d68d75032e9ba7eb86f4e8479cc09175c821",
    indexDigest: "sha256:57c95535939eef9376563799849ecf27027eea518709faa0705aef0c6a5119ad",
  }),
]);

class ValidationFailure extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ValidationFailure";
    this.code = code;
  }
}

function refuse(code, message) {
  throw new ValidationFailure(code, message);
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseJson(value, code, message) {
  try {
    return JSON.parse(value);
  } catch {
    refuse(code, message);
  }
}

function run(program, args, { cwd, env, input, label, allowFailure = false } = {}) {
  if (program === "docker" && env?.DOCKER_HOST !== LOCAL_DOCKER_HOST) {
    refuse("docker_endpoint_unbound", "Docker invocation is not bound to the standard local Unix socket.");
  }
  if (program === "docker" && args.some((value) => ["--context", "-c", "--host", "-H"].includes(value) ||
    value.startsWith("--context=") || value.startsWith("--host=") || /^-H./u.test(value))) {
    refuse("docker_endpoint_override_forbidden", "Docker CLI endpoint overrides are forbidden.");
  }
  const result = spawnSync(program, args, {
    cwd,
    env,
    input,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 300_000,
    killSignal: "SIGTERM",
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
  });
  if (result.error || result.status === null || (!allowFailure && result.status !== 0)) {
    refuse(`${label}_failed`, `${label} failed closed.`);
  }
  return result;
}

function readJson(path, code, message) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    refuse(code, message);
  }
}

function exactExistingPath(path, kind, code) {
  if (!isAbsolute(path ?? "")) refuse(code, `${kind} must use an absolute path.`);
  let absolute;
  try {
    absolute = realpathSync(path);
  } catch {
    refuse(code, `${kind} is unavailable.`);
  }
  const stat = lstatSync(absolute);
  if ((kind === "OCI root" || kind === "repository") ? !stat.isDirectory() : !stat.isFile()) {
    refuse(code, `${kind} has the wrong filesystem type.`);
  }
  return absolute;
}

export function parseDigestReference(value) {
  if (typeof value !== "string" || value.length > 512 || value.trim() !== value || value.includes("\\") || value.includes("//")) {
    refuse("image_reference_invalid", "Image input must be one exact OCI repository digest reference.");
  }
  const match = value.match(/^([a-z0-9]+(?:[._-][a-z0-9]+)*(?::[1-9][0-9]{0,4})?(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)+)@(sha256:[0-9a-f]{64})$/u);
  if (!match || !match[1] || !match[2]) {
    refuse("image_reference_invalid", "Image input must be one exact OCI repository digest reference.");
  }
  const repository = match[1];
  const registry = repository.split("/")[0];
  const port = Number(registry.match(/:([0-9]+)$/u)?.[1] ?? 0);
  if (port > 65535) refuse("image_reference_invalid", "Image input must be one exact OCI repository digest reference.");
  if ((!registry.includes(".") && !registry.includes(":")) || ["docker.io", "index.docker.io", "registry-1.docker.io"].includes(registry)) {
    refuse("private_registry_required", "The CWT subject must come from an approved private OCI Registry.");
  }
  return Object.freeze({ reference: value, registry, repository, indexDigest: match[2] });
}

function parseOsRelease(value) {
  const result = {};
  for (const line of value.split("\n")) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/u);
    if (!match) continue;
    const raw = match[2];
    result[match[1]] = raw.startsWith('"') && raw.endsWith('"')
      ? raw.slice(1, -1).replaceAll('\\"', '"')
      : raw;
  }
  return result;
}

export function decideCompatibility(profile, actual) {
  if (profile?.schemaVersion !== 1 || profile?.authority?.runnerClass !== "cwt-controlled-vm-backed-single-use-ephemeral" ||
    profile.authority.osId !== "ubuntu" || profile.authority.osVersion !== "24.04" ||
    profile.authority.architecture !== "amd64" || profile.authority.dockerMode !== "host-engine" ||
    profile.authority.dindAllowed !== false || profile.authority.sharedOrPersistentRunnerAllowed !== false ||
    !Array.isArray(profile.profiles) || profile.profiles.length === 0) {
    refuse("compatibility_profile_invalid", "Runtime compatibility profile is invalid.");
  }
  if (actual.osId !== profile.authority.osId || actual.osVersion !== profile.authority.osVersion ||
    actual.architecture !== profile.authority.architecture || actual.dockerMode !== profile.authority.dockerMode) {
    refuse("runner_identity_mismatch", "Runner OS, architecture, or Docker mode is not authoritative.");
  }
  const accepted = profile.profiles.find((candidate) => (
    candidate && typeof candidate.id === "string" &&
    candidate.dockerEngine === actual.dockerEngine && candidate.dockerCompose === actual.dockerCompose
  ));
  if (!accepted) refuse("compatibility_profile_mismatch", "Docker Engine and Compose do not match an accepted compatibility profile.");
  return Object.freeze({ profileId: accepted.id, ...actual });
}

export function createDockerEnvironment(environment, { dockerConfigPresent, localSocketIsUnix }) {
  const dockerConfig = environment.DOCKER_CONFIG;
  if (!isAbsolute(dockerConfig ?? "") || dockerConfigPresent !== true) {
    refuse("docker_credentials_unavailable", "Runtime Docker credential injection is unavailable.");
  }
  if (localSocketIsUnix !== true) {
    refuse("local_docker_socket_unavailable", "The standard local Docker Unix socket is unavailable.");
  }
  for (const name of Object.keys(environment)) {
    if ((name.startsWith("DOCKER_") && name !== "DOCKER_CONFIG") || name.startsWith("COMPOSE_")) {
      refuse("caller_docker_state_forbidden", "Caller Docker or Compose authority is forbidden.");
    }
  }
  return Object.freeze({
    PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    HOME: "/root",
    LANG: "C",
    LC_ALL: "C",
    TZ: "UTC",
    DOCKER_CONFIG: dockerConfig,
    DOCKER_HOST: LOCAL_DOCKER_HOST,
  });
}

function cleanDockerEnvironment() {
  const dockerConfig = process.env.DOCKER_CONFIG;
  let localSocketIsUnix = false;
  try {
    localSocketIsUnix = lstatSync(LOCAL_DOCKER_SOCKET).isSocket();
  } catch {}
  return createDockerEnvironment(process.env, {
    dockerConfigPresent: isAbsolute(dockerConfig ?? "") && existsSync(resolve(dockerConfig, "config.json")),
    localSocketIsUnix,
  });
}

export function validateNativeHostFacts({ uid, architecture, osRelease, processOneCgroup, dockerInfo }) {
  if (uid !== 0 || architecture !== "x64") refuse("native_host_required", "Formal validation must run as root on the native Runner VM host.");
  const os = parseOsRelease(osRelease);
  if (os.ID !== "ubuntu" || os.VERSION_ID !== "24.04") refuse("runner_os_mismatch", "Runner must be Ubuntu 24.04 LTS.");
  if (/docker|containerd|kubepods|libpod|lxc/iu.test(processOneCgroup) || dockerInfo?.OSType !== "linux" ||
    !["x86_64", "amd64"].includes(dockerInfo?.Architecture) || !isAbsolute(dockerInfo?.DockerRootDir ?? "") ||
    /dind/iu.test(dockerInfo.DockerRootDir)) {
    refuse("host_docker_required", "Formal validation requires a native host Docker Engine; DIND and containerized runners are forbidden.");
  }
  return Object.freeze({ osId: os.ID, osVersion: os.VERSION_ID, architecture: "amd64", dockerMode: "host-engine" });
}

function captureRunner(profilePath, dockerEnv) {
  if (existsSync("/.dockerenv") || existsSync("/run/.containerenv")) {
    refuse("containerized_runner_forbidden", "DIND and containerized validation runners are forbidden.");
  }
  const dockerInfo = parseJson(run("docker", ["info", "--format", "{{json .}}"], {
    env: dockerEnv,
    label: "docker_info",
  }).stdout, "docker_info_invalid", "Docker Engine identity is invalid.");
  const native = validateNativeHostFacts({
    uid: typeof process.getuid === "function" ? process.getuid() : -1,
    architecture: arch(),
    osRelease: readFileSync("/etc/os-release", "utf8"),
    processOneCgroup: readFileSync("/proc/1/cgroup", "utf8"),
    dockerInfo,
  });
  const dockerEngine = run("docker", ["version", "--format", "{{.Server.Version}}"], {
    env: dockerEnv,
    label: "docker_version",
  }).stdout.trim().replace(/^v/u, "");
  const dockerCompose = run("docker", ["compose", "version", "--short"], {
    env: dockerEnv,
    label: "compose_version",
  }).stdout.trim().replace(/^v/u, "");
  const profile = readJson(profilePath, "compatibility_profile_invalid", "Runtime compatibility profile is unreadable.");
  return decideCompatibility(profile, { ...native, dockerEngine, dockerCompose });
}

function writeSecret(path, value) {
  writeFileSync(path, `${value}\n`, { flag: "wx", mode: 0o444 });
  chownSync(path, 0, 0);
  chmodSync(path, 0o444);
}

function secureRootDirectory(path) {
  mkdirSync(path, { mode: 0o700 });
  chownSync(path, 0, 0);
  chmodSync(path, 0o700);
}

export function unixModeAllowsRead({ mode, ownerUid, ownerGid, uid, gids = [] }) {
  if (!Number.isInteger(mode) || !Number.isInteger(ownerUid) || !Number.isInteger(ownerGid) || !Number.isInteger(uid) ||
    !Array.isArray(gids) || gids.some((gid) => !Number.isInteger(gid))) {
    refuse("unix_mode_input_invalid", "Unix file-mode input is invalid.");
  }
  if (uid === 0) return true;
  if (uid === ownerUid) return (mode & 0o400) !== 0;
  if (gids.includes(ownerGid)) return (mode & 0o040) !== 0;
  return (mode & 0o004) !== 0;
}

function secret(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

function runtimeEnvironment(environment, releaseId) {
  const production = environment === "production";
  return Object.freeze({
    APP_ENV: environment,
    NEXT_PUBLIC_SITE_URL: production ? "https://cwtextile.com" : "https://staging.cwtextile.com",
    NON_PRODUCTION_NOINDEX: production ? "false" : "true",
    DATABASE_DRIVER: "postgres",
    DATABASE_URL: "",
    DATABASE_POOL_MAX: production ? "6" : "2",
    AUTH_SESSION_SECRET: "",
    STORAGE_DRIVER: "local",
    PUBLIC_STORAGE_ROOT: `/srv/cwt/${environment}/media/public`,
    PRIVATE_STORAGE_ROOT: `/srv/cwt/${environment}/media/private-inquiries`,
    IMPORT_STORAGE_ROOT: `/srv/cwt/${environment}/media/import`,
    TRUSTED_PROXY_MODE: "cloudflare",
    FILE_SCAN_DRIVER: "cloudmersive",
    FILE_SCAN_ORIGIN: "https://scanner.synthetic.invalid",
    FILE_SCAN_API_KEY: "",
    FILE_SCAN_ACCOUNT_CUSTODY: `${environment}:synthetic-local-only`,
    SHARED_RATE_LIMIT_DRIVER: "valkey",
    VALKEY_ENDPOINT: `redis://valkey-${environment}:6379`,
    VALKEY_USERNAME: `cwt-${environment}`,
    VALKEY_PASSWORD: "",
    RATE_LIMIT_KEY_PREFIX: `cwt:${environment}:rate:`,
    EMAIL_DRIVER: "smtp",
    EMAIL_FROM: "synthetic@invalid.example",
    INQUIRY_NOTIFICATION_TO: "synthetic@invalid.example",
    SMTP_HOST: "mail.synthetic.invalid",
    SMTP_USER: "synthetic@invalid.example",
    SMTP_PASSWORD: "",
    INQUIRY_FILE_RETENTION_DAYS: "30",
    CUSTOMER_DATA_RETENTION_DAYS: "365",
    AUDIT_LOG_RETENTION_DAYS: "365",
    MONITORING_DRIVER: "external",
    SENTRY_DSN: "",
    AI_PROVIDER_API_KEY: "",
    COS_ACCESS_KEY_ID: "",
    COS_SECRET_ACCESS_KEY: "",
    BACKUP_REPOSITORY_PASSWORD: "",
    ANALYTICS_DRIVER: "disabled",
    FEATURE_REFINE_ADMIN: "false",
    FEATURE_SOURCE_DECLARATION: "false",
    FEATURE_AI: "false",
    FEATURE_SEO_ASSISTANT: "false",
    FEATURE_PRODUCT_IMPORT: "false",
    CWT_RELEASE_ID: releaseId,
  });
}

export function syntheticHostPlan(releaseId, { configRoot = CONFIG_ROOT, storageRoot = STORAGE_ROOT } = {}) {
  if (!RELEASE.test(releaseId ?? "") || !isAbsolute(configRoot) || !isAbsolute(storageRoot)) {
    refuse("synthetic_host_plan_invalid", "Synthetic host plan is invalid.");
  }
  const configFiles = [
    "postgres/bootstrap-password",
    ...["production", "staging"].flatMap((environment) => [
      `${environment}/runtime.env`,
      `${environment}/database-password`,
      ...exactProtectedSecretFiles.map((requirement) => `${environment}/${requirement.subjectSuffix}`),
    ]),
  ];
  return Object.freeze({
    configRoot,
    storageRoot,
    configDirectoryMode: 0o700,
    secretFileMode: 0o444,
    runtimeEnvMode: 0o400,
    ownerUid: 0,
    ownerGid: 0,
    configFiles: Object.freeze([...new Set(configFiles)].sort()),
    stagingStorage: Object.freeze([
      `${storageRoot}/staging/media/public`,
      `${storageRoot}/staging/media/private-inquiries`,
      `${storageRoot}/staging/media/import`,
    ]),
    postgresStorage: `${storageRoot}/postgresql/data`,
  });
}

function prepareSyntheticHost(releaseId) {
  const plan = syntheticHostPlan(releaseId);
  if (existsSync(plan.configRoot) || existsSync(plan.storageRoot)) {
    refuse("runner_not_single_use_clean", "Runner contains pre-existing CWT configuration or storage state.");
  }
  try {
    secureRootDirectory(plan.configRoot);
    secureRootDirectory(resolve(plan.configRoot, "postgres"));
    mkdirSync(plan.storageRoot, { mode: 0o700 });
    writeSecret(resolve(plan.configRoot, "postgres/bootstrap-password"), secret());
    for (const environment of ["production", "staging"]) {
      const root = resolve(plan.configRoot, environment);
      secureRootDirectory(root);
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
      for (const [name, value] of Object.entries(values)) writeSecret(resolve(root, name), value);
      const runtime = runtimeEnvironment(environment, releaseId);
      writeFileSync(resolve(root, "runtime.env"), `${Object.entries(runtime).map(([key, value]) => `${key}=${value}`).join("\n")}\n`, {
        flag: "wx",
        mode: 0o400,
      });
      chownSync(resolve(root, "runtime.env"), 0, 0);
      chmodSync(resolve(root, "runtime.env"), 0o400);
    }
    for (const path of plan.stagingStorage) {
      mkdirSync(path, { recursive: true, mode: 0o700 });
      chownSync(path, 10001, 10001);
    }
    mkdirSync(plan.postgresStorage, { recursive: true, mode: 0o700 });
    chownSync(resolve(plan.storageRoot, "postgresql"), 999, 999);
    chownSync(plan.postgresStorage, 999, 999);
    return plan;
  } catch {
    rmSync(plan.configRoot, { recursive: true, force: true });
    rmSync(plan.storageRoot, { recursive: true, force: true });
    refuse("synthetic_host_setup_failed", "Synthetic host configuration failed closed.");
  }
}

function composeBase(repositoryRoot, project) {
  return [
    "compose",
    "--project-name", project,
    "--project-directory", repositoryRoot,
    "--file", resolve(repositoryRoot, "compose.yaml"),
    "--profile", "staging",
  ];
}

export function createRuntimeCommandPlan({ repositoryRoot, project, imageReference }) {
  if (!isAbsolute(repositoryRoot ?? "") || !SAFE_TOKEN.test(project?.replace(/^cwt-/u, "") ?? "")) {
    refuse("runtime_plan_invalid", "Runtime command plan is invalid.");
  }
  parseDigestReference(imageReference);
  const base = composeBase(repositoryRoot, project);
  return Object.freeze({
    normalize: Object.freeze([...base, "--profile", "production-ai", "config", "--format", "json", "--no-env-resolution", "--no-path-resolution"]),
    infrastructureUp: Object.freeze([...base, "up", "--detach", "--wait", "--wait-timeout", "180", "--no-deps", "--pull", "never", "--no-build", "postgres", "valkey-staging"]),
    migrate: Object.freeze([...base, "run", "--rm", "--no-deps", "--pull", "never", "--volume", `${resolve(repositoryRoot, "drizzle")}:/app/drizzle:ro`, "web-staging", "node", "--import=tsx", "/app/scripts/migrate.ts"]),
    webUp: Object.freeze([...base, "up", "--detach", "--wait", "--wait-timeout", "180", "--no-deps", "--pull", "never", "--no-build", "web-staging"]),
    down: Object.freeze([...base, "down", "--remove-orphans", "--timeout", "30"]),
  });
}

function composeEnvironment(base, reference, childDigest, repositoryRoot) {
  return {
    ...base,
    CWT_IMAGE_REFERENCE: reference.reference,
    CWT_IMAGE_INDEX_DIGEST: reference.indexDigest,
    CWT_IMAGE_CHILD_DIGEST: childDigest,
    CWT_CLOUDFLARE_RANGES_FILE: resolve(repositoryRoot, "deploy/proxy/cloudflare-ranges.lab.conf"),
  };
}

function parseInspection(value, code, message) {
  const parsed = parseJson(value, code, message);
  if (!Array.isArray(parsed) || parsed.length !== 1) refuse(code, message);
  return parsed[0];
}

export function validatePulledImageIdentity({ reference, releaseId, childDigest, neutralInspection, platformInspection }) {
  const parsed = parseDigestReference(reference);
  if (!RELEASE.test(releaseId ?? "") || !DIGEST.test(childDigest ?? "") ||
    neutralInspection?.Descriptor?.digest !== parsed.indexDigest || !neutralInspection?.RepoDigests?.includes(parsed.reference) ||
    platformInspection?.Descriptor?.digest !== childDigest || platformInspection?.Os !== "linux" || platformInspection?.Architecture !== "amd64" ||
    platformInspection?.Config?.User !== "10001:10001" ||
    platformInspection?.Config?.Labels?.["org.opencontainers.image.revision"] !== releaseId) {
    refuse("pulled_image_identity_mismatch", "Pulled image does not match the exact release/index/linux-amd64 child authority.");
  }
  return true;
}

function inspectImage(reference, platform, dockerEnv) {
  const args = ["image", "inspect"];
  if (platform) args.push("--platform", platform);
  args.push(reference);
  return parseInspection(run("docker", args, { env: dockerEnv, label: "image_inspection" }).stdout,
    "image_inspection_invalid", "Pulled image inspection is invalid.");
}

function verifyBundle(reference, dockerEnv) {
  run("docker", [
    "run", "--rm", "--pull", "never", "--platform", "linux/amd64", "--network", "none",
    "--read-only", "--user", "10001:10001", "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true",
    "--env", "CWT_BUILD_DIR=/app/.next/standalone/.next", "--entrypoint", "node", reference,
    "/app/scripts/check-public-bundle.mjs",
  ], { env: dockerEnv, label: "bundle_authority" });
}

function validateContainerRuntime({ inspections, indexDigest, childDigest, releaseId }) {
  if (JSON.stringify(Object.keys(inspections).sort()) !== JSON.stringify([...EXACT_SERVICES].sort())) {
    refuse("runtime_service_set_mismatch", "Runtime service set is not the exact three-service authority.");
  }
  for (const [service, value] of Object.entries(inspections)) {
    if (value?.State?.Status !== "running" || value?.State?.Health?.Status !== "healthy" ||
      Object.keys(value?.HostConfig?.PortBindings ?? {}).length !== 0 || (value?.NetworkSettings?.Ports &&
        Object.values(value.NetworkSettings.Ports).some((bindings) => Array.isArray(bindings) && bindings.length > 0))) {
      refuse("runtime_health_or_port_mismatch", "A runtime service is unhealthy or publishes an unintended port.");
    }
    if (["postgres", "valkey-staging"].includes(service) &&
      (value.Config?.User !== "999:999" || value.HostConfig?.ReadonlyRootfs !== true ||
        !value.HostConfig?.CapDrop?.includes("ALL") || !value.HostConfig?.SecurityOpt?.includes("no-new-privileges:true"))) {
      refuse("infrastructure_runtime_boundary_mismatch", "Infrastructure runtime privilege or read-only boundary drifted.");
    }
    if (service === "web-staging") {
      const requiredSecrets = exactProtectedSecretFiles.map((entry) => ({
        source: `${CONFIG_ROOT}/staging/${entry.subjectSuffix}`,
        destination: `/run/secrets/staging-${entry.subjectSuffix}`,
      }));
      const mounts = value.Mounts ?? [];
      const secretClosure = requiredSecrets.every((expected) => mounts.some((mount) => (
        mount.Source === expected.source && mount.Destination === expected.destination && mount.RW === false
      )));
      const storageClosure = ["public", "private-inquiries", "import"].every((name) => mounts.some((mount) => (
        mount.Source === `${STORAGE_ROOT}/staging/media/${name}` && mount.Destination === `${STORAGE_ROOT}/staging/media/${name}` && mount.RW === true
      )));
      const environment = new Set(value.Config?.Env ?? []);
      if (value.Config?.User !== "10001:10001" || value.HostConfig?.ReadonlyRootfs !== true ||
        !value.HostConfig?.CapDrop?.includes("ALL") || !value.HostConfig?.SecurityOpt?.includes("no-new-privileges:true") ||
        value.Config?.Labels?.["cwt.release.index"] !== indexDigest || value.Config?.Labels?.["cwt.release.child"] !== childDigest ||
        !environment.has("APP_ENV=staging") || !environment.has("NON_PRODUCTION_NOINDEX=true") || !environment.has(`CWT_RELEASE_ID=${releaseId}`) ||
        !secretClosure || !storageClosure) {
        refuse("web_runtime_boundary_mismatch", "Web runtime privilege, image, environment, secret, or storage boundary drifted.");
      }
    }
  }
  return true;
}

function probeApplication(compose, dockerEnv) {
  const source = [
    "const checks = {};",
    "for (const [name,path] of Object.entries({live:'/api/health/live/',ready:'/api/health/ready/',root:'/'})) {",
    " const response = await fetch(`http://127.0.0.1:3000${path}`,{cache:'no-store',signal:AbortSignal.timeout(5000)});",
    " checks[name] = {status:response.status,robots:response.headers.get('x-robots-tag') ?? ''};",
    " if (name === 'root') { const body=await response.text(); checks.root.metaNoindex=/<meta[^>]+name=[\"']robots[\"'][^>]+content=[\"'][^\"']*noindex/iu.test(body); }",
    "}",
    "process.stdout.write(JSON.stringify(checks));",
  ].join("\n");
  const result = run("docker", [...compose, "exec", "-T", "web-staging", "node", "--input-type=module", "--eval", source], {
    env: dockerEnv,
    label: "application_probe",
  });
  const checks = parseJson(result.stdout, "application_probe_invalid", "Application probe output is invalid.");
  if (checks?.live?.status !== 200 || checks?.ready?.status !== 200 || checks?.root?.status !== 200 ||
    !String(checks.root.robots).toLowerCase().includes("noindex") || checks.root.metaNoindex !== true) {
    refuse("application_probe_not_pass", "Application live, readiness, root smoke, or noindex check did not pass.");
  }
  return Object.freeze({ live: 200, readiness: 200, root: 200, noindex: true });
}

function containerForService(compose, service, dockerEnv) {
  const id = run("docker", [...compose, "ps", "--all", "--quiet", service], {
    env: dockerEnv,
    label: "compose_service_lookup",
  }).stdout.trim();
  if (!/^[0-9a-f]{12,64}$/u.test(id)) refuse("compose_service_missing", "A required Compose service is absent.");
  return parseInspection(run("docker", ["inspect", id], { env: dockerEnv, label: "container_inspection" }).stdout,
    "container_inspection_invalid", "Container inspection is invalid.");
}

function validateProjectServiceSet(compose, dockerEnv) {
  const rows = parseJson(run("docker", [...compose, "ps", "--all", "--format", "json"], {
    env: dockerEnv,
    label: "compose_project_inventory",
  }).stdout, "compose_project_inventory_invalid", "Compose project inventory is invalid.");
  const normalized = Array.isArray(rows) ? rows : [rows];
  const services = normalized.map((entry) => entry?.Service).sort();
  if (JSON.stringify(services) !== JSON.stringify([...EXACT_SERVICES].sort())) {
    refuse("runtime_service_set_mismatch", "Runtime project is not the exact three-service authority.");
  }
}

function verifyRepositoryIdentity(repositoryRoot, releaseId, dockerEnv) {
  const head = run("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, env: dockerEnv, label: "source_identity" }).stdout.trim();
  const status = run("git", ["status", "--porcelain=v1"], { cwd: repositoryRoot, env: dockerEnv, label: "source_cleanliness" }).stdout;
  if (head !== releaseId || status !== "") refuse("source_identity_mismatch", "Runner checkout must be the clean exact release source identity.");
}

function ensureNotHistorical(record, indexDigest) {
  if (REVOKED_SUBJECTS.some((subject) => subject.releaseId === record.releaseId || subject.indexDigest === indexDigest)) {
    refuse("historical_subject_revoked", "A permanently revoked historical subject cannot enter validation.");
  }
}

function parseArguments(argv) {
  if (argv[0] !== "validate" || argv.length % 2 !== 1) refuse("arguments_invalid", "Validation arguments are invalid.");
  const values = {};
  const allowed = new Set(["release", "oci", "image", "evidence", "token", "repository"]);
  for (let index = 1; index < argv.length; index += 2) {
    const key = argv[index]?.replace(/^--/u, "");
    const value = argv[index + 1];
    if (!key || !allowed.has(key) || values[key] !== undefined || value === undefined) {
      refuse("arguments_invalid", "Validation arguments are invalid.");
    }
    values[key] = value;
  }
  for (const required of ["release", "oci", "image", "evidence", "token"]) {
    if (!values[required]) refuse("arguments_invalid", "Validation arguments are invalid.");
  }
  return values;
}

function prepareEvidence(path, repositoryRoot) {
  if (!isAbsolute(path ?? "") || existsSync(path) || path === "/" || path === CONFIG_ROOT || path === STORAGE_ROOT) {
    refuse("evidence_path_invalid", "Evidence output must be one absent absolute directory.");
  }
  const absolute = resolve(path);
  if (absolute === repositoryRoot || absolute.startsWith(`${repositoryRoot}${sep}`)) {
    refuse("evidence_path_invalid", "Evidence output must remain outside the source repository.");
  }
  mkdirSync(path, { mode: 0o700 });
  return absolute;
}

function writeOutcome(evidenceRoot, outcome) {
  const path = resolve(evidenceRoot, "linux-runtime-validation.json");
  writeFileSync(path, stableJson(outcome), { flag: "wx", mode: 0o400 });
  const sidecar = resolve(evidenceRoot, "linux-runtime-validation.json.sha256");
  writeFileSync(sidecar, `${sha256File(path)}  linux-runtime-validation.json\n`, { flag: "wx", mode: 0o400 });
}

async function validate(args) {
  const repositoryRoot = exactExistingPath(args.repository ?? process.cwd(), "repository", "repository_invalid");
  const releasePath = exactExistingPath(args.release, "release record", "release_record_invalid");
  const ociRoot = exactExistingPath(args.oci, "OCI root", "oci_evidence_invalid");
  const profilePath = exactExistingPath(DEFAULT_PROFILE, "compatibility profile", "compatibility_profile_invalid");
  const trackedProfilePath = realpathSync(resolve(repositoryRoot, "deploy/runtime-validation/linux-amd64-compatibility.v1.json"));
  if (profilePath !== trackedProfilePath) refuse("compatibility_profile_untracked", "Compatibility profile must come from the exact release checkout.");
  const reference = parseDigestReference(args.image);
  if (!SAFE_TOKEN.test(args.token ?? "")) refuse("token_invalid", "Run token is invalid.");
  const evidenceRoot = prepareEvidence(args.evidence, repositoryRoot);
  const project = `cwt-${args.token}`;
  const plan = createRuntimeCommandPlan({ repositoryRoot, project, imageReference: reference.reference });
  let dockerEnv;
  let runner;
  let release;
  let child;
  let hostPlan;
  let composeEnv;
  let mainFailure;
  let application;
  let topology;
  let bundlePassed = false;
  let pulled = [];
  let composeAttempted = false;
  const cleanup = { composeConsumers: false, composeNetworks: false, pulledReferences: false, hostPaths: false, runnerDestruction: "enclosing-ci-lifecycle" };
  try {
    dockerEnv = cleanDockerEnvironment();
    try {
      release = verifyReleaseRecord({ releasePath, ociRoot, requireState: "built" });
    } catch {
      refuse("image_evidence_not_pass", "Existing preflight-image authority did not accept the release evidence.");
    }
    if (release.state !== "built" || release.inventory.indexDigest !== reference.indexDigest) {
      refuse("release_index_or_state_mismatch", "Release evidence is not the exact built Registry subject.");
    }
    ensureNotHistorical(release.record, release.inventory.indexDigest);
    child = release.inventory.children.find((candidate) => candidate.platform === "linux/amd64");
    if (!child) refuse("linux_amd64_child_missing", "Release evidence has no exact linux/amd64 child.");
    verifyRepositoryIdentity(repositoryRoot, release.record.releaseId, dockerEnv);
    runner = captureRunner(profilePath, dockerEnv);
    hostPlan = prepareSyntheticHost(release.record.releaseId);
    composeEnv = composeEnvironment(dockerEnv, reference, child.manifestDigest, repositoryRoot);
    const normalized = parseJson(run("docker", plan.normalize, {
      cwd: repositoryRoot,
      env: composeEnv,
      label: "compose_normalization",
    }).stdout, "compose_normalization_invalid", "Compose normalization is invalid.");
    topology = validateComposeGraph(normalized, { projectName: project });
    const dependencyReferences = [normalized.services?.postgres?.image, normalized.services?.["valkey-staging"]?.image];
    if (dependencyReferences.some((value) => typeof value !== "string" || !value.includes("@sha256:"))) {
      refuse("dependency_digest_boundary_mismatch", "Runtime dependency image authority is not digest-qualified.");
    }
    run("docker", ["pull", "--platform", "linux/amd64", reference.reference], { env: dockerEnv, label: "exact_digest_pull" });
    pulled.push(reference.reference);
    for (const dependency of dependencyReferences) {
      run("docker", ["pull", "--platform", "linux/amd64", dependency], { env: dockerEnv, label: "dependency_digest_pull" });
      pulled.push(dependency);
    }
    const neutralInspection = inspectImage(reference.reference, undefined, dockerEnv);
    const platformInspection = inspectImage(reference.reference, "linux/amd64", dockerEnv);
    validatePulledImageIdentity({
      reference: reference.reference,
      releaseId: release.record.releaseId,
      childDigest: child.manifestDigest,
      neutralInspection,
      platformInspection,
    });
    verifyBundle(reference.reference, dockerEnv);
    bundlePassed = true;
    composeAttempted = true;
    run("docker", plan.infrastructureUp, { cwd: repositoryRoot, env: composeEnv, label: "compose_infrastructure_up" });
    run("docker", plan.migrate, { cwd: repositoryRoot, env: composeEnv, label: "synthetic_database_migration" });
    run("docker", plan.webUp, { cwd: repositoryRoot, env: composeEnv, label: "compose_web_up" });
    validateProjectServiceSet(composeBase(repositoryRoot, project), composeEnv);
    const inspections = Object.fromEntries(EXACT_SERVICES.map((service) => [service, containerForService(composeBase(repositoryRoot, project), service, composeEnv)]));
    validateContainerRuntime({
      inspections,
      indexDigest: reference.indexDigest,
      childDigest: child.manifestDigest,
      releaseId: release.record.releaseId,
    });
    application = probeApplication(composeBase(repositoryRoot, project), composeEnv);
  } catch (error) {
    mainFailure = error instanceof ValidationFailure
      ? error
      : new ValidationFailure("internal_error", "Internal validation failure was represented fail-closed.");
  }

  const cleanupFailures = [];
  const attempt = (action) => {
    try {
      action();
      return true;
    } catch {
      cleanupFailures.push(true);
      return false;
    }
  };
  if (composeAttempted && dockerEnv) {
    attempt(() => run("docker", plan.down, { cwd: repositoryRoot, env: composeEnv, label: "compose_teardown" }));
    cleanup.composeConsumers = attempt(() => {
      const remaining = run("docker", [...composeBase(repositoryRoot, project), "ps", "--all", "--quiet"], {
        cwd: repositoryRoot,
        env: composeEnv,
        label: "compose_consumer_cleanup",
      }).stdout.trim();
      if (remaining !== "") refuse("compose_consumer_residue", "Compose consumer residue remains.");
    });
    cleanup.composeNetworks = attempt(() => {
      const remaining = run("docker", ["network", "ls", "--quiet", "--filter", `label=com.docker.compose.project=${project}`], {
        env: dockerEnv,
        label: "compose_network_cleanup",
      }).stdout.trim();
      if (remaining !== "") refuse("compose_network_residue", "Compose network residue remains.");
    });
  } else {
    cleanup.composeConsumers = true;
    cleanup.composeNetworks = true;
  }
  if (dockerEnv && cleanup.composeConsumers && cleanup.composeNetworks) {
    cleanup.pulledReferences = attempt(() => {
      for (const image of [...new Set(pulled)].reverse()) {
        run("docker", ["image", "rm", image], { env: dockerEnv, label: "image_cleanup", allowFailure: true });
      }
      for (const image of pulled) {
        const inspection = run("docker", ["image", "inspect", image], { env: dockerEnv, label: "image_absence", allowFailure: true });
        if (inspection.status === 0) refuse("image_residue", "Pulled image residue remains.");
      }
    });
  } else cleanup.pulledReferences = pulled.length === 0;
  if (hostPlan && cleanup.composeConsumers) {
    cleanup.hostPaths = attempt(() => {
      rmSync(hostPlan.configRoot, { recursive: true, force: false });
      rmSync(hostPlan.storageRoot, { recursive: true, force: false });
      if (existsSync(hostPlan.configRoot) || existsSync(hostPlan.storageRoot)) refuse("host_path_residue", "Synthetic host path residue remains.");
    });
  } else cleanup.hostPaths = hostPlan === undefined;

  if (!mainFailure && cleanupFailures.length > 0) {
    mainFailure = new ValidationFailure("teardown_not_pass", "Bounded teardown did not pass.");
  }
  const status = mainFailure ? "NOT_PASS" : "PASS";
  const outcome = {
    schemaVersion: 1,
    status,
    reasonCode: mainFailure?.code ?? null,
    runner: runner ? {
      runnerClass: "cwt-controlled-vm-backed-single-use-ephemeral",
      profileId: runner.profileId,
      os: `${runner.osId}-${runner.osVersion}`,
      architecture: runner.architecture,
      dockerEngine: runner.dockerEngine,
      dockerCompose: runner.dockerCompose,
      dockerMode: runner.dockerMode,
      dind: false,
    } : null,
    release: release && child ? {
      releaseId: release.record.releaseId,
      registry: reference.registry,
      repository: reference.repository,
      indexDigest: reference.indexDigest,
      selectedPlatform: "linux/amd64",
      selectedChildDigest: child.manifestDigest,
      releaseRecordSha256: sha256File(releasePath),
      lifecycleState: release.state,
    } : null,
    authorities: {
      imageEvidence: release ? "preflight-image" : "NOT_PASS",
      composeTopology: topology ? "preflight-compose-graph" : "NOT_PASS",
      bundleBoundary: bundlePassed ? "check-public-bundle" : "NOT_PASS",
      runtimeBehavior: status,
    },
    runtime: application ? { services: EXACT_SERVICES, ...application, publishedPorts: 0, nonRootReadOnlyWeb: true, realShapedSecretsAndStorage: true } : null,
    cleanup,
    security: { credentialValuesRecorded: false, syntheticDataOnly: true, automaticRetry: false, automaticRevocation: false },
    claimCeiling: "implementation-path runtime evidence only; Runner provisioning/destruction, Provider, Registry custody, Build Once, promotion and protected environments require separate authority",
  };
  writeOutcome(evidenceRoot, outcome);
  process.stdout.write(`${JSON.stringify({ status, reasonCode: outcome.reasonCode, evidence: basename(evidenceRoot) })}\n`);
  if (mainFailure) process.exitCode = 1;
  return outcome;
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  try {
    const args = parseArguments(process.argv.slice(2));
    await validate(args);
  } catch (error) {
    const failure = error instanceof ValidationFailure ? error : new ValidationFailure("internal_error", "Validation failed closed.");
    process.stderr.write(`${JSON.stringify({ status: "NOT_PASS", reasonCode: failure.code })}\n`);
    process.exitCode = 1;
  }
}

export const __testOnly = Object.freeze({
  CONFIG_ROOT,
  STORAGE_ROOT,
  LOCAL_DOCKER_HOST,
  LOCAL_DOCKER_SOCKET,
  EXACT_SERVICES,
  REVOKED_SUBJECTS,
  runtimeEnvironment,
  parseArguments,
  parseOsRelease,
  sha256,
});
