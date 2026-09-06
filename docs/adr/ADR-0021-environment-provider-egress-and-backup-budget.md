# ADR-0021: Environment Provider Egress and Backup Execution Budget

Status: **Owner-approved for local implementation, 2026-09-06.** Owner instruction: “批准方案A和建议”, relayed by coordinator `01a07293-8be4-7170-ae64-7a22347e5184`, with the explicit **15/30** connection-budget amendment. Independent Review, coherent release integration and external operations remain separately gated. This is not Stage 6 acceptance.

## Reason and scope

The existing internal-only application networks prevent the approved scanner/SMTP/Staging AI/COS paths from reaching Providers. The local S6-06 Candidate also needs a protected repository path and proportionate verification. The [original proposal](../PHASE_1B_STAGE6_PROVIDER_EGRESS_BACKUP_DECISION_PROPOSAL.md) remains decision history; its Scheduler-slot-borrowing recommendation is superseded by this ADR.

## Approved decisions

- Create ordinary Compose-managed `production-outbound` and `staging-outbound` bridges, `internal: false`, with explicit gateway selection. Attach Production Web/Scheduler to the former, Staging Web/Scheduler/AI Worker to the latter. Production AI stays dormant and internal. Keep PostgreSQL/cache/ingress internal, current secret grants and proxy published ports unchanged. No shared/global external network, host networking, new public port or egress proxy.
- This is general outbound routing, not a hostname allowlist. Preserve private cross-environment denial, including host-gateway bypass, through ordinary network isolation and existing host/proxy controls. Provider TLS/data-policy/authorization and Staging envelope rules remain unchanged.
- Protected weekly backups use the matching private COS repository via existing environment-specific secret files, with no local fallback. Public originals and Private Inquiry files remain separate; temporary/import/derivative files and credentials are excluded. Protected work/read-back/cache uses `/srv/cwt/backups/sets/{environment}`; daily DB backups/completion use `/srv/cwt/backups/postgresql/{environment}`.
- Verify the exact NEW snapshot by one full read-back and existing set/payload checks. Run one full repository byte-integrity pass. For older sets, validate existing metadata/tree/manifest closure instead of restoring every payload again. Keep four valid weekly and seven valid daily sets; unknown/incomplete/corrupt sets do not count or displace the last valid set. Use standard prune; post-admission maintenance failures remain separately observable and do not misreport the verified backup as failed.
- Existing application allocation is **13**. Weekly snapshot export and pg_dump own **two** simultaneous connections, total **15** of PostgreSQL `max_connections=30`, leaving **15** for internal/health/operator/restart reserve. No idle-Scheduler borrowing or extra pause choreography. Daily/pre-deploy dump uses one connection. No simultaneous environment backups and no backup/Migration overlap; acquire the existing OS lock before any database probe.

## Serialization and proportional complexity

The existing per-environment `.backup.lock` inode cannot serialize two environments or the Migration entry point. Move/converge that same Linux `flock` mechanism to one root-provisioned **empty, non-secret** `/run/lock/cwt/backup-migration.lock`, mounted as a read-only file at `/run/cwt/backup-migration.lock` into schedulers/approved one-shots only. It carries no durable status or credentials; the kernel releases ownership when descriptors close. No shared backup/data root or cross-database grant is introduced. Retire per-environment lock acquisition. Direct Migration CLI participation happens before importing/opening the database; the pre-deploy command inherits the held descriptor, so backup then Migration run serially within one existing command path. The host lifecycle FD9 lock remains separate and unchanged. No new host lifecycle wrapper, Worker, Lease, queue, table, persistent state machine or Scheduler pause policy is added.

## Impact, compatibility and rollback

Affected modules: root Compose and shared topology assertions; narrow backup programs; direct Migration CLI lock participation; host file-provisioning template and operational docs/tests. No Schema/Migration data change, Product/Company Fact, URL/SEO/Canonical/Redirect, public media lifecycle or Provider-data-policy change. Existing set-v1 backups remain readable; old work paths are recognized for metadata verification without overwriting/deleting backups. Unknown versions refuse.

Rollback the matched network/config/program/validator Candidate together. Keep every valid backup and protected storage root. Provider calls fail closed if outbound routing is removed. Never combine this writable-mount/network validator with the old immutable Runtime subject; the closed Runtime repair and its pinned tooling remain untouched. No deployment, image emission, cloud change or Production data use follows from this ADR.

## Verification and limits

Use normalized Compose membership/gateway/port tests and controlled local DNS/TCP/TLS peers for outbound/private isolation. Use actual PostgreSQL/Restic tools for two-session and lock-refusal observation, checksum/corrupt/missing retention paths and one representative application restore. Local fixtures do not prove COS behavior, target-host firewall/capacity/timing or RPO/RTO. Peak temporary space still includes a set plus one read-back; illustrative traffic estimates are not measured savings. O-18 and 2 vCPU/4 GB/60 GB limits remain unchanged. Exact Bookworm packaging coverage remains explicitly unavailable until its unchanged pin is locally available; no repeated pull loop is authorized. Independent monitoring transport is still the S6-05/Stage 7 integration responsibility.
