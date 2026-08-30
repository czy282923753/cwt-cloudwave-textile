import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, readlinkSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

import {
  createGlideValkeyTransport,
  ValkeySharedRateLimiter,
  type ValkeyRateLimiterConfiguration,
} from "../src/security/valkey-rate-limiter";
import { hashRateLimitIdentity } from "../src/security/shared-rate-limiter";

const endpoint = process.env.CWT_TEST_VALKEY_ENDPOINT ?? "";
const username = process.env.CWT_TEST_VALKEY_USERNAME ?? "";
const password = process.env.CWT_TEST_VALKEY_PASSWORD ?? "";
if (process.argv[2] !== "--artifact" && (!endpoint || !username || !password)) {
  throw new Error("Synthetic Valkey integration configuration is required.");
}

const configuration: ValkeyRateLimiterConfiguration = {
  endpoint,
  username,
  password,
  keyPrefix: "cwt:production:rate:",
  clientName: `cwt-valkey-integration-${process.pid}`,
};

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function portableRelative(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

function filesUnder(root: string): readonly string[] {
  const output: string[] = [];
  const visit = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = resolve(directory, name);
      const stat = lstatSync(path);
      if (stat.isDirectory()) visit(path);
      else if (stat.isFile() || stat.isSymbolicLink()) output.push(path);
      else throw new Error(`Artifact contains a special filesystem node: ${portableRelative(root, path)}`);
    }
  };
  visit(root);
  return output;
}

function artifactInventory(): void {
  const standaloneInput = process.env.CWT_TEST_STANDALONE_ROOT ?? "";
  const buildInput = process.env.CWT_TEST_BUILD_ROOT ?? "";
  const architecture = process.env.CWT_TEST_LINUX_ARCHITECTURE;
  if (!isAbsolute(standaloneInput) || !isAbsolute(buildInput) ||
    architecture !== "arm64" && architecture !== "x64") {
    throw new Error("Absolute artifact roots and exact Linux architecture are required.");
  }
  const standaloneRoot = realpathSync(standaloneInput);
  const buildRoot = realpathSync(buildInput);
  const standaloneFiles = filesUnder(standaloneRoot);
  const inventory = standaloneFiles.map((path) => {
    const identity = portableRelative(standaloneRoot, path);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) {
      const target = realpathSync(path);
      const targetRelative = relative(standaloneRoot, target);
      if (targetRelative === ".." || targetRelative.startsWith(`..${sep}`) || isAbsolute(targetRelative)) {
        throw new Error(`Standalone symlink escapes the copied artifact: ${identity}`);
      }
      return `L\0${identity}\0${readlinkSync(path)}`;
    }
    const bytes = readFileSync(path);
    return `F\0${identity}\0${bytes.byteLength}\0${sha256(bytes)}`;
  });
  const valkeyIdentities = inventory.map((entry) => entry.split("\0")[1] ?? "")
    .filter((identity) => identity.toLowerCase().includes("valkey"));
  const expectedNativePackage = `@valkey+valkey-glide-linux-${architecture}-gnu@2.5.1`;
  const expectedNativeFilename = `valkey-glide.linux-${architecture}-gnu.node`;
  const nativeIdentities = valkeyIdentities.filter((identity) => identity.endsWith(".node"));
  if (nativeIdentities.length !== 1 || !nativeIdentities[0]?.includes(expectedNativePackage) ||
    !nativeIdentities[0]?.endsWith(expectedNativeFilename)) {
    throw new Error(`Standalone GLIDE native identity mismatch: ${JSON.stringify(nativeIdentities)}`);
  }
  const rejectedNativeIdentity = valkeyIdentities.find((identity) =>
    identity.includes("darwin") || identity.includes("musl") ||
    architecture === "arm64" && identity.includes("linux-x64") ||
    architecture === "x64" && identity.includes("linux-arm64"));
  if (rejectedNativeIdentity !== undefined) {
    throw new Error(`Standalone contains a wrong-platform GLIDE identity: ${rejectedNativeIdentity}`);
  }
  const mainPackagePath = standaloneFiles.find((path) =>
    portableRelative(standaloneRoot, path).match(
      /^node_modules\/.pnpm\/@valkey\+valkey-glide@2\.5\.1\/node_modules\/@valkey\/valkey-glide\/package\.json$/u,
    ));
  const nativePackagePath = standaloneFiles.find((path) =>
    portableRelative(standaloneRoot, path).includes(`${expectedNativePackage}/node_modules/@valkey/`) &&
    path.endsWith("package.json"));
  for (const [label, path] of [["main", mainPackagePath], ["native", nativePackagePath]] as const) {
    if (path === undefined) throw new Error(`Standalone GLIDE ${label} package is missing.`);
    const document = JSON.parse(readFileSync(path, "utf8")) as { readonly version?: unknown };
    if (document.version !== "2.5.1") throw new Error(`Standalone GLIDE ${label} package version drifted.`);
  }
  const externalAliases = standaloneFiles.map((path) => portableRelative(standaloneRoot, path)).filter((identity) =>
    /^\.next\/node_modules\/@valkey\/valkey-glide-[0-9a-f]+$/u.test(identity));
  if (externalAliases.length !== 1 || !lstatSync(resolve(standaloneRoot, externalAliases[0]!)).isSymbolicLink()) {
    throw new Error(`Standalone GLIDE external alias mismatch: ${JSON.stringify(externalAliases)}`);
  }
  const nftPaths = filesUnder(buildRoot).filter((path) => path.endsWith(".nft.json"));
  const nftInventory = nftPaths.map((path) => {
    const bytes = readFileSync(path);
    return `${portableRelative(buildRoot, path)}\0${sha256(bytes)}`;
  });
  const valkeyNftPaths = nftPaths.filter((path) => readFileSync(path, "utf8").includes("@valkey+valkey-glide@2.5.1"));
  if (nftPaths.length === 0 || valkeyNftPaths.length === 0 ||
    !valkeyNftPaths.some((path) => portableRelative(buildRoot, path) ===
      "server/app/api/auth/login/route.js.nft.json")) {
    throw new Error("Output File Tracing did not bind GLIDE to the built login route.");
  }
  const nativePath = resolve(standaloneRoot, nativeIdentities[0]!);
  const nativeBytes = readFileSync(nativePath);
  process.stdout.write(`${JSON.stringify({
    artifact: "next-standalone-valkey-glide-v1",
    architecture,
    standaloneFileCount: standaloneFiles.length,
    standaloneTreeSha256: sha256(`${inventory.join("\n")}\n`),
    nftFileCount: nftPaths.length,
    nftSetSha256: sha256(`${nftInventory.join("\n")}\n`),
    valkeyNftFileCount: valkeyNftPaths.length,
    externalAlias: externalAliases[0],
    native: {
      path: nativeIdentities[0],
      bytes: nativeBytes.byteLength,
      sha256: sha256(nativeBytes),
    },
  }, null, 2)}\n`);
}

async function worker(identity: string): Promise<void> {
  const limiter = new ValkeySharedRateLimiter(configuration);
  try {
    for (let attempt = 0; attempt < 15; attempt += 1) {
      const outcome = await limiter.consume(identity, "login");
      if (outcome.kind !== "allowed") throw new Error("Cross-process consume was not allowed within the boundary.");
    }
  } finally {
    await limiter.close();
  }
}

function runWorker(identity: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      "--conditions=react-server", "--import=tsx", process.argv[1] ?? "", "--worker", identity,
    ], {
      env: process.env,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let safeError = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => { safeError += chunk.slice(0, 1_000); });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Synthetic Valkey worker failed (${code ?? "signal"}): ${safeError.replaceAll(password, "[redacted]")}`));
    });
  });
}

async function parent(): Promise<void> {
  const identity = `synthetic-${randomUUID()}`;
  await Promise.all([runWorker(identity), runWorker(identity)]);
  const limiter = new ValkeySharedRateLimiter(configuration);
  try {
    const thirtyFirst = await limiter.consume(identity, "login");
    if (thirtyFirst.kind !== "limited") throw new Error("Atomic 30/31 boundary was not shared across processes.");
    const isolatedAction = await limiter.consume(identity, "upload");
    if (isolatedAction.kind !== "allowed" || isolatedAction.remaining !== 29) {
      throw new Error("Concurrent action isolation contract failed.");
    }
  } finally {
    await limiter.close();
  }

  const denied = new ValkeySharedRateLimiter({ ...configuration, password: `${password}-wrong` });
  try {
    if ((await denied.consume("synthetic-acl-denial", "upload")).kind !== "unavailable") {
      throw new Error("ACL denial did not fail closed.");
    }
  } finally {
    await denied.close();
  }

  const transport = await createGlideValkeyTransport(configuration);
  try {
    const ttlIdentity = `cwt:production:rate:upload:${randomUUID().replaceAll("-", "")}`;
    const first = await transport.invoke(ttlIdentity, 100);
    await new Promise((resolve) => setTimeout(resolve, 150));
    const reset = await transport.invoke(ttlIdentity, 100);
    if (!Array.isArray(first) || first[0] !== 1 || !Array.isArray(reset) || reset[0] !== 1) {
      throw new Error("Atomic TTL reset contract failed.");
    }
  } finally {
    transport.close();
  }

  process.stdout.write("Valkey two-process atomic, TTL, ACL-denial, and fail-closed checks passed.\n");
}

async function builtRoute(expected: "online" | "outage"): Promise<void> {
  const origin = process.env.CWT_TEST_BUILT_SERVER_URL ?? "";
  const clientAddress = process.env.CWT_TEST_CLIENT_ADDRESS ?? "192.0.2.44";
  const email = process.env.CWT_TEST_LOGIN_EMAIL ?? "built-route@example.test";
  if (!origin.startsWith("http://127.0.0.1:") && !origin.startsWith("http://app:")) {
    throw new Error("Synthetic built-server loopback origin is required.");
  }
  const response = await fetch(new URL("/api/auth/login/", origin), {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": "https://cwtextile.com",
      "x-cwt-client-address": clientAddress,
    },
    body: new URLSearchParams({ email, password: "synthetic-invalid-password" }),
    signal: AbortSignal.timeout(5_000),
  });
  const location = response.headers.get("location") ?? "";
  if (response.status !== 303) throw new Error(`Built route returned unexpected status ${response.status}.`);
  if (expected === "outage") {
    if (!location.endsWith("/operations-login/?error=rate_unavailable")) {
      throw new Error("Built route did not fail closed before database work during Valkey outage.");
    }
    process.stdout.write("Built standalone route failed closed during Valkey outage.\n");
    return;
  }
  if (!location.endsWith("/operations-login/?error=request")) {
    throw new Error("Built route did not reach the deliberately unavailable Synthetic database after limiting.");
  }
  const transport = await createGlideValkeyTransport(configuration);
  try {
    const expectedKeys = [
      `${configuration.keyPrefix}login:${hashRateLimitIdentity(`network:${clientAddress}`)}`,
      `${configuration.keyPrefix}login:${hashRateLimitIdentity(`account:${email}`)}`,
    ];
    for (const key of expectedKeys) {
      const counter = await transport.invoke(key, 60_000);
      if (!Array.isArray(counter) || counter[0] !== 2) {
        throw new Error("Built route Valkey key/counter evidence mismatch.");
      }
      const ttl = counter[1];
      if (typeof ttl !== "number" || !Number.isSafeInteger(ttl) || ttl < 1 || ttl > 60_000) {
        throw new Error("Built route Valkey TTL evidence mismatch.");
      }
    }
    process.stdout.write(`Built standalone route counter/key/TTL evidence passed for ${expectedKeys.length} hashed keys.\n`);
  } finally {
    transport.close();
  }
}

async function outage(): Promise<void> {
  const limiter = new ValkeySharedRateLimiter(configuration);
  try {
    if ((await limiter.consume("synthetic-outage", "upload")).kind !== "unavailable") {
      throw new Error("Valkey outage did not fail closed.");
    }
  } finally {
    await limiter.close();
  }
  process.stdout.write("Valkey outage failed closed.\n");
}

async function main(): Promise<void> {
  if (process.argv[2] === "--artifact") artifactInventory();
  else if (process.argv[2] === "--worker") await worker(process.argv[3] ?? "");
  else if (process.argv[2] === "--outage") await outage();
  else if (process.argv[2] === "--built-route-online") await builtRoute("online");
  else if (process.argv[2] === "--built-route-outage") await builtRoute("outage");
  else await parent();
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message.replaceAll(password, "[redacted]") : "unknown failure";
  process.stderr.write(`Valkey Synthetic integration failed: ${message}\n`);
  process.exitCode = 1;
});
