# Local backup and restore operations

Status: local S6-06 implementation Candidate, not Stage 6 acceptance. Use PostgreSQL clients/server major 18 and Restic 0.19.1. No new database table, Worker, Lease, media lifecycle, snapshot catalogue or activation token is introduced.

## What is recoverable

`backup-postgresql [daily|pre-deploy]` makes a compressed custom dump, reads its catalogue **and entire payload**, records SHA-256, fsyncs files/directories and atomically renames the temporary slot. Daily retention first protects that exact admitted set regardless of clock ordering, retaining it plus up to six other newest valid sets; only then does the command replace the existing S6-05 `latest-complete.json`. Standalone daily retention protects the verified set corresponding to the current health marker and refuses deletion when that correspondence is absent. Incomplete/corrupt/unknown slots never count and are preserved for operator investigation. Pre-deploy extras are outside the seven daily slots: preserve the deployment's extra through its rollback period, then explicitly dispose of obsolete extras after verifying current recovery sets. A daily dump alone is database recovery, not an earlier complete-site/media recovery point.

`backup-weekly` uses one read-only Repeatable Read PostgreSQL transaction: `pg_export_snapshot`, the existing Asset records' original keys/byte sizes/SHA-256, and `pg_dump --snapshot` observe the same database state. The transaction remains open while originals are copied. Every copied original must match the recorded byte size and SHA-256. A concurrent delete/overwrite causes refusal, never an unsupported live filesystem-snapshot claim. No producer is stopped or newly coordinated. Two database connections are required during dump/copy: application allocation 13 + weekly backup 2 = **15/30**, leaving 15 reserve under [ADR-0021](../../docs/adr/ADR-0021-environment-provider-egress-and-backup-budget.md). Do not borrow a Scheduler slot or pause it merely to report 14. No parallel environment backup or backup/Migration overlap is permitted; measure duration/load before activation.

The set contains the dump, nondeleted Public originals (including restricted/draft originals), retained ready or Inquiry-linked Private originals, and shipped non-secret Compose/proxy/schedule config plus source environment/release and path/permission metadata. It excludes derivative files, Import/internal staging, unattached incomplete Inquiry working uploads, logs, runtime.env, all credential files and the encryption key. Restoring transient DB workflow metadata does not recreate excluded working bytes or authorize release: keep workers stopped and resolve incomplete work through the existing Recovery/Cleanup authority. Public/private files remain separate and are never directly served by file path. Unknown data, rights, scan or relationships are not repaired by backup tooling.

The SHA-256 list, versioned set metadata and completion JSON are the approved backup-set manifest only. They are private files, not a new application evidence service. They detect corruption, not hostile replacement of both data and its checksums; protect the backup root and Restic credentials. `verify-backup-set` rejects unknown versions, path traversal, symlinks, missing/extra payloads, checksum/size disagreement and bad dump data.

## Scheduler and approved one-shots

Provision `/srv/cwt/backups/postgresql/{environment}` and `/srv/cwt/backups/sets/{environment}` for `10001:10001`, directories `0700` and files `0600`. The former contains daily/pre-deploy slots and the health event; the latter contains one weekly work set, one read-back scratch set and Restic cache. Both mounts are environment-private and available only to Scheduler/approved one-shots. Web/Worker receive no backup mount.

Provision the empty root-owned `/run/lock/cwt/backup-migration.lock` with mode `0444` using the shipped tmpfiles template. Mount this file read-only at `/run/cwt/backup-migration.lock` into approved maintenance containers. Every backup/retention entry and direct protected Migration CLI takes this SAME Linux `flock` before any database probe; exit 75 means busy. `pre-deploy` retains descriptor 8 through its nested backup and Migration. This replaces per-environment backup locks; no database/stale-lock state is added. Do not replace/unlink the inode while any maintenance process is alive. Kernel close/exit releases ownership. The host lifecycle FD9 lock and ordinary Scheduler-job overlap refusal remain unchanged.

ADR-0021 adds a separate ordinary outbound bridge per environment, with `gw_priority: 1`: Production Web/Scheduler and Staging Web/Scheduler/AI Worker only. Database/cache/ingress remain internal; Production AI Worker remains dormant/internal. This enables general Provider routing, not a hostname allowlist. Ports, credentials, resource limits and protected lifecycle authority are unchanged.

Only approved one-shots may use the matching scheduler service definition. Do not grant Docker access to a container or bypass the existing host lifecycle/FD9 start gate. The root cron entries are daily at 03:31, weekly at 04:43 Sunday, and work-health every five minutes; verify timezone and independent scheduler-exit alerts before activation. Staging is normally stopped, so a stopped scheduler does not claim scheduled coverage.

For an approved deployment/Migration command, use:

```sh
/app/deploy/backup/pre-deploy node --import=tsx /app/scripts/migrate.ts
```

This creates a new extra dump and verifies it before invoking the command. Do not substitute an older completion marker, invoke the change after a nonzero status, or treat this example as host lifecycle/Production authorization.

`BACKUP_ENVIRONMENT=synthetic` requires `APP_ENV=test|local`, an explicit absolute `BACKUP_ROOT` outside `/srv/cwt`, an existing `BACKUP_LOCK_FILE` shared by all local maintenance invocations, and separate absolute Public/Private roots. `BACKUP_WORK_ROOT` defaults to `${BACKUP_ROOT}-sets`. Protected environment roots and database secret-file paths are fixed by the programs. Never print a URI/password or run shell tracing.

For protected weekly operation set the NON-SECRET `BACKUP_COS_REPOSITORY` in the matching approved runtime configuration to `s3:https://cos.ap-singapore.myqcloud.com/<approved-bucket-with-account-suffix>/<environment>`. The final prefix must be exactly `production` or `staging`. Existing exact `COS_ACCESS_KEY_ID_FILE`, `COS_SECRET_ACCESS_KEY_FILE` and `BACKUP_REPOSITORY_PASSWORD_FILE` grants provide credentials; no new secret class is added. The executable refuses wrong/missing repositories or secret paths with **no local fallback**. Mounted database URIs are translated into child-only libpq environment fields; credentials never enter command arguments. Unknown URI parameters refuse. Synthetic mode accepts only `$BACKUP_ROOT/restic`.

Initialize each repository once using the standard Restic CLI under the separately approved operator custody, with matching password file and COS key environment supplied from existing secret files. Initialization is not an automatic Scheduler action. Never run `init` as a remedy for a missing/unreachable established repository.

Each weekly invocation reads back and fully validates its **exact new snapshot once**, then runs one repository-wide `restic check --read-data`. Older snapshots receive tree/metadata/manifest closure checks, not repeated full payload restores. Keep four valid weekly sets. Unknown/incomplete sets are preserved and excluded; repository corruption blocks all retention. `forget` removes only excess valid snapshots, then standard `prune` and structural check run. The newly verified set is retained even with bad clock ordering. Before successful read-back, failure exits 1 and preserves existing sets. After admission, repository/retention failure exits 2 with an explicit **verified set; maintenance failed** message; investigate/retry maintenance instead of assuming the new backup failed. All nonzero exits need independent alerts. Existing invalid sets occupy space until operator disposition.

COS durability, private policy/credentials, target-host egress/firewall behavior, independent alerts and protected restore/start remain External Validation Required before O-20/O-23 acceptance. Local TLS/S3 fixtures validate the executable branch, not real COS semantics.

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

Before launch, the Owner must approve separate database-loss and whole-site/host-loss RPOs, RTO, an operator and restore access. Keep daily/weekly frequency unchanged until that decision. The approved 60 GB budget must accommodate seven daily dumps, deployment extras, original media, the weekly work copy and one read-back scratch set; the four-snapshot local Restic repository is Synthetic-only and is not allocated on the protected host. Protected Restic cache stays in the work root; local tests do not prove target-host headroom or timing. O-18 relocation scope and the 2 vCPU/4 GB limits are unchanged. Validate COS/offsite durability, target-host pressure/timing, operator access, independent alerts and protected Staging restore externally before acceptance.

## Repeating the bounded local checks

Use the existing cached `cwt-s606-tools:local` tool image and `cwt-s606-deps` Linux dependency volume as described above. Prepare the optional test-only Moto dependency once from public packages (outside the isolated test), using an already available Python image:

```sh
docker volume create cwt-s606-moto-deps
docker run --pull never --rm -v cwt-s606-moto-deps:/deps python:3.13-slim \
  pip install --disable-pip-version-check --target /deps 'moto[server]==5.1.6'
```

Then run:

```sh
CWT_BACKUP_TEST_IMAGE=cwt-s606-tools:local CWT_BACKUP_TEST_DEPS=cwt-s606-deps CWT_BACKUP_MOTO_DEPS=cwt-s606-moto-deps deploy/backup/run-local-tests.sh
CWT_BACKUP_TEST_IMAGE=cwt-s606-tools:local node --test deploy/backup/network-local.test.mjs
node --test deploy/backup/repository.test.mjs
```

The optional S3 fixture uses cached `python:3.13-slim`, an internal-only Docker network, a one-day local TLS certificate and conspicuous dummy secrets. It tests protected-shaped mounts inside disposable containers; it never mounts host protected paths, publishes a port or reaches a Provider. The network peer test copies normalized Candidate membership/gateway settings into disposable generic peers and checks DNS/TCP/TLS, private cross-environment IP denial and unpublished host-gateway peer-port denial. These are local Engine observations, not target-host firewall or public-proxy acceptance. Each runner removes only its own containers/networks/temporary data.
