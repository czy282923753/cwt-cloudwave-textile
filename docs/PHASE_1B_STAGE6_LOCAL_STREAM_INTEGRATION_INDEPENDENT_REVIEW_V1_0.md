# CWT Phase 1B Stage 6 Local Stream Integration Independent Review V1.0

## Review identity and verdict

| Field | Value |
| --- | --- |
| Review type | Focused independent LOCAL stream-integration re-review |
| Corrected Candidate | `c0df6907ada88133f6dfdfa62460dd0f5cc8aba9` |
| Candidate parent | `80fe4a79517c34def0a28f33a5feefe89ae58e97` |
| Prior Review report | `ae26ce0b19c3a37a80270aa1e9024dc54be10868` |
| Scope | `S6-LI-M-01` correction only |
| Verdict | **PASS — S6-LI-M-01 CLOSED** |

The prior Runtime and S6-06 module Reviews remain **CLOSED/PASS**. This focused re-review closes the sole failed composition interface in the first integration Candidate. It does not reopen either module, claim a real successor image, or advance Stage 6 beyond Partial/HOLD.

## Security & Test Simplification Check

**PASS.** Under `delete → merge → standard mechanism → new mechanism`, the correction extends the existing Runtime command plan, synthetic-host lifecycle and focused tests. It reuses the already reviewed Scheduler mount boundary, image-owned `pre-deploy`, Linux `flock` mutex and existing backup roots. It adds no new lock protocol, persistent coordination state, authority, service, Reviewer or validation framework.

## Finding closure

### S6-LI-M-01 — CLOSED

The corrected Runtime plan no longer selects `web-staging` for protected Migration. It performs a disposable `docker compose run --rm --no-deps --pull never` using `scheduler-staging`, preserves the read-only subject Drizzle bind and invokes the image-owned `/app/deploy/backup/pre-deploy node --import=tsx /app/scripts/migrate.ts` chain.

The actual normalized Compose boundary gives this Scheduler caller the two writable staging backup roots and the exact read-only `/run/lock/cwt/backup-migration.lock` mount. Web receives none of those mounts. Synthetic-host setup now owns the two missing backup roots and shared mutex file, assigns the reviewed ownership/modes, refuses pre-existing CWT roots, and removes successful or partial setup state through the existing teardown boundary. The disposable caller does not enter the steady service set, which remains exactly `postgres`, `valkey-staging` and `web-staging`.

The decisive composed test derives its command from the actual Runtime plan and its service boundary from actual normalized Compose. With an isolated real local PostgreSQL instance, it proves that a missing mutex refuses before database access, a held mutex returns the expected busy result before database access, and an available mutex executes the selected Scheduler pre-deploy/Migration command, completes one verified pre-deploy backup set and applies Drizzle migrations. This directly resolves the causal boundary identified by the prior Review.

## Decisive verification

| Check | Result |
| --- | --- |
| Corrected Candidate identity and parent | PASS: exact Candidate `c0df6907...`, exact parent `80fe4a7...` |
| Focused Runtime/registry integration suite with authorized local test utilities | PASS: **25/25, 0 skipped** |
| Selected Scheduler pre-deploy Migration against normalized mounts and isolated PostgreSQL | PASS; missing/busy mutex fail before DB, available mutex backs up then migrates |
| Synthetic backup roots/mutex ownership, refusal and complete/partial cleanup | PASS |
| Direct exported-plan assertion | PASS: Scheduler + `pre-deploy`, exact mutex path, three steady services |
| Changed-file syntax and focused ESLint | PASS |
| Candidate diff whitespace | PASS |

The previously passed dynamic/default Compose suite, backup/restore, daily stale-marker convergence, weekly schedule, TLS/S3, network-peer, serialization, OCI/package, typecheck and historical Runtime evidence is reused because those implementation bodies are unchanged. No synthetic proof is promoted to release-image, copied-library or external-environment evidence.

## Residual scope and gate disposition

No open finding remains in this focused local integration re-review. At that Review point the exact PostgreSQL Bookworm build input was unavailable locally; its later acquisition and packaging correction are reviewed separately below. No real successor Release/OCI identity exists. Registry/artifact custody, native Tencent host/firewall/capacity/timing, actual COS/private policy, protected restore/start, monitoring transport, scheduler-exit alerts and Owner-approved RPO/RTO remain external prerequisites.

Stage 6 therefore remains **Partial/HOLD**. This PASS closes only `S6-LI-M-01` and authorizes no Push, image emission, workflow dispatch, external execution, protected start, deployment or Phase advancement.

## Focused packaging-delta independent Review

| Field | Value |
| --- | --- |
| Review type | Focused independent packaging-delta Review |
| Candidate | `ab8ed218abef52fbc3c4b9220f0d0a15f67d24fd` |
| Candidate parent | `8b10a1900c43facfb9d8d0cbe90e31ce66178433` |
| Previously accepted integrated source | `c0df6907ada88133f6dfdfa62460dd0f5cc8aba9` |
| Scope | Dockerfile library destination normalization and its focused source-shape test |
| Verdict | **PASS — packaging delta CLOSED** |

The prior integration PASS and module Reviews remain closed. This verdict covers only the acquisition-to-Node-slim copied-library boundary; it is not a complete Product build, Release/OCI result, native Tencent Runtime proof or Phase acceptance.

### Security & Test Simplification Check

**PASS.** Under `delete → merge → standard mechanism → new mechanism`, the correction modifies the existing copy loop at the causal boundary. `readlink -f` provides the standard canonical directory, the existing `ldd` basename remains the runtime lookup name, and the allowlist rejects destinations outside `/usr/lib` and `/usr/lib64`. No fallback input, second bundle, alternate overlay, persistent state, authority or permanent harness was added. The focused regex test is only source-shape evidence and is not treated as executable packaging evidence.

### Root-cause closure and preserved authority

The former lexical destination could materialize `/backup-root/lib` as a directory even though the exact Node slim target owns `/lib -> usr/lib`, causing the unchanged root overlay to fail before runtime. The corrected loop canonicalizes each source library's directory, preserves its original `ldd` basename and copies dereferenced bytes into the canonical `/usr/lib` or `/usr/lib64` tree. This removes the directory/symlink collision while retaining the loader and SONAME aliases required by the three PostgreSQL tools.

The exact PostgreSQL 18.4 and Node 24.14.0 pins are unchanged. The single `dependency-bundle`, architecture-selected `dependency-input`, final `COPY --from=dependency-input /backup-root/ /` and `build-release-once.mjs` authority are also unchanged. Dependency acquisition remains the networked step; the final multi-platform build remains `--network=none`. No old/new dual packaging path exists.

### Decisive verification

| Check | Result |
| --- | --- |
| Focused `preflight-image` suite | PASS: **17/17, 0 skipped** |
| Syntax, focused ESLint and Candidate diff hygiene | PASS |
| `linux/arm64` actual Candidate acquisition and exact Node slim overlay | PASS in one bounded attempt |
| `linux/arm64` restricted runtime | PASS: Node `v24.14.0`; all three PostgreSQL `18.4` tools; zero unresolved `ldd`; `/lib/ld-linux-aarch64.so.1` present |
| `linux/amd64` actual Candidate acquisition and exact Node slim overlay | PASS in its sole bounded attempt; canonical `/usr/lib/x86_64-linux-gnu` tree and `/usr/lib64/ld-linux-x86-64.so.2` preserved |
| `linux/amd64` restricted runtime | Partial independent confirmation: exact Node, `/lib` symlink and loader passed; the first PostgreSQL version assertion was rejected only because the Reviewer regex incorrectly required `18.4` at end of the Debian version string. No loader or tool execution error was emitted. The attempt was not repeated; the Developer's recorded exact amd64 restricted-runtime PASS supplies the remaining three-tool evidence. |
| Probe cleanup | PASS: unique images, containers and temporary roots removed; shared cache/images and all pre-existing stopped containers preserved |

The arm64 result confirms the Debian string includes a package suffix, establishing why the Reviewer-only amd64 assertion was too narrow. This is a probe limitation, not a Candidate defect or a permanent test request. The amd64 execution remains emulated on the local arm64 Docker VM and does not establish native Tencent behavior.

### Non-blocking report notes and next gate

- The Developer report can conclude that acquisition recovered after the authorized restart, but the historical sequence does not establish a precise internal BuildKit proxy, DNS, TLS or cache cause. That narrower causal ceiling does not affect the packaging result.
- Its final sentence still names a future Dockerfile remediation even though `ab8ed218...` already contains that correction. The operative next gate after this PASS is the separately authorized coherent successor Build Once/publication flow.

No blocking or non-blocking code finding remains in this packaging scope. Complete CWT Build Once and private publication, a new real Release/OCI identity, native exact-digest Runtime Validation, Provider/protected recovery, monitoring transport and Owner-approved RPO/RTO remain later gates. Stage 6 stays **Partial/HOLD**. This Review authorizes no Push, Registry write, workflow dispatch, external host action, protected start, deployment or Phase advancement.

## Focused LOCAL Build Once correction independent Review

| Field | Value |
| --- | --- |
| Review type | Focused independent LOCAL Build Once correction Review |
| Candidate | `78c882345d522d7a83cae9296c26499d49ab2521` |
| Candidate parent | `e8e897e017d36c38a757bd534cc71af298b1fe51` |
| Developer report-only closure | `eb11af507b9394604e92d62ab8b2bd4433b18977` |
| Previously accepted packaging source / Review | `ab8ed218abef52fbc3c4b9220f0d0a15f67d24fd` / `bd83775c3f332972696e102560df89cda4bf7444` |
| Scope | Scout OCI blob materialization and minimal failure-path revocation retention |
| Verdict | **PASS — LOCAL Build Once correction CLOSED** |

The failed source `ab8ed218...` and emitted index `sha256:94a89c44d18a38fd4a35cbb82178c4c79159cc2eb8d8e12e27d0a5c71cd62823` remain revoked and ineligible. This Review accepts only the local correction; it does not recreate historical evidence, authorize a Build Once, or claim hosted artifact retention.

### Security & Test Simplification Check

**PASS.** Under `delete → merge → standard mechanism → new mechanism`, the correction uses an insertion-ordered JavaScript `Set` at the existing per-child materialization loop and one standard pinned `upload-artifact` step. The small exported production helper plus direct-execution guard enables direct testing without a second materializer or CLI. No new lifecycle, state, retry, evidence authority, custody framework or synthetic revocation path was introduced. Complexity remains level.

### Root-cause closure and failure semantics

An OCI child descriptor may reference the same blob digest more than once. The former loop called exclusive `linkSync` once per descriptor entry, so a repeated layer digest deterministically collided with its own already-created destination. `materializeScoutOciBlobs` now deduplicates only the digest collection used to populate the Scout child layout. It does not mutate the child descriptor or its layer order and duplicates, and therefore does not change OCI identity.

The helper retains exclusive hard-link semantics. A missing source still throws `ENOENT`; a destination that genuinely existed before materialization still throws `EEXIST` without overwrite. The caller writes the child layout index and invokes Scout only after materialization returns, while the existing outer temporary cleanup removes a failed partial scratch layout. Error propagation and post-emission revocation remain fail closed.

The workflow adds one `failure()`-only pinned artifact step after the unchanged successful publication/evidence pipeline. Its exact path is limited to `${runner.temp}/cwt-release-${release_commit}/revoked/*.json`, its distinct name is `cwt-revoked-release-evidence-${release_commit}`, retention is 30 days, and a missing file is ignored. It cannot upload the OCI subject, `release.json`, partial SBOM/provenance, auth material or logs, and it creates no record. The only eligible file remains the Build Once script's existing minimal `schemaVersion`, `indexDigest`, `releaseId`, `reasonCode` and `recordedAt` revocation JSON. A pre-emission refusal leaves no output record; the original failed job remains failed.

### Decisive verification

| Check | Result |
| --- | --- |
| Directly relevant tests | PASS: **15/15, 0 skipped** |
| Independent duplicate-layer fixture using the production helper | PASS: two descriptor layer entries preserved; three unique blobs hard-linked once |
| Missing source / pre-existing destination | PASS: `ENOENT` / `EEXIST`, no overwrite |
| Actual package entry and direct CLI guard | PASS: `pnpm build:release-once` enters `main()` and refuses missing `--output` |
| Pre-emission invalid-output path | PASS: refusal creates no output or revocation record |
| Successful workflow prefix and artifact consumer | PASS: byte-for-byte unchanged before the appended failure step |
| Failure artifact boundary | PASS: pinned action, `failure()` condition, distinct name, exact narrow glob, 30-day retention and no synthetic script |
| Syntax, focused ESLint, YAML parse and Candidate diff hygiene | PASS |

`actionlint` was unavailable and was not downloaded. The repository workflow assertions and local YAML parser establish static structure only; actual GitHub `upload-artifact` execution and 30-day hosted retention remain External Validation Required. Source-shape assertions are not treated as hosted custody proof. Their minor coupling to workflow text is nonblocking and does not justify another parser or permanent harness for this bounded correction.

### Exit disposition

No blocking or non-blocking code finding remains in this focused scope. The correction does not reopen the accepted Runtime, backup or packaging modules. Stage 6 remains **Partial/HOLD**.

The next gate is coordinator acceptance of this LOCAL Candidate. Any fresh Build Once/private publication requires a new reviewed source/release identity and a separate explicit Owner decision. This Review authorizes no source Push, Product build, OCI emission, runner registration, workflow dispatch, Registry write, cloud/provider/protected action, deployment or Phase advancement.
