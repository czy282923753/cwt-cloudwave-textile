import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIB = 1024 * 1024;
const exactServices = [
  "postgres", "proxy", "scheduler-production", "scheduler-staging", "valkey-production",
  "valkey-staging", "web-production", "web-staging", "worker-production", "worker-staging",
];
const exactDefault = ["postgres", "proxy", "scheduler-production", "valkey-production", "web-production"];
const exactStaging = ["scheduler-staging", "valkey-staging", "web-staging", "worker-staging"];
const exactProductionAi = ["worker-production"];
export const exactProtectedSecretFiles = Object.freeze([
  Object.freeze({ literalField: "DATABASE_URL", fileField: "DATABASE_URL_FILE", subjectSuffix: "database-url" }),
  Object.freeze({ literalField: "AUTH_SESSION_SECRET", fileField: "AUTH_SESSION_SECRET_FILE", subjectSuffix: "auth-session-secret" }),
  Object.freeze({ literalField: "FILE_SCAN_API_KEY", fileField: "FILE_SCAN_API_KEY_FILE", subjectSuffix: "cloudmersive-api-key" }),
  Object.freeze({ literalField: "VALKEY_PASSWORD", fileField: "VALKEY_PASSWORD_FILE", subjectSuffix: "valkey-password" }),
  Object.freeze({ literalField: "SMTP_PASSWORD", fileField: "SMTP_PASSWORD_FILE", subjectSuffix: "smtp-password" }),
  Object.freeze({ literalField: "SENTRY_DSN", fileField: "SENTRY_DSN_FILE", subjectSuffix: "monitoring-dsn" }),
  Object.freeze({ literalField: "AI_PROVIDER_API_KEY", fileField: "AI_PROVIDER_API_KEY_FILE", subjectSuffix: "ai-api-key" }),
  Object.freeze({ literalField: "COS_ACCESS_KEY_ID", fileField: "COS_ACCESS_KEY_ID_FILE", subjectSuffix: "cos-access-key-id" }),
  Object.freeze({ literalField: "COS_SECRET_ACCESS_KEY", fileField: "COS_SECRET_ACCESS_KEY_FILE", subjectSuffix: "cos-secret-key" }),
  Object.freeze({ literalField: "BACKUP_REPOSITORY_PASSWORD", fileField: "BACKUP_REPOSITORY_PASSWORD_FILE", subjectSuffix: "backup-password" }),
]);
const exactMemory = Object.freeze({
  postgres: 768 * MIB,
  proxy: 64 * MIB,
  "scheduler-production": 256 * MIB,
  "scheduler-staging": 192 * MIB,
  "valkey-production": 128 * MIB,
  "valkey-staging": 128 * MIB,
  "web-production": 768 * MIB,
  "web-staging": 512 * MIB,
  "worker-production": 512 * MIB,
  "worker-staging": 384 * MIB,
});
const exactNetworks = Object.freeze({
  postgres: ["production-database", "staging-database"],
  proxy: ["edge", "production-ingress", "staging-ingress"],
  "scheduler-production": ["production-backend", "production-database"],
  "scheduler-staging": ["staging-backend", "staging-database"],
  "valkey-production": ["production-backend"],
  "valkey-staging": ["staging-backend"],
  "web-production": ["production-backend", "production-database", "production-ingress"],
  "web-staging": ["staging-backend", "staging-database", "staging-ingress"],
  "worker-production": ["production-backend", "production-database"],
  "worker-staging": ["staging-backend", "staging-database"],
});
const exactCommands = Object.freeze({
  "web-production": ["node", ".next/standalone/server.js"],
  "web-staging": ["node", ".next/standalone/server.js"],
  "worker-production": ["node", "--conditions=react-server", "--import=tsx", "/app/scripts/process-ai-runs.ts"],
  "worker-staging": ["node", "--conditions=react-server", "--import=tsx", "/app/scripts/process-ai-runs.ts"],
  "scheduler-production": ["supercronic", "-passthrough-logs", "/app/deploy/schedule/production.crontab"],
  "scheduler-staging": ["supercronic", "-passthrough-logs", "/app/deploy/schedule/staging.crontab"],
});
const exactWebHealthcheck = [
  "CMD", "node", "-e",
  "fetch('http://127.0.0.1:3000/api/health/ready/',{cache:'no-store',signal:AbortSignal.timeout(3000)}).then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))",
];
const exactApplicationBindHostname = "0.0.0.0";
const exactWebHealthHostname = "127.0.0.1";
const exactInfrastructureTmpfs = Object.freeze({
  postgres: Object.freeze([
    "/tmp:rw,noexec,nosuid,nodev,size=33554432,uid=999,gid=999,mode=0700",
    "/var/run/postgresql:rw,noexec,nosuid,nodev,size=16777216,uid=999,gid=999,mode=0750",
  ]),
  "valkey-production": Object.freeze([
    "/tmp:rw,noexec,nosuid,nodev,size=16777216,uid=999,gid=999,mode=0700",
  ]),
  "valkey-staging": Object.freeze([
    "/tmp:rw,noexec,nosuid,nodev,size=16777216,uid=999,gid=999,mode=0700",
  ]),
});
const standaloneTmpfsOption = /^(?:rw|ro|exec|noexec|suid|nosuid|dev|nodev|size=\d+|uid=\d+|gid=\d+|mode=[0-7]+)$/u;

function fail(message) { throw new Error(`Compose graph refused: ${message}`); }
function sorted(value) { return [...value].sort(); }
function same(left, right) { return JSON.stringify(sorted(left)) === JSON.stringify(sorted(right)); }

function secretSources(service) {
  return (service.secrets ?? []).map((secret) => secret.source);
}

function validateProtectedSecretClosure(document) {
  const protectedRoles = {
    production: ["web-production", "worker-production", "scheduler-production"],
    staging: ["web-staging", "worker-staging", "scheduler-staging"],
  };
  const expectedTopLevel = {
    "postgres-bootstrap-password": "/etc/cwt/postgres/bootstrap-password",
    "production-database-password": "/etc/cwt/production/database-password",
    "staging-database-password": "/etc/cwt/staging/database-password",
  };
  for (const [environment, roles] of Object.entries(protectedRoles)) {
    const expectedEnvironment = { HOSTNAME: exactApplicationBindHostname }; const expectedSubjects = [];
    for (const requirement of exactProtectedSecretFiles) {
      const subject = `${environment}-${requirement.subjectSuffix}`;
      expectedSubjects.push(subject);
      expectedEnvironment[requirement.fileField] = `/run/secrets/${subject}`;
      expectedTopLevel[subject] = `/etc/cwt/${environment}/${requirement.subjectSuffix}`;
    }
    for (const role of roles) {
      const service = document.services[role];
      if (!same(secretSources(service), expectedSubjects)) fail(`${role} protected secret grant drifted`);
      if (!same(Object.keys(service.environment ?? {}), Object.keys(expectedEnvironment)) ||
        Object.entries(expectedEnvironment).some(([field, path]) => service.environment[field] !== path)) fail(`${role} protected environment mapping drifted`);
      for (const secret of service.secrets ?? []) {
        if (secret.target !== `/run/secrets/${secret.source}`) fail(`${role} protected secret target drifted`);
      }
    }
  }
  if (!same(Object.keys(document.secrets ?? {}), Object.keys(expectedTopLevel))) fail("top-level secret subject closure drifted");
  for (const [subject, file] of Object.entries(expectedTopLevel)) {
    const secret = document.secrets[subject];
    if (secret?.file !== file || secret?.name !== `cwt_${subject}`) fail(`${subject} top-level secret custody drifted`);
  }
  if (!same(secretSources(document.services.postgres), ["postgres-bootstrap-password", "production-database-password", "staging-database-password"]) ||
    !same(secretSources(document.services["valkey-production"]), ["production-valkey-password"]) ||
    !same(secretSources(document.services["valkey-staging"]), ["staging-valkey-password"]) ||
    (document.services.proxy.secrets ?? []).length !== 0) fail("infrastructure secret grant drifted");
}

export function validateComposeGraph(document) {
  if (!document || typeof document !== "object" || !document.services || !document.networks || !document.secrets) fail("invalid normalized document");
  const services = document.services;
  if (!same(Object.keys(services), exactServices)) fail("service set drifted");
  const defaults = Object.entries(services).filter(([, service]) => !service.profiles?.length).map(([name]) => name);
  const staging = Object.entries(services).filter(([, service]) => same(service.profiles ?? [], ["staging"])).map(([name]) => name);
  const productionAi = Object.entries(services).filter(([, service]) => same(service.profiles ?? [], ["production-ai"])).map(([name]) => name);
  if (!same(defaults, exactDefault) || !same(staging, exactStaging) || !same(productionAi, exactProductionAi)) fail("profile selection drifted");
  validateProtectedSecretClosure(document);
  if (services["worker-production"].restart !== "no") fail("Production AI Worker must remain dormant and non-restarting");
  for (const [name, service] of Object.entries(services)) {
    if (service.logging?.driver !== "journald") fail(`${name} logging authority drifted`);
    if (name !== "worker-production" && service.restart !== "unless-stopped") fail(`${name} restart policy drifted`);
    if (Number(service.mem_limit) !== exactMemory[name]) fail(`${name} memory limit drifted`);
    if (!same(Object.keys(service.networks ?? {}), exactNetworks[name])) fail(`${name} network membership drifted`);
    if (name.includes("production") || name.includes("staging")) {
      if (name.startsWith("valkey")) {
        if (service.user !== "999:999" || service.read_only !== true) fail(`${name} privilege boundary drifted`);
      } else if (service.user !== "10001:10001" || service.read_only !== true ||
        !same(service.cap_drop ?? [], ["ALL"]) || !(service.security_opt ?? []).includes("no-new-privileges:true")) {
        fail(`${name} privilege boundary drifted`);
      }
    }
  }
  for (const name of ["web-production", "web-staging"]) {
    const service = services[name];
    if (service.environment?.HOSTNAME !== exactApplicationBindHostname) {
      fail(`${name} application bind authority drifted`);
    }
    if (JSON.stringify(service.healthcheck?.test) !== JSON.stringify(exactWebHealthcheck)) {
      fail(`${name} application readiness healthcheck drifted`);
    }
    const healthScript = service.healthcheck.test[3];
    const healthHostname = healthScript.match(/^fetch\('http:\/\/([^/:]+):3000\/api\/health\/ready\/'/u)?.[1];
    if (healthHostname !== exactWebHealthHostname || service.environment.HOSTNAME !== exactApplicationBindHostname) {
      fail(`${name} bind and loopback health authority diverged`);
    }
  }
  for (const [name, expected] of Object.entries(exactInfrastructureTmpfs)) {
    if (JSON.stringify(services[name].tmpfs) !== JSON.stringify(expected)) fail(`${name} tmpfs authority drifted`);
  }
  for (const [name, service] of Object.entries(services)) {
    if ((service.tmpfs ?? []).some((entry) => standaloneTmpfsOption.test(entry))) fail(`${name} contains a split tmpfs option fragment`);
  }
  for (const environment of ["production", "staging"]) {
    const scheduler = services[`scheduler-${environment}`];
    const target = `/srv/cwt/backups/postgresql/${environment}`;
    const backupMounts = (scheduler.volumes ?? []).filter((volume) => volume.target?.startsWith("/srv/cwt/backups/postgresql/"));
    if (backupMounts.length !== 1 || backupMounts[0].source !== target || backupMounts[0].target !== target || backupMounts[0].read_only !== true) {
      fail(`${environment} backup-completion evidence mount drifted`);
    }
  }
  for (const [name, command] of Object.entries(exactCommands)) {
    if (JSON.stringify(services[name].command) !== JSON.stringify(command)) fail(`${name} command drifted`);
    if (services[name].stop_signal !== "SIGTERM" || services[name].stop_grace_period !== "30s") {
      fail(`${name} signal/grace contract drifted`);
    }
  }
  const databaseNetworks = Object.entries(document.networks).filter(([name]) => name.endsWith("-database"));
  if (!same(databaseNetworks.map(([name]) => name), ["production-database", "staging-database"]) ||
    databaseNetworks.some(([, network]) => network.internal !== true)) fail("database network authority drifted");
  const published = Object.entries(services).filter(([, service]) => (service.ports ?? []).length > 0).map(([name]) => name);
  if (!same(published, ["proxy"])) fail("only proxy may publish host ports");
  const sum = (names) => names.reduce((total, name) => total + exactMemory[name], 0);
  const defaultBytes = sum(exactDefault);
  const stagingBytes = sum(exactStaging);
  if (defaultBytes !== 1984 * MIB || stagingBytes !== 1216 * MIB ||
    defaultBytes + exactMemory["worker-production"] !== 2496 * MIB ||
    defaultBytes + stagingBytes !== 3200 * MIB ||
    defaultBytes - exactMemory["scheduler-production"] + stagingBytes !== 2944 * MIB ||
    defaultBytes + stagingBytes + exactMemory["worker-production"] !== 3712 * MIB) fail("resource arithmetic drifted");
  return { services: exactServices.length, defaultBytes, stagingBytes, minimumStagingAvailableBytes: 1408 * MIB };
}

function normalizedFromCompose(composePath) {
  const digestA = `sha256:${"a".repeat(64)}`;
  const digestB = `sha256:${"b".repeat(64)}`;
  const digestC = `sha256:${"c".repeat(64)}`;
  const output = execFileSync("/usr/bin/docker", [
    "compose", "--file", composePath, "--profile", "staging", "--profile", "production-ai",
    "config", "--format", "json", "--no-env-resolution", "--no-path-resolution",
  ], {
    encoding: "utf8",
    env: {
      PATH: "/usr/sbin:/usr/bin:/sbin:/bin",
      HOME: "/root", LANG: "C", LC_ALL: "C", TZ: "UTC",
      CWT_IMAGE_REFERENCE: `cwt.invalid/application@${digestA}`,
      CWT_IMAGE_INDEX_DIGEST: digestA,
      CWT_IMAGE_CHILD_DIGEST: digestB,
      CWT_PROXY_IMAGE_REFERENCE: `cwt.invalid/proxy@${digestC}`,
      CWT_CLOUDFLARE_RANGES_FILE: "/etc/cwt/cloudflare-ranges.conf",
    },
    stdio: ["ignore", "pipe", "inherit"],
  });
  return JSON.parse(output);
}

function readAvailableMemoryBytes() {
  const line = readFileSync("/proc/meminfo", "utf8").split("\n").find((candidate) => candidate.startsWith("MemAvailable:"));
  const kib = Number(line?.match(/^MemAvailable:\s+(\d+)\s+kB$/u)?.[1]);
  if (!Number.isSafeInteger(kib)) fail("MemAvailable is unavailable");
  return kib * 1024;
}

function protectedProjectState() {
  const output = execFileSync("/usr/bin/env", [
    "-i", "PATH=/usr/sbin:/usr/bin:/sbin:/bin", "HOME=/root", "LANG=C", "LC_ALL=C", "TZ=UTC", "DOCKER_API_VERSION=1.55",
    "/usr/bin/docker", "--config", "/etc/cwt/docker-cli", "--host", "unix:///run/docker.sock",
    "compose", "--env-file", "/etc/cwt/compose.env", "--project-name", "cwt", "--file", "/etc/cwt/compose.yaml",
    "--profile", "staging", "ps", "--all", "--format", "json",
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  const parsed = JSON.parse(output);
  if (!Array.isArray(parsed)) fail("project state is not a JSON array");
  const byService = new Map(parsed.map((entry) => [entry.Service, entry]));
  if (byService.size !== parsed.length) fail("project state contains duplicate services");
  return byService;
}

function isInactive(entry) {
  return entry === undefined || ["exited", "dead", "created"].includes(String(entry.State).toLowerCase());
}

function requireRunning(byService, name) {
  const entry = byService.get(name);
  if (!entry || String(entry.State).toLowerCase() !== "running" || entry.Paused === true ||
    (entry.Health && String(entry.Health).toLowerCase() !== "healthy")) fail(`${name} is not stably running/healthy`);
}

function validateProtectedState(mode) {
  const byService = protectedProjectState();
  for (const name of ["proxy", "web-production", "postgres", "valkey-production"]) requireRunning(byService, name);
  const scheduler = byService.get("scheduler-production");
  if (!scheduler || (String(scheduler.State).toLowerCase() !== "paused" && scheduler.Paused !== true)) {
    fail("Production Scheduler must be paused");
  }
  if (!isInactive(byService.get("worker-production"))) fail("Production AI Worker must be inactive");
  for (const name of exactStaging) {
    if (mode === "pre") {
      if (!isInactive(byService.get(name))) fail(`${name} must be inactive before the single action`);
    } else {
      requireRunning(byService, name);
    }
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  const normalizedArgument = process.argv.indexOf("--normalized");
  const composeArgument = process.argv.indexOf("--compose");
  const protectedMode = process.argv[2] === "--protected-pre-start" || process.argv[2] === "--protected-post-start";
  const document = normalizedArgument > 0
    ? JSON.parse(readFileSync(resolve(process.argv[normalizedArgument + 1]), "utf8"))
    : normalizedFromCompose(protectedMode ? "/etc/cwt/compose.yaml" : resolve(process.argv[composeArgument + 1] ?? "compose.yaml"));
  const result = validateComposeGraph(document);
  if (process.argv[2] === "--protected-pre-start" && readAvailableMemoryBytes() < result.minimumStagingAvailableBytes) {
    fail("MemAvailable is below the exact 1408 MiB threshold");
  }
  if (process.argv[2] === "--protected-pre-start") validateProtectedState("pre");
  if (process.argv[2] === "--protected-post-start") validateProtectedState("post");
  process.stdout.write(`${JSON.stringify({ ok: true, ...result })}\n`);
}
