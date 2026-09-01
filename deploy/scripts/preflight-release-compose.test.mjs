import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";

import {
  OWNER_DIND_REFERENCE,
  __testOnly,
  assertExclusiveStore,
  classifyValidationFailure,
  cleanupPreservingPrimary,
  createOwnerControllerPlan,
  createVolumeProjectionPlan,
  createValidationPlan,
  digestQualifiedReference,
  ownerDockerArgs,
  ownerHelperArgs,
  ownerResources,
  pinnedDindVersionProbeArgs,
  validateOwnerControllerPlan,
  validatePinnedDindPlatformInspection,
  validateResolvedIdentity,
  validateSelfTestImageArchiveMetadata,
  validateSelfTestImageInspection,
  validateSelfTestComposeDefinition,
  validateSelfTestServerState,
  validateValidationPlan,
  validateVolumeProjectionPlan,
} from "./preflight-release-compose.mjs";

const index = `sha256:${"a".repeat(64)}`;
const child = `sha256:${"b".repeat(64)}`;
const revision = "c".repeat(40);
const outerHost = "unix:///outer/docker.sock";
const token = "cwt-proof-1234";
const resources = ownerResources(token);
const ownerHost = resources.ownerHost;
const qualified = `cwt.local/release@${index}`;
const tag = `cwt.local/release:${revision}`;
const repositoryRoot = "/workspace/cwt";
const workspace = "/tmp/cwt-proof-workspace";

function disposableWorkspace() {
  const parent = mkdtempSync(resolve(tmpdir(), "cwt-release-finalizer-test-"));
  return { parent, workspace: mkdtempSync(resolve(parent, "workspace-")) };
}

function mutableControllerPlan() {
  const plan = createOwnerControllerPlan({ token, outerHost, repositoryRoot });
  return {
    resources: { ...plan.resources },
    volumeCreate: plan.volumeCreate.map((command) => [...command]),
    controllerRun: [...plan.controllerRun],
    readiness: [...plan.readiness],
    diagnostics: plan.diagnostics.map((command) => [...command]),
    cleanup: plan.cleanup.map((command) => [...command]),
    finalization: plan.finalization.map((command) => [...command]),
  };
}

test("pins one private DIND controller with exact resources and pull-never isolation", () => {
  const plan = createOwnerControllerPlan({ token, outerHost, repositoryRoot });
  assert.equal(plan.controllerRun.includes(OWNER_DIND_REFERENCE), true);
  assert.equal(plan.controllerRun.join(" ").includes("--pull never"), true);
  assert.equal(plan.controllerRun.join(" ").includes("--network none"), true);
  assert.equal(plan.controllerRun.includes("--privileged"), true);
  assert.equal(plan.controllerRun.includes("--rm"), false);
  assert.equal(plan.controllerRun.includes("--pid"), false);
  assert.equal(plan.controllerRun.some((value) => value === "--publish" || value === "-p"), false);
  assert.deepEqual(plan.volumeCreate.map((command) => command.at(-1)), [
    resources.apiVolume, resources.dockerDataVolume, resources.containerdDataVolume,
    resources.configVolume, resources.storageVolume, resources.journalVolume,
  ]);
  assert.equal(plan.controllerRun.join(" ").includes(`--exec-root=${resources.execRoot}`), true);
  assert.equal(plan.controllerRun.join(" ").includes("containerd.sock"), false);
  assert.equal(plan.controllerRun.join(" ").includes("nsenter"), false);
  assert.equal(plan.controllerRun.join(" ").includes("tcp://"), false);
  assert.equal(plan.readiness.slice(0, 4).join(" "), `docker --host ${outerHost} run`);
});

test("binds platform-aware inspect to the exact arm64 child while retaining the exact index RepoDigest", () => {
  const exact = {
    Descriptor: { digest: "sha256:48bd8cb4ce95d6c03004ee4fe06db27a49813fe0c3a55785a9bf06c941d9a9df" },
    RepoDigests: ["docker@sha256:bfec1f5159c63a81ca6fdedbd81404d2c0e16378ed0feec3bb3fbf3998847659"],
    Os: "linux", Architecture: "arm64", Variant: "v8",
  };
  assert.equal(validatePinnedDindPlatformInspection(exact), true);
  assert.throws(() => validatePinnedDindPlatformInspection({ ...exact, Descriptor: { digest: "sha256:bfec1f5159c63a81ca6fdedbd81404d2c0e16378ed0feec3bb3fbf3998847659" } }), /identity drifted/u);
  assert.throws(() => validatePinnedDindPlatformInspection({ ...exact, Descriptor: { digest: `sha256:${"0".repeat(64)}` } }), /identity drifted/u);
  assert.throws(() => validatePinnedDindPlatformInspection({ ...exact, RepoDigests: [`docker@sha256:${"1".repeat(64)}`] }), /identity drifted/u);
});

test("probes embedded Docker through explicit dockerd entrypoint with only --version after the image", () => {
  const args = pinnedDindVersionProbeArgs();
  const imageIndex = args.indexOf(OWNER_DIND_REFERENCE);
  assert.deepEqual(args.slice(0, imageIndex), ["run", "--rm", "--pull", "never", "--network", "none", "--entrypoint", "dockerd"]);
  assert.deepEqual(args.slice(imageIndex + 1), ["--version"]);
});

test("keeps only the repository controller bind and projects Linux-only state through named volumes", () => {
  const rendered = createOwnerControllerPlan({ token, outerHost, repositoryRoot }).controllerRun.join(" ");
  for (const expected of [
    `source=${repositoryRoot},target=${repositoryRoot},readonly`,
    `source=${resources.configVolume},target=/etc/cwt,readonly,volume-nocopy`,
    `source=${resources.storageVolume},target=/srv/cwt,volume-nocopy`,
    `source=${resources.journalVolume},target=/run/systemd/journal,volume-nocopy`,
  ]) assert.equal(rendered.includes(expected), true);
  assert.equal(rendered.includes(`source=${workspace},target=${workspace}`), false);
  assert.equal(rendered.match(/type=bind,/gu)?.length, 1);
  for (const forbidden of ["type=bind,source=/etc/cwt", "type=bind,source=/srv/cwt", "type=bind,source=/run/systemd/journal"]) assert.equal(rendered.includes(forbidden), false);
});

test("populates config/storage only through named volumes and freezes UNIX-RECVFROM journal helper authority", () => {
  const configRoot = "/tmp/cwt-config-payload";
  const plan = createVolumeProjectionPlan({ resources, outerHost, configRoot, token });
  assert.equal(plan.expectedConfig.length, 30);
  assert.equal(plan.configPopulate.join(" ").includes(`type=bind,source=${configRoot},target=/payload,readonly`), true);
  assert.equal(plan.configPopulate.join(" ").includes(`source=${resources.configVolume},target=/target,volume-nocopy`), true);
  assert.equal(plan.storagePopulate.join(" ").includes(`source=${resources.storageVolume},target=/target,volume-nocopy`), true);
  assert.deepEqual(plan.storagePopulate.slice(-2), ["sh", token]);
  assert.equal(plan.storagePopulate.at(-3).includes(token), false);
  assert.equal(plan.storagePopulate.at(-3).includes(': > "/target/.$1"'), true);
  const journal = plan.journalStart.join(" ");
  assert.equal(journal.includes(`--name ${resources.journalHelper}`), true);
  assert.equal(journal.includes("--pid host"), true);
  assert.equal(journal.includes("UNIX-RECVFROM:/proc/${helper_pid}/root/run/systemd/journal/socket,fork"), true);
  assert.equal(journal.includes("helper_pid=$$"), true);
  assert.equal(journal.includes("child_pid=$!"), true);
  assert.equal(journal.includes("trap cleanup EXIT TERM INT"), true);
  assert.equal(journal.includes("nsenter -t 1 -m -- socat UNIX-RECVFROM:/proc/${helper_pid}/root/run/systemd/journal/socket,fork OPEN:/dev/null &"), true);
  assert.equal(journal.includes("wait \"$child_pid\""), true);
  assert.equal(journal.includes("kill -TERM \"$child_pid\""), true);
  assert.equal(journal.includes("kill -KILL \"$child_pid\""), true);
  assert.equal(journal.includes("exec nsenter"), false);
  const syntax = spawnSync("/bin/sh", ["-n", "-c", plan.journalStart.at(-1)], { encoding: "utf8" });
  assert.equal(syntax.status, 0, syntax.stderr);
  assert.equal(journal.includes("UNIX-RECV:"), false);
  assert.equal(journal.includes("Mountpoint"), false);
  assert.equal(plan.journalProbe.join(" ").includes(`source=${resources.journalVolume},target=/probe,readonly,volume-nocopy`), true);
});

test("keeps adversarial self-test paths and tokens as exact positional argv values", () => {
  const parent = mkdtempSync(resolve(tmpdir(), "cwt-shell-argv-test-"));
  const adversarialRepository = resolve(parent, "CWT space (paren) 'single' \"double\" 中文");
  const adversarialStorage = resolve(parent, "storage proof (one) 'quote' 中文.proof");
  try {
    mkdirSync(adversarialRepository, { recursive: true });
    writeFileSync(resolve(adversarialRepository, "AGENTS.md"), "proof\n");
    const plan = __testOnly.createSelfTestShellPlan({
      repositoryRoot: adversarialRepository,
      token,
      storageProof: adversarialStorage,
    });

    assert.equal(plan.namedVolumeProof.length, 8);
    assert.deepEqual(plan.namedVolumeProof.slice(0, 5), ["sh", "-eu", "-c", plan.namedVolumeProof[3], "sh"]);
    assert.deepEqual(plan.namedVolumeProof.slice(5), [adversarialRepository, token, adversarialStorage]);
    assert.equal(plan.composeServer.length, 6);
    assert.deepEqual(plan.composeServer.slice(5), [token]);
    assert.equal(plan.communication.length, 6);
    assert.deepEqual(plan.communication.slice(5), [token]);
    for (const command of Object.values(plan)) {
      for (const value of [adversarialRepository, adversarialStorage, token]) {
        assert.equal(command[3].includes(value), false);
      }
      const syntax = spawnSync("/bin/sh", ["-n", "-c", command[3]], { encoding: "utf8" });
      assert.equal(syntax.status, 0, syntax.stderr);
    }

    const executable = __testOnly.fixedShellArgs('test -f "$1/AGENTS.md"; printf \'%s\\n\' "$2" > "$3"', [
      adversarialRepository, token, adversarialStorage,
    ]);
    assert.equal(executable.length, 8);
    assert.deepEqual(executable.slice(5), [adversarialRepository, token, adversarialStorage]);
    const executed = spawnSync(executable[0], executable.slice(1), { encoding: "utf8" });
    assert.equal(executed.status, 0, executed.stderr);
    assert.equal(readFileSync(adversarialStorage, "utf8"), `${token}\n`);
  } finally { rmSync(parent, { recursive: true, force: true }); }
});

test("binds both exact synthetic repository indexes and native arm64 children before runtime", () => {
  const [utility, server] = __testOnly.SELF_TEST_IMAGES;
  assert.equal(utility.reference, "alpine@sha256:14358309a308569c32bdc37e2e0e9694be33a9d99e68afb0f5ff33cc1f695dce");
  assert.equal(server.reference, "nginx@sha256:09cc2702709e6388d979d8030e3ab4eb1ceb699b2dced26d7543e872a822e823");
  assert.equal(__testOnly.SELF_TEST_NATIVE_PLATFORM, "linux/arm64/v8");
  for (const image of [utility, server]) {
    const indexDigest = image.reference.split("@")[1];
    const neutralInspection = { Descriptor: { digest: indexDigest }, RepoDigests: [image.reference] };
    const platformInspection = { Os: "linux", Architecture: "arm64", Variant: "v8", RepoDigests: [image.reference] };
    assert.deepEqual(validateSelfTestImageInspection({ role: image.role, neutralInspection, platformInspection }), {
      role: image.role, reference: image.reference, indexDigest, childDigest: image.childDigest,
    });
    assert.throws(() => validateSelfTestImageInspection({ role: image.role, neutralInspection: { ...neutralInspection, Descriptor: { digest: index } }, platformInspection }), /identity drifted/u);
    assert.throws(() => validateSelfTestImageInspection({ role: image.role, neutralInspection, platformInspection: { ...platformInspection, Architecture: "amd64", Variant: undefined } }), /identity drifted/u);
  }
  const archiveIndex = { manifests: [utility, server].map((image) => ({ digest: image.reference.split("@")[1] })) };
  const imageIndexes = Object.fromEntries([utility, server].map((image) => [image.reference.split("@")[1], {
    manifests: [{ digest: image.childDigest, platform: { os: "linux", architecture: "arm64", variant: "v8" } }],
  }]));
  assert.equal(validateSelfTestImageArchiveMetadata({ archiveIndex, imageIndexes }), true);
  imageIndexes[server.reference.split("@")[1]].manifests[0].digest = child;
  assert.throws(() => validateSelfTestImageArchiveMetadata({ archiveIndex, imageIndexes }), /server archive native child identity drifted/u);
});

test("plans one exact two-image archive and owner load with complete reference cleanup", () => {
  const archive = "/tmp/cwt-synthetic-images.tar";
  const custodyTag = `cwt.local/custody:${token}`;
  const plan = __testOnly.createSelfTestImageTransferPlan({ archive, tag: custodyTag });
  assert.deepEqual(plan.save, ["image", "save", "--output", archive, __testOnly.SELF_TEST_UTILITY_REFERENCE, __testOnly.SELF_TEST_SERVER_REFERENCE]);
  assert.deepEqual(plan.load, ["image", "load", "--input", archive]);
  assert.deepEqual(plan.cleanup, ["image", "rm", custodyTag, __testOnly.SELF_TEST_UTILITY_REFERENCE, __testOnly.SELF_TEST_SERVER_REFERENCE]);
  assert.deepEqual(plan.absence, [custodyTag, __testOnly.SELF_TEST_UTILITY_REFERENCE, __testOnly.SELF_TEST_SERVER_REFERENCE]);
});

test("generates one exact Nginx container-local healthy server with journald and no published surface", () => {
  const shellPlan = __testOnly.createSelfTestShellPlan({ repositoryRoot, token, storageProof: "/srv/cwt/staging/media/import/proof" });
  const definition = __testOnly.createSelfTestComposeDefinition({ image: __testOnly.SELF_TEST_SERVER_REFERENCE, command: shellPlan.composeServer });
  assert.equal(validateSelfTestComposeDefinition(definition, { image: __testOnly.SELF_TEST_SERVER_REFERENCE, command: shellPlan.composeServer }), true);
  assert.equal(definition.services.server.image, __testOnly.SELF_TEST_SERVER_REFERENCE);
  assert.match(shellPlan.composeServer[3], /\/usr\/share\/nginx\/html\/index\.html/u);
  assert.match(shellPlan.composeServer[3], /exec nginx -g 'daemon off;'/u);
  assert.equal(shellPlan.composeServer[3].includes(token), false);
  assert.equal(shellPlan.composeServer[3].includes("busybox"), false);
  assert.equal(shellPlan.composeServer[3].includes("httpd"), false);
  assert.equal(shellPlan.composeServer[3].includes("8080"), false);
  assert.equal(Object.hasOwn(definition.services.server, "volumes"), false);
  assert.deepEqual(definition.services.server.healthcheck.test, ["CMD", "curl", "--fail", "--silent", "--show-error", "--max-time", "2", "--output", "/dev/null", "http://127.0.0.1/index.html"]);
  assert.deepEqual(__testOnly.SELF_TEST_SERVER_READINESS_ARGS, ["up", "--detach", "--wait", "--wait-timeout", "30", "--pull", "never", "--no-build", "server"]);
  assert.deepEqual(definition.services.server.networks, ["private"]);
  assert.deepEqual(definition.networks, { private: { internal: true } });
  assert.deepEqual(definition.services.server.logging, { driver: "journald" });
  for (const mutate of [
    (value) => { value.services.server.volumes = [{ type: "bind", source: workspace, target: workspace }]; },
    (value) => { value.services.server.ports = ["80:80"]; },
    (value) => { value.services.server.network_mode = "host"; },
    (value) => { value.services.server.extra_hosts = ["server:127.0.0.1"]; },
    (value) => { value.services.server.dns = ["127.0.0.1"]; },
    (value) => { value.services.server.networks = { private: { ipv4_address: "172.30.0.2" } }; },
    (value) => { value.networks.second = { internal: true }; },
    (value) => { value.networks.private.external = true; },
    (value) => { value.services.server.image = "nginx:1.30.4"; },
  ]) {
    const mutation = structuredClone(definition); mutate(mutation);
    assert.throws(() => validateSelfTestComposeDefinition(mutation, { image: __testOnly.SELF_TEST_SERVER_REFERENCE, command: shellPlan.composeServer }), /server authority drifted/u);
  }
  for (const source of [
    `${shellPlan.composeServer[3]}; exec busybox httpd -f -p 8080`,
    `${shellPlan.composeServer[3]}; printf '%s' ${token}`,
  ]) {
    const mutation = structuredClone(definition);
    mutation.services.server.command[3] = source;
    assert.throws(() => validateSelfTestComposeDefinition(mutation, { image: __testOnly.SELF_TEST_SERVER_REFERENCE, command: mutation.services.server.command }), /server authority drifted/u);
  }
});

test("accepts only a running healthy server on the exact live internal network", () => {
  const networkName = `${token}-compose_private`;
  const serverId = "server-container-id";
  const endpointId = "endpoint-id";
  const server = {
    Id: serverId,
    Config: { Image: __testOnly.SELF_TEST_SERVER_REFERENCE },
    State: { Running: true, Health: { Status: "healthy" } },
    HostConfig: { LogConfig: { Type: "journald" }, PortBindings: {} },
    NetworkSettings: {
      Ports: { "80/tcp": null },
      Networks: {
        [networkName]: { NetworkID: "network-id", Aliases: [`${token}-compose-server-1`, "server"], EndpointID: endpointId, IPAddress: "172.30.0.2" },
      },
    },
  };
  const network = {
    Id: "network-id", Name: networkName, Internal: true,
    Containers: { [serverId]: { EndpointID: endpointId, IPv4Address: "172.30.0.2/16" } },
  };
  assert.deepEqual(validateSelfTestServerState({ server, network, networkName }), {
    running: true, health: "healthy", network: networkName, alias: "server", endpointId, ipAddress: "172.30.0.2", logging: "journald", publishedPorts: 0,
  });
  for (const mutate of [
    (value) => { value.server.State.Running = false; },
    (value) => { value.server.Config.Image = "nginx:1.30.4"; },
    (value) => { value.server.State.Health.Status = "unhealthy"; },
    (value) => { value.server.NetworkSettings.Networks[networkName].Aliases = [`${token}-compose-server-1`]; },
    (value) => { value.server.NetworkSettings.Networks[networkName].EndpointID = ""; },
    (value) => { value.server.NetworkSettings.Networks[networkName].IPAddress = ""; },
    (value) => { value.server.NetworkSettings.Networks.second = { Aliases: ["server"], EndpointID: "other", IPAddress: "172.31.0.2" }; },
    (value) => { value.server.HostConfig.LogConfig.Type = "json-file"; },
    (value) => { value.server.HostConfig.PortBindings = { "80/tcp": [{ HostPort: "8080" }] }; },
    (value) => { value.server.NetworkSettings.Ports["80/tcp"] = [{ HostPort: "8080" }]; },
    (value) => { value.server.NetworkSettings.Ports["8080/tcp"] = null; },
  ]) {
    const mutation = structuredClone({ server, network }); mutate(mutation);
    assert.throws(() => validateSelfTestServerState({ ...mutation, networkName }), /not ready|identity drifted/u);
  }
});

test("uses one bounded embedded-DNS retry lifecycle with per-attempt timeout and exact token result", () => {
  const script = __testOnly.SELF_TEST_COMMUNICATION_SCRIPT;
  assert.equal((script.match(/\bwhile\b/gu) ?? []).length, 1);
  assert.equal((script.match(/busybox wget/gu) ?? []).length, 1);
  assert.match(script, /wget -T 2 -qO- http:\/\/server\/index\.html/u);
  assert.match(script, /attempt.*-lt 10/u);
  assert.match(script, /test "\$body" = "\$1"/u);
  assert.match(script, /test "\$resolver" = 127\.0\.0\.11/u);
  assert.equal(/http:\/\/[0-9]/u.test(script), false);
  assert.equal(script.includes(":8080"), false);
  for (const forbidden of ["--dns", "extra_hosts", "/etc/hosts", "--add-host", "ipv4_address"]) assert.equal(script.includes(forbidden), false);
});

test("rejects projection mutations for raw paths, wrong journal address type and missing volume-nocopy", () => {
  const configRoot = "/tmp/cwt-config-payload";
  for (const mutate of [
    (plan) => { const indexValue = plan.journalStart.findIndex((value) => value.includes("UNIX-RECVFROM:")); plan.journalStart[indexValue] = plan.journalStart[indexValue].replace("UNIX-RECVFROM:", "UNIX-RECV:"); },
    (plan) => { const indexValue = plan.journalStart.findIndex((value) => value.includes("UNIX-RECVFROM:")); plan.journalStart[indexValue] += " Mountpoint"; },
    (plan) => { const indexValue = plan.journalStart.findIndex((value) => value.includes("nsenter -t 1")); plan.journalStart[indexValue] = plan.journalStart[indexValue].replace("nsenter -t 1", "exec nsenter -t 1"); },
    (plan) => { const indexValue = plan.journalStart.findIndex((value) => value.includes("child_pid=$!")); plan.journalStart[indexValue] = plan.journalStart[indexValue].replace("child_pid=$!", "child_pid="); },
    (plan) => { const indexValue = plan.journalStart.findIndex((value) => value.includes("trap cleanup")); plan.journalStart[indexValue] = plan.journalStart[indexValue].replace("trap cleanup EXIT TERM INT", "true"); },
    (plan) => { const indexValue = plan.configPopulate.findIndex((value) => value.includes(resources.configVolume)); plan.configPopulate[indexValue] = plan.configPopulate[indexValue].replace(",volume-nocopy", ""); },
  ]) {
    const source = createVolumeProjectionPlan({ resources, outerHost, configRoot, token });
    const plan = { ...source, configPopulate: [...source.configPopulate], storagePopulate: [...source.storagePopulate], journalStart: [...source.journalStart], journalProbe: [...source.journalProbe] };
    mutate(plan);
    assert.throws(() => validateVolumeProjectionPlan(plan, { resources, outerHost, configRoot }), /authority drifted/u);
  }
});

test("every owner helper mounts only the run API transport and contains no nsenter or TCP endpoint", () => {
  const helper = ownerHelperArgs({ resources, outerHost, mounts: [[repositoryRoot, true], [workspace]], args: ["image", "inspect", qualified] });
  const rendered = helper.join(" ");
  assert.equal(rendered.includes(`source=${resources.apiVolume},target=${resources.apiRoot}`), true);
  assert.equal(rendered.startsWith(`docker --host ${outerHost} run`), true);
  assert.equal(rendered.includes(`docker --host ${resources.ownerHost}`), true);
  assert.equal(rendered.includes("nsenter"), false);
  assert.equal(rendered.includes("tcp://"), false);
  assert.equal(rendered.includes("--privileged"), false);
  assert.deepEqual(ownerDockerArgs(ownerHost, ["image", "inspect", qualified]), ["docker", "--host", ownerHost, "image", "inspect", qualified]);
  assert.throws(() => ownerDockerArgs("tcp://127.0.0.1:2375", ["info"]), /private Unix socket/u);
});

test("accepts conventional moby namespaces only on the genuinely private exec-root address", () => {
  const outer = { address: "/run/containerd/containerd.sock", containersNamespace: "moby", pluginsNamespace: "plugins.moby" };
  assert.deepEqual(assertExclusiveStore(
    { address: `${resources.execRoot}/containerd/containerd.sock`, containersNamespace: "moby", pluginsNamespace: "plugins.moby" },
    outer,
    resources.execRoot,
  ), { socketIdentityClass: "private-containerd-socket", containerdAddressClass: "run-unique-exec-root", namespace: "moby", pluginsNamespace: "plugins.moby" });
  assert.throws(() => assertExclusiveStore(outer, outer, resources.execRoot), /shares the outer/u);
  assert.throws(() => assertExclusiveStore(
    { address: "/run/containerd/containerd.sock", containersNamespace: "cwt-private", pluginsNamespace: "plugins.cwt-private" },
    outer,
    resources.execRoot,
  ), /shares the outer/u);
});

test("rejects controller mutations for shared mounts, missing paths or volumes, TCP and host authority", () => {
  for (const mutate of [
    (plan) => { plan.controllerRun.splice(plan.controllerRun.indexOf(OWNER_DIND_REFERENCE), 0, "--pid", "host"); },
    (plan) => { plan.controllerRun.splice(plan.controllerRun.indexOf(OWNER_DIND_REFERENCE), 0, "--publish", "2375:2375"); },
    (plan) => { plan.controllerRun[plan.controllerRun.indexOf("none")] = "host"; },
    (plan) => { plan.controllerRun.splice(plan.controllerRun.indexOf(OWNER_DIND_REFERENCE), 0, "--mount", `type=bind,source=${workspace},target=${workspace}`); },
    (plan) => { plan.controllerRun.splice(plan.controllerRun.indexOf(OWNER_DIND_REFERENCE), 0, "--mount", "type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock"); },
    (plan) => { const indexValue = plan.controllerRun.findIndex((value) => value.includes("owner-containerd-data")); plan.controllerRun.splice(indexValue - 1, 2); },
    (plan) => { const indexValue = plan.controllerRun.findIndex((value) => value.includes("source=/srv/cwt")); plan.controllerRun.splice(indexValue - 1, 2); },
    (plan) => { plan.controllerRun[plan.controllerRun.findIndex((value) => value.startsWith("--host=unix://"))] = "--host=tcp://0.0.0.0:2375"; },
  ]) {
    const plan = mutableControllerPlan(); mutate(plan);
    assert.throws(() => validateOwnerControllerPlan(plan, { outerHost, repositoryRoot }), /controller plan|isolation boundary/u);
  }
});

test("requires inspect and complete timestamped logs before exact controller removal", () => {
  const plan = mutableControllerPlan();
  assert.equal(validateOwnerControllerPlan(plan, { outerHost, repositoryRoot }), true);
  plan.diagnostics.pop();
  assert.throws(() => validateOwnerControllerPlan(plan, { outerHost, repositoryRoot }), /diagnostics or cleanup order/u);
  const reordered = mutableControllerPlan();
  const waitIndex = reordered.cleanup.findIndex((command) => command.includes("wait"));
  const removeIndex = reordered.cleanup.findIndex((command) => command.includes("rm") && command.includes(resources.controller));
  [reordered.cleanup[waitIndex], reordered.cleanup[removeIndex]] = [reordered.cleanup[removeIndex], reordered.cleanup[waitIndex]];
  assert.throws(() => validateOwnerControllerPlan(reordered, { outerHost, repositoryRoot }), /diagnostics or cleanup order/u);
});

test("plans every release image and Compose operation through the one private owner", () => {
  const plan = createValidationPlan({ ownerHost, outerHost, releaseId: revision, indexDigest: index, childDigest: child, project: "cwt-release-proof" });
  assert.equal(plan.every((command) => command.endpoint === "owner" && command.argv[2] === ownerHost), true);
  assert.equal(plan.find((command) => command.operation === "compose-up").composeReference, qualified);
  assert.ok(plan.findIndex((command) => command.operation === "image-rm") > plan.findIndex((command) => command.operation === "zero-consumers"));
});

test("rejects tag-only Compose authority, outer deletion and early image cleanup mutations", () => {
  assert.throws(() => digestQualifiedReference("cwt.local/release", tag), /not the exact/u);
  const plan = [...createValidationPlan({ ownerHost, outerHost, releaseId: revision, indexDigest: index, childDigest: child, project: "cwt-release-proof" })].map((entry) => ({ ...entry, argv: [...entry.argv] }));
  const removal = plan.find((command) => command.operation === "image-rm");
  removal.endpoint = "outer";
  assert.throws(() => validateValidationPlan(plan, { ownerHost, qualified, tag }), /escapes the one explicit owner/u);
  removal.endpoint = "owner";
  const removalIndex = plan.indexOf(removal); plan.splice(removalIndex, 1); plan.splice(2, 0, removal);
  assert.throws(() => validateValidationPlan(plan, { ownerHost, qualified, tag }), /cleanup occurs before/u);
});

test("binds same-daemon index, native child and source revision exactly", () => {
  const neutral = { Descriptor: { digest: index }, RepoDigests: [qualified] };
  const platform = { Descriptor: { digest: child }, Config: { Labels: { "org.opencontainers.image.revision": revision } } };
  assert.equal(validateResolvedIdentity({ expectedIndex: index, expectedChild: child, expectedRevision: revision, neutralInspection: neutral, platformInspection: platform }), true);
  for (const mutation of [{ expectedIndex: `sha256:${"d".repeat(64)}` }, { expectedChild: `sha256:${"e".repeat(64)}` }, { expectedRevision: "f".repeat(40) }]) {
    assert.throws(() => validateResolvedIdentity({ expectedIndex: index, expectedChild: child, expectedRevision: revision, neutralInspection: neutral, platformInspection: platform, ...mutation }), /drifted/u);
  }
});

test("keeps harness/process and authenticated subject failures prospectively separate", () => {
  assert.deepEqual(classifyValidationFailure(new Error("daemon unavailable"), { gateOpen: false, cleanup: false }), { failureClass: "harness_pre_gate", revoke: false });
  assert.deepEqual(classifyValidationFailure(new Error("cleanup"), { gateOpen: true, cleanup: true }), { failureClass: "harness_cleanup", revoke: false });
  assert.deepEqual(classifyValidationFailure(__testOnly.subjectFailure(), { gateOpen: true, cleanup: false }), { failureClass: "subject", revoke: true });
});

test("cleanup never masks the primary error", async () => {
  const primary = new Error("primary setup failure");
  await assert.rejects(() => cleanupPreservingPrimary(primary, async () => { throw new Error("cleanup failure"); }), (error) => {
    assert.strictEqual(error, primary);
    assert.equal(error.cleanupFailure, "cleanup failure");
    return true;
  });
  assert.equal(await cleanupPreservingPrimary(undefined, async () => "clean"), "clean");
});

test("captures bounded server inspect, logs and network evidence before Compose teardown", () => {
  const evidenceRoot = mkdtempSync(resolve(tmpdir(), "cwt-self-test-diagnostics-"));
  const events = [];
  const networkName = `${token}-compose_private`;
  const serverId = "server-container-id";
  const clients = {
    owner(args) {
      events.push(`owner:${args.join(" ")}`);
      if (args[0] === "container" && args[1] === "inspect") return { status: 0, stdout: JSON.stringify([{ Id: serverId, State: { Running: true }, Config: {}, HostConfig: {}, NetworkSettings: {} }]), stderr: "" };
      if (args[0] === "logs") return { status: 0, stdout: "synthetic server log\n", stderr: "" };
      if (args[0] === "network" && args[1] === "inspect") return { status: 0, stdout: JSON.stringify([{ Id: "network-id", Name: networkName, Driver: "bridge", Internal: true, Labels: {}, Containers: {} }]), stderr: "" };
      if (args[0] === "network" && args[1] === "ls") return { status: 0, stdout: "", stderr: "" };
      throw new Error(`unexpected owner command: ${args.join(" ")}`);
    },
  };
  const compose = (args) => {
    events.push(`compose:${args.join(" ")}`);
    return { status: 0, stdout: "", stderr: "" };
  };
  const attempt = (action) => action();
  try {
    const diagnostics = __testOnly.finalizeSelfTestCompose({ clients, compose, evidenceRoot, networkName, serverId, attempt });
    assert.match(diagnostics.serverInspectSha256, /^[0-9a-f]{64}$/u);
    assert.match(diagnostics.serverLogSha256, /^[0-9a-f]{64}$/u);
    assert.match(diagnostics.networkInspectSha256, /^[0-9a-f]{64}$/u);
    for (const path of ["self-test-server-inspect.sanitized.json", "self-test-server.log", "self-test-network-inspect.sanitized.json"]) {
      assert.equal(existsSync(resolve(evidenceRoot, path)), true);
    }
    const downIndex = events.indexOf("compose:down --remove-orphans");
    assert.ok(downIndex > events.indexOf(`owner:container inspect ${serverId}`));
    assert.ok(downIndex > events.indexOf(`owner:logs --timestamps --tail 200 ${serverId}`));
    assert.ok(downIndex > events.indexOf(`owner:network inspect ${networkName}`));
  } finally { rmSync(evidenceRoot, { recursive: true, force: true }); }
});

test("readiness failure captures server evidence before teardown and never creates the client", () => {
  const evidenceRoot = mkdtempSync(resolve(tmpdir(), "cwt-self-test-readiness-failure-"));
  const events = [];
  const networkName = `${token}-compose_private`;
  const serverId = "failed-server-container-id";
  const clients = {
    owner(args) {
      events.push(`owner:${args.join(" ")}`);
      if (args[0] === "container" && args[1] === "inspect") return { status: 0, stdout: JSON.stringify([{ Id: serverId, State: { Running: false }, Config: { Image: __testOnly.SELF_TEST_SERVER_REFERENCE }, HostConfig: {}, NetworkSettings: {} }]), stderr: "" };
      if (args[0] === "logs") return { status: 0, stdout: "nginx readiness failure\n", stderr: "" };
      if (args[0] === "network" && args[1] === "inspect") return { status: 0, stdout: JSON.stringify([{ Id: "network-id", Name: networkName, Driver: "bridge", Internal: true, Labels: {}, Containers: {} }]), stderr: "" };
      if (args[0] === "network" && args[1] === "ls") return { status: 0, stdout: "", stderr: "" };
      throw new Error(`unexpected owner command: ${args.join(" ")}`);
    },
  };
  const compose = (args) => {
    events.push(`compose:${args.join(" ")}`);
    if (args[0] === "up") throw new Error("server did not become healthy");
    if (args.join(" ") === "ps --all --quiet server") return { status: 0, stdout: `${serverId}\n`, stderr: "" };
    return { status: 0, stdout: "", stderr: "" };
  };
  try {
    assert.throws(() => __testOnly.proveSelfTestComposeCommunication({
      clients, compose, networkName,
      shellPlan: __testOnly.createSelfTestShellPlan({ repositoryRoot, token, storageProof: "/srv/cwt/staging/media/import/proof" }),
      utilityTag: `cwt.local/custody:${token}`,
    }), /did not become healthy/u);
    const attempt = (action) => action();
    __testOnly.finalizeSelfTestCompose({ clients, compose, evidenceRoot, networkName, serverId: undefined, attempt });
    assert.equal(events.some((event) => event.startsWith("owner:run ")), false);
    const downIndex = events.indexOf("compose:down --remove-orphans");
    assert.ok(downIndex > events.indexOf(`owner:container inspect ${serverId}`));
    assert.ok(downIndex > events.indexOf(`owner:logs --timestamps --tail 200 ${serverId}`));
    assert.ok(downIndex > events.indexOf(`owner:network inspect ${networkName}`));
  } finally { rmSync(evidenceRoot, { recursive: true, force: true }); }
});

test("keeps root Compose positive singular and direct roles digest-qualified without published ports", () => {
  assert.deepEqual(__testOnly.EXACT_SERVICES, ["postgres", "valkey-production", "valkey-staging", "web-production", "web-staging"]);
  const args = __testOnly.directAppArgs({ name: "cwt-release-direct", platform: "linux/arm64", qualified });
  assert.ok(args.includes(qualified));
  assert.equal(args.some((value) => value === "--publish" || String(value).startsWith("-p")), false);
  const compose = __testOnly.composeArgs({ resources, outerHost, project: "cwt-release-proof", repositoryRoot, composeFile: `${repositoryRoot}/compose.yaml`, environment: {}, args: ["up", "--pull", "never", "--no-build"] });
  assert.equal(compose.join(" ").includes("nsenter"), false);
  assert.equal(compose.join(" ").includes(`source=${resources.apiVolume},target=${resources.apiRoot}`), true);
  assert.equal(compose.join(" ").includes(`source=${resources.configVolume},target=/etc/cwt,readonly,volume-nocopy`), true);
  assert.equal(compose.join(" ").includes("type=bind,source=/etc/cwt"), false);
});

test("synthetic workspace finalization preserves success and primary failure without residue", () => {
  const { parent, workspace: localWorkspace } = disposableWorkspace();
  const primaryResult = Object.freeze({ status: "primary-result" });
  try {
    const configRoot = __testOnly.createSyntheticConfiguration(localWorkspace, revision);
    for (const directory of [configRoot, resolve(configRoot, "postgres"), resolve(configRoot, "production"), resolve(configRoot, "staging")]) assert.equal(statSync(directory).mode & 0o777, 0o700);
    assert.match(readFileSync(resolve(configRoot, ".cwt-release-validation"), "utf8"), /synthetic release validation/u);
    const actualFiles = readdirSync(configRoot, { recursive: true }).filter((path) => statSync(resolve(configRoot, path)).isFile()).sort();
    const projection = createVolumeProjectionPlan({ resources, outerHost, configRoot, token });
    assert.deepEqual(actualFiles, [...projection.expectedConfig].sort());
    const result = (() => { try { return primaryResult; } finally { __testOnly.removeExactSyntheticWorkspace(localWorkspace); } })();
    assert.strictEqual(result, primaryResult);
    assert.equal(existsSync(localWorkspace), false);
  } finally { rmSync(parent, { recursive: true, force: true }); }

  const blocked = disposableWorkspace();
  const primaryError = new Error("synthetic blocked pre-gate assertion");
  let caught;
  try {
    __testOnly.createSyntheticConfiguration(blocked.workspace, revision);
    try { try { throw primaryError; } finally { __testOnly.removeExactSyntheticWorkspace(blocked.workspace); } } catch (error) { caught = error; }
    assert.strictEqual(caught, primaryError);
    assert.equal(existsSync(blocked.workspace), false);
  } finally { rmSync(blocked.parent, { recursive: true, force: true }); }
});
