# Local backup and restore operations

Status: local S6-06 implementation Candidate, not Stage 6 acceptance. Use PostgreSQL clients/server major 18 and Restic 0.19.1. No new database table, Worker, Lease, media lifecycle, snapshot catalogue or activation token is introduced.

## What is recoverable

`backup-postgresql [daily|pre-deploy]` makes a compressed custom dump, reads its catalogue **and entire payload**, records SHA-256, fsyncs files/directories and atomically renames the temporary slot. Only then does a daily backup replace the existing S6-05 `latest-complete.json`. Seven verified daily slots are retained; incomplete/corrupt/unknown slots never count and are preserved for operator investigation. Pre-deploy extras are outside the seven daily slots: preserve the deployment's extra through its rollback period, then explicitly dispose of obsolete extras after verifying current recovery sets. A daily dump alone is database recovery, not an earlier complete-site/media recovery point.

`backup-weekly` uses one read-only Repeatable Read PostgreSQL transaction: `pg_export_snapshot`, the existing Asset records' original keys/byte sizes/SHA-256, and `pg_dump --snapshot` observe the same database state. The transaction remains open while originals are copied. Every copied original must match the recorded byte size and SHA-256. A concurrent delete/overwrite causes refusal, never an unsupported live filesystem-snapshot claim. No producer is stopped or newly coordinated. Two database connections are required during the dump/copy, within the existing operations reserve; measure duration/load before activation.

The set contains the dump, nondeleted Public originals (including restricted/draft originals), retained ready or Inquiry-linked Private originals, and shipped non-secret Compose/proxy/schedule config plus source environment/release and path/permission metadata. It excludes derivative files, Import/internal staging, unattached incomplete Inquiry working uploads, logs, runtime.env, all credential files and the encryption key. Restoring transient DB workflow metadata does not recreate excluded working bytes or authorize release: keep workers stopped and resolve incomplete work through the existing Recovery/Cleanup authority. Public/private files remain separate and are never directly served by file path. Unknown data, rights, scan or relationships are not repaired by backup tooling.

The SHA-256 list, versioned set metadata and completion JSON are the approved backup-set manifest only. They are private files, not a new application evidence service. They detect corruption, not hostile replacement of both data and its checksums; protect the backup root and Restic credentials. `verify-backup-set` rejects unknown versions, path traversal, symlinks, missing/extra payloads, checksum/size disagreement and bad dump data.

## Scheduler and approved one-shots

Provision `/srv/cwt/backups/postgresql/{environment}` for `10001:10001`, mode `0700`; never bind this root to Web/Worker. The existing scheduler bind is writable and contains daily/pre-deploy slots, bounded working directories. Synthetic tests also use a temporary local Restic repository/cache; protected weekly execution currently refuses. The scheduler retains its environment-private secret/network boundary and resource limits. Every backup/retention entry takes the same OS file lock in that shared bind; no lock state is stored in the database and kernel exit releases it. The existing scheduler wrapper still refuses overlap among scheduled jobs.

Only approved one-shots may use the matching scheduler service definition. Do not grant Docker access to a container or bypass the existing host lifecycle/FD9 start gate. The root cron entries are daily at 03:31, weekly at 04:43 Sunday, and work-health every five minutes; verify timezone and independent scheduler-exit alerts before activation. Staging is normally stopped, so a stopped scheduler does not claim scheduled coverage.

For an approved deployment/Migration command, use:

```sh
/app/deploy/backup/pre-deploy node --import=tsx /app/scripts/migrate.ts
```

This creates a new extra dump and verifies it before invoking the command. Do not substitute an older completion marker, invoke the change after a nonzero status, or treat this example as host lifecycle/Production authorization.

`BACKUP_ENVIRONMENT=synthetic` requires `APP_ENV=test|local`, an explicit absolute `BACKUP_ROOT` outside `/srv/cwt`, and separate absolute Public/Private roots. Protected environment roots and database secret-file paths are fixed by the programs. Never print a URI/password or run shell tracing.

The current Restic entry requires **Synthetic/local-only** operation and refuses Production/Staging before dump/copy at `$BACKUP_ROOT/restic`, with the matching `BACKUP_REPOSITORY_PASSWORD_FILE`. Initialize that local repository once using Restic under the existing authorized operator custody. Backup performs full repository read-check and restore/read-back before retention. Retention forgets only excess verified snapshots of this exact environment/path/tag; at least four valid weekly sets remain, and invalid/unknown sets are not silently deleted. Prune runs only after verified forget and protects all still-referenced snapshots.

COS/offsite upload and protected Staging activation are not implemented or asserted by this local entry. Both existing scheduler networks are internal, so direct COS egress cannot work as currently composed. Resolving that boundary (for example an approved host-side Restic transfer of a sealed set, or an explicitly reviewed egress policy) is a coordinator decision; this task does not add an outbound network or host lifecycle action. Before O-20/O-23 external acceptance, the authorized operator must validate the COS private endpoint/egress, environment-specific repository and credentials, retention/failure alert behavior, and the existing protected restore/start procedure. Local encryption is not offsite resilience. Do not enable a weekly job and describe its local success as COS completion.

## Empty Synthetic restore

1. Verify the completed weekly set. If sourced from Restic, run `restic restore <exact-snapshot-id> --target <empty-private-export> --verify`, then `verify-backup-set <exported-set>`; never use an unverified latest snapshot by convenience.
2. Create a temporary **Linux network-none** PostgreSQL/container lab, no published ports, dedicated private socket/data mounts and a non-superuser/no-CREATEDB/no-CREATEROLE target owner. The target database name must begin `cwt_restore_`; it must have no user objects or other active connections. Only the Unix socket directory is shared with the restore client. Do not attach Production mounts or credentials.
3. Run `restore-empty <verified-weekly-set> <existing-empty-private-target-root>` from the same Candidate's `/app`, with only explicit `PGHOST` (absolute Unix socket directory), `PGDATABASE`, `PGUSER` and optional `PGPASSWORD`. It refuses non-Linux/non-loopback network interfaces, network DB targets, protected roots, nonempty roots/DBs and privileged roles before restoring data. Restore uses one transaction without source owners/ACLs and does not execute source config.
4. The client copies only manifest-selected originals to separate `public`/`private` roots with `0700` directories and `0600` files, compares the restored database's original inventory, and runs existing `verifyDatabaseReadiness` / `assertDatabaseReady` and `findPublicAssetForDelivery`. It rebuilds recorded derivative keys through the existing sequential image recipe and rejects format/size/dimension drift rather than changing database/Manifest authority. Private objects cannot resolve through public delivery.
5. Application verification runs with an empty inherited environment, fresh auth secret, `APP_ENV=test`, forced noindex, analytics disabled, a Synthetic mail sink/log driver and AI disabled. The network-none namespace is the enforced access protection. The tool starts no Web/Worker, emits no startup token and never sources the backed-up config. If any stage fails, keep the target isolated; source backups are preserved. DB restore failures roll back; later verification failures leave an isolated incomplete target for inspection. Recreate the disposable target for a clean retry.
6. Protected Staging needs its own fresh credentials, accepted configuration, Access and lifecycle gate plus full scanner/media/SMTP/provider validation before any start. This local verification result does not authorize that step.

Permissions are restored to the existing application UID/GID by running the client as `10001:10001`, not by running a privileged restore or reviving original host identities. Excluded variants are regenerated only when the recorded recipe matches; a mismatch is a stopped restore needing review. No rescan result, public permission, Product evidence, Publish or Index state is inferred.

## Local executable test

`integration.test.mjs` runs the complete repository Migration chain and Synthetic seed against real PostgreSQL 18.4, then executes the real shell tools, Restic encryption/read-back, negative retention/deploy tests and actual isolated restore. `run-local-tests.sh` owns and removes its uniquely named test server and three volumes. The Linux dependency volume is setup-only and reusable; source is mounted read-only during the test.

Use `Dockerfile.test` only to prepare disposable test tools, never as a CWT release. It uses the observed cached PostgreSQL 18.4/Node 24.14.0 images and the same Restic version/checksums as runtime acquisition. Download/install happens before the network-none test:

```sh
docker build -f deploy/backup/Dockerfile.test -t cwt-backup-test:local .
docker volume create cwt-backup-test-deps
docker run --rm -v "$PWD:/app" -v cwt-backup-test-deps:/app/node_modules -w /app \
  cwt-backup-test:local pnpm install --frozen-lockfile
CWT_BACKUP_TEST_IMAGE=cwt-backup-test:local \
CWT_BACKUP_TEST_DEPS=cwt-backup-test-deps \
  deploy/backup/run-local-tests.sh
```

Remove the setup image/dependency volume when no longer needed. The test runner removes only its own unique disposable database/socket/files volumes, including on failure.

The runtime Dockerfile copies its PostgreSQL client library closure and checksum-pinned Restic binary through the existing acquisition bundle and packages the scripts/config. An already emitted image remains unchanged. Packaging tests are distinct from a full successor image/Runtime validation.

## Recovery objectives, capacity and unresolved external evidence

Before launch, the Owner must approve separate database-loss and whole-site/host-loss RPOs, RTO, an operator and restore access. Keep daily/weekly frequency unchanged until that decision. The approved 60 GB budget must accommodate seven daily dumps, deployment extras, original media, the weekly work copy and one read-back scratch set; the four-snapshot local Restic repository/cache is Synthetic-only and is not automatically added to the protected host; local tests do not prove target-host headroom or timing. O-18 relocation scope and the 2 vCPU/4 GB limits are unchanged. Validate COS/offsite durability, target-host pressure/timing, operator access, independent alerts and protected Staging restore externally before acceptance.
