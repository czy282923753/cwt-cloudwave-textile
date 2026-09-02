# CWT protected host activation contract

This directory is a Stage 6 implementation hook, not permission to mutate a protected host. Installation, Docker/systemd changes, registry access and deployment remain Stage 7 HOLD.

## Singular topology and release identity

`compose.yaml` is the sole topology authority. Every application role uses one immutable `CWT_IMAGE_REFERENCE` whose value is a repository plus the accepted OCI **index digest**. `CWT_IMAGE_INDEX_DIGEST` and the host-architecture `CWT_IMAGE_CHILD_DIGEST` must match the immutable Option F release record. Tags are convenience only and cannot satisfy activation.

The static foundation pins Nginx `1.30.4` at index `sha256:09cc2702709e6388d979d8030e3ab4eb1ceb699b2dced26d7543e872a822e823`, PostgreSQL `18.4-bookworm` at index `sha256:882236b897e39051d2368c5ccc6cda944904723506b2dfc97f2a8f5bc9afa382`, and Valkey `8.1.9` at index `sha256:f0ba225266310efba5fb33383e21c64fbd07907304224786c780606e7ebd7327`. Version/digest changes require reviewed evidence; tags alone never float.

The ordinary default is exactly `proxy`, `web-production`, `scheduler-production`, `postgres` and `valkey-production`. `worker-production` exists only under the dormant `production-ai` profile with restart `no`. The on-demand `staging` profile contains exactly `web-staging`, `worker-staging`, `scheduler-staging` and `valkey-staging`. Starting both profiles is unauthorized.

Every application role uses explicit `SIGTERM` with a 30-second Compose stop grace period. This preserves the accepted Worker drain and post-abort window; shortening the grace period is a deployment refusal.

## Protected installation

Future authorized activation installs verified, root-owned bytes as follows:

- Ubuntu Noble `bash-static 5.2.21-2ubuntu4` at `/usr/bin/bash-static`; accepted SHA-256 is `ea3065d65dd07162e42e6db082103ef7dda0578436f15da76ff17be7b31cf671` for amd64 and `923600157c5ec8cbd17c45127cbf34c766ad401722ceb0f0661f2a287538be47` for arm64.
- `deploy/scripts/preflight-staging.sh` at `/usr/local/sbin/cwt-staging-start`, root:root, regular file, mode `0555`, link count one.
- `deploy/scripts/preflight-compose-graph.mjs` at `/usr/local/libexec/cwt/preflight-compose-graph.mjs`, root:root, regular file, mode `0444`, link count one.
- The byte-identical root `compose.yaml` at `/etc/cwt/compose.yaml`, root:root, regular file, mode `0444`, link count one. This installed copy is not a second authority; activation rejects a hash mismatch.
- `/etc/cwt/compose.env` contains reviewed non-secret values and exact immutable digest inputs only; it contains no `DOCKER_*`, `COMPOSE_*` or secret value. Environment-private secrets stay in root-readable files under `/etc/cwt/production`, `/etc/cwt/staging` and `/etc/cwt/postgres`.
- The root Compose anchors map the protected parser's exact ten secret-file classes one-to-one for every Web, Worker and Scheduler role. Each environment owns separate database URL, auth/session, scanner, Valkey, SMTP, monitoring, AI, COS access-key ID, COS secret key and backup-password subjects; runtime env files do not supply literal values or redirect one class to another file.
- `cwt-tmpfiles.conf` and `docker.socket.d/cwt-root-only.conf` retain the one root principal, one FD9 lock and root-only local Docker socket.

Activation records exact source/installed hashes, tool/package identities, architecture, release/index/child identities and config hashes in the protected activation manifest before exposing the gate. It must not download, build or infer an image on the application host.

## Only authorized Staging start

After the Production Scheduler has returned healthy and has been intentionally paused, the only repository-authorized start is the zero-argument installed gate:

```text
/usr/local/sbin/cwt-staging-start
```

Do not document or execute a raw `docker compose ... up/create/start`, service selector, profile override or second launcher. The gate rejects caller `DOCKER_*`/`COMPOSE_*` state, validates the exact graph and 1408 MiB threshold, holds one nonblocking FD9 lock through one exact four-service lifecycle action, and rechecks post-state. `INT`, `TERM` and `HUP` are deferred until that action settles and return `130`, `143` and `129` after post-state observation.

Never send `SIGKILL` to the gate, its lifecycle child, their process groups or all FD9 holders. If every holder is nevertheless lost, do not run the gate or any local recovery action again. Stop lifecycle activity, preserve read-only process/journald/Docker-event/Engine evidence, report and escalate. No timer, event quiet period, snapshot, rollback observation or human/machine `PASS` authorizes same-host re-entry.

## Registry, replica and loss

External activation requires a private registry that enforces immutable digest storage, deny-overwrite and deny-early-delete policy, least-read audited access and retention of the complete OCI graph. A separately access-controlled protected replica must retain the graph and every detached digest-bound SBOM, scan, provenance, release and transition record. Evidence artifacts remain detached and never add manifests to the canonical index.

Rollback selects a previously retained, independently accepted index plus matching evidence and exact validated child. A rejected subject remains revoked. If all copies of a subject or required evidence are lost, the only disposition is `NEW_RELEASE_REQUIRED`: authorize a new source identity, perform one new build, repeat Staging validation and obtain a new promotion record. Never rebuild under the old release record or promise the same digest.

## Health, monitoring and bounded logs

Application liveness is the process-only `/api/health/live/` route. Application readiness is the single `/api/health/ready/` authority and checks protected configuration, the three approved local storage roots, one bounded database query, the accepted Valkey canary/script and required local runtime dependencies. It never calls Cloudmersive, Sentry, AI, SMTP, Tencent, an uptime service or any other external Provider. The root Production and Staging protected environment maps are the sole application bind authority and set exact `HOSTNAME=0.0.0.0`; the unchanged Next standalone command therefore listens on all container interfaces, while both unchanged Compose Web healthchecks reach the singular readiness route at exact loopback `http://127.0.0.1:3000/api/health/ready/`. Do not add a service-only override, wrapper, alternate health URL or hostname-derived target.

The scheduler's Notification Outbox one-shot also evaluates the redacted work-health authority. Exit `0` means healthy, exit `2` means an observed Outbox backlog/repeated failure/dead row, terminal AI Worker work, or missing/stale/invalid daily-backup completion evidence, and exit `1` means the probe itself failed. Only fixed state names and aggregate counts enter journald. The Production and Staging schedulers receive read-only access only to their own `/srv/cwt/backups/postgresql/{environment}` completion-evidence root.

Docker services retain the `journald` logging driver. `deploy/monitoring/journald-cwt.conf` is the single future host policy template: persistent compressed/sealed journals, 14-day maximum retention, 4 GiB maximum use and one-day file segments. `deploy/monitoring/monitoring-policy.v1.json` contains provider-neutral thresholds only. Installing either template, configuring a monitoring account or testing external delivery requires separate protected-host/Stage 7 authority and has not occurred here.

Rollback may disable only an optional external monitoring adapter. It may not disable readiness, safe local logs, resource ceilings, scheduler exit semantics or the image-work semaphore.

## Local exact-subject release validation

### Validation Simplification V1.1 Linux Runner entry

`deploy/scripts/preflight-linux-runtime.mjs` is the sole provider-neutral entry boundary prepared for a future Formal Runtime Validation run on one CWT-controlled, VM-backed, single-use ephemeral Ubuntu 24.04 LTS native `linux/amd64` CI Runner. The enclosing approved CI lifecycle must create an independent VM for that run and destroy it after this entry has attempted teardown. This repository does not select a Provider, provision a Runner, acquire Registry credentials or prove VM destruction.

The entry requires host Docker Engine and the standard Compose plugin, rejects DIND/containerized/shared Runner state, fixes every Docker and Compose invocation to `unix:///var/run/docker.sock`, and requires that local path to be a Unix socket. Caller `DOCKER_HOST`, `DOCKER_CONTEXT` and other `DOCKER_*`/`COMPOSE_*` selectors are rejected. An injected `DOCKER_CONFIG` is used only for future private-Registry credentials; its current context cannot redirect the fixed endpoint. The entry records actual OS/architecture/Engine/Compose identities and matches them only to the repository-tracked `deploy/runtime-validation/linux-amd64-compatibility.v1.json`; there is no runtime profile override. Version changes update that one reviewed source authority and do not create a second runtime path. Credentials are never accepted as CLI arguments or written to evidence.

The exact invocation contract is:

```text
node deploy/scripts/preflight-linux-runtime.mjs validate \
  --release /protected/release-evidence/release.json \
  --oci /protected/release-evidence/subject.oci \
  --image private-registry.example/cwt/application@sha256:<exact-index> \
  --evidence /protected/validation-evidence/<absent-run-directory> \
  --token <run-unique-safe-token>
```

The OCI layout is read-only input to the existing `preflight-image.mjs` evidence authority; it is never loaded into Docker and is not an image-transfer route. The CWT subject enters the host Engine only through the private Registry exact-digest pull. The entry rejects tags and malformed references and contains no save/load, OCI tar, temporary-tag or host-transfer fallback.

After existing image/evidence/lifecycle, Compose-graph and public-bundle authorities pass, the entry uses the unchanged root `compose.yaml`, real `/etc/cwt/staging/runtime.env`, real-shaped secret mounts and isolated Synthetic storage. Root owns the `/etc/cwt` parent directories at mode `0700`; `runtime.env` stays root-readable mode `0400` for the root Compose CLI; file-backed secret leaves are root-owned mode `0444` so the unchanged UID `999:999` PostgreSQL/Valkey and UID `10001:10001` Web services can read only the secret files explicitly bind-mounted by their existing Compose allowlists. Secret values remain absent from environment literals, images, Git, logs and evidence. The entry starts only `postgres`, `valkey-staging` and `web-staging`, applies the existing migration set through a disposable `web-staging` Compose run, and requires service Health, live/readiness `200`, root `200`, noindex, exact index/`linux/amd64` child, non-root/read-only execution and zero published ports. Output is only sanitized `PASS` or `NOT_PASS`; there is no automatic retry, classifier, revocation or lifecycle transition.

This entry is implementation-only until its required independent Review passes and a later run is separately authorized. It makes no Build Once, Registry custody, Provider, Runner provisioning/destruction, Runtime Validation, promotion or protected-environment claim.

### Frozen Private DIND compatibility surface

`deploy/scripts/preflight-release-compose.mjs` is the retained versioned local/Synthetic post-emission validator described by the frozen prior record. It is not a protected-host activation path. Given one explicit `--outer-host` Unix endpoint and one safe run token, the validator creates and owns exactly one ephemeral private DIND controller from `docker:29.6.2-dind@sha256:bfec1f5159c63a81ca6fdedbd81404d2c0e16378ed0feec3bb3fbf3998847659`. The controller is privileged but joins outer `--network none`, publishes no port, mounts no host Docker/containerd socket and uses six run-exact named volumes for its Unix API, Docker data, containerd data, Synthetic configuration, Synthetic storage and journal socket. It is never started with `--rm`, so first-run inspect/log evidence survives until exact cleanup.

The Private DIND surface is **FROZEN / NO FURTHER EVOLUTION**. Validation Simplification V1.1 does not invoke, patch, expand or use it for new evidence. It is not declared deprecated or removed by this implementation. Any later state change and one bounded cleanup require implementation completion, one Fresh Independent Implementation / Operations / Security Review `PASS`, one successful real exact-digest Linux Runtime Validation and separate authorization.

All owner helpers mount the run-unique API volume and only the additional named volume genuinely needed by their operation; they address `unix:///run/cwt-owner-api/docker.sock`. There is no external `--owner-host`, TCP listener, host-network owner `nsenter`, context fallback or compatibility path. Repository and workspace remain the only macOS binds. Pinned network-none population helpers copy configuration from the workspace into the config volume and create storage closure in the storage volume; the controller mounts them with `volume-nocopy` at `/etc/cwt` read-only and `/srv/cwt` read-write. No raw Docker volume Mountpoint is accessed.

The exact disposable journal helper mounts the journal volume, uses `--pid host`, and runs the already-present Docker Desktop VM-host `socat` through its bounded helper-process root with `UNIX-RECVFROM:<helper-root>/run/systemd/journal/socket,fork`. A second ordinary volume mount proves socket readiness. The controller mounts that volume with `volume-nocopy` at `/run/systemd/journal`, preserving the root Compose `journald` driver without creating a VM-host directory or introducing another image/package.

Before a successor Build Once, verify the already-local exact DIND index/child/version and retain that pinned base image. Run `self-test` exactly once with explicit `--outer-host`, run-unique `--token` and an absent absolute `--evidence` directory. The self-test imports only local `alpine:3.22` through the owner and proves named-volume config mode/closure, UID/GID `10001:10001` storage write, volume-backed journald emission, repository/workspace binds, Unix API/private store/outer invisibility, one internal Compose network, zero published ports and inner communication. It captures DIND and journal-helper diagnostics/hashes before removal and proves zero exact controller, helper, six volumes, socket, Compose and workspace residue. It does not load or run a CWT subject and must not be rerun after failure without new coordinator authority.

After one successful Build Once, run `validate` exactly once against the new `release.json` and OCI layout. The validator independently verifies the `built` record and absence of revocation, imports only through the owner, resolves `cwt.local/release@sha256:<index>`, binds the native child and `org.opencontainers.image.revision`, then opens the subject gate. Root `compose.yaml` is the only positive Compose file; `--pull never --no-build` is mandatory. The exact five-service positive is PostgreSQL, both Valkeys and both Web services. Direct coverage retains only the non-native Web positive, native readiness negatives and non-overlapping Worker/Scheduler/one-shot signal checks.

Compose consumers and networks are removed before the owner removes the release reference. Controller and journal-helper inspect/log evidence is captured before controller stop/wait/removal, exact helper removal and deletion of all six named volumes; workspace removal is last. Cleanup failure never masks the primary failure. A harness/setup or cleanup failure blocks but does not revoke. An exact subject assertion failure after gate-open invokes the existing immutable revocation path. Success leaves the release `built`, unrevoked and untransitioned for independent Review; this validator never appends `staging_validated` or `promotion_authorized`.
