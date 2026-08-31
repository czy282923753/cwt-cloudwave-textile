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
