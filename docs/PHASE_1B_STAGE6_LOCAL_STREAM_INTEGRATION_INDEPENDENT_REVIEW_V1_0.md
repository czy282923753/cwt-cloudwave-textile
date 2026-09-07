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

## Focused tools-only provisioning download correction independent Review

| Field | Value |
| --- | --- |
| Review type | Focused independent tools-only provisioning download Review |
| Candidate | `f63082ab6823c81c2e234a410277c47de937e384` |
| Candidate parent | `857c8b0499a21ab2ca12d6baa42bd2530542c849` |
| Failed native attempt | nonce `8be204cb...`; archive connection exited `28` before token, registration or Runtime |
| Retained Product authority | release `78c882345d522d7a83cae9296c26499d49ab2521`; index `sha256:fc96539ee4c51895c1c1fedc8ef873e2fc92b5898c55f273f03d81656d779f0e`; artifact `10004387422` |
| Verdict | **PASS — tools-only provisioning download correction CLOSED** |

The failed external attempt remains terminal and its VM, disk, IP and security-group resources remain destroyed. This Review accepts only the local tools correction. It does not claim Tencent-to-GitHub reachability, authorize another TAT invocation or alter the retained Product image.

### Security & Test Simplification Check

**PASS.** Under `delete → merge → standard mechanism → new mechanism`, the Candidate keeps the existing single download path and uses curl's built-in timeout, retry and partial-output controls. It adds no custom retry loop, second endpoint, mirror, proxy, cache authority, persistent state, credential path or outer execution retry. The eight-argument helper and loopback fixture add moderate test-facing detail, but they directly exercise production transport behavior and avoid a parallel downloader. Their positional/readability coupling is minor and nonblocking; it does not justify another abstraction or harness.

### Transport boundary and finite budget

The 15-second `--connect-timeout` limits only connection establishment. It does not reject a normally progressing archive transfer after the connection is established. Each transfer has its own 390-second `--max-time`; `--retry 2` permits at most three transfers; the two-second delay is fixed; and `--retry-max-time 45` permits a new retry only while that retry timer remains open. A final transfer started within the window may continue until its own transfer cap. Thus a sequence of fast connection failures receives bounded retry, while one slow established transfer is allowed a materially larger window.

The 600-second TAT timeout remains the outer authority. The download controls reserve only a calculable envelope, not a completion guarantee: package installation before the archive and extraction/readiness work afterward remain variable. A slow download that completes inside the transfer limit and passes the exact SHA-256 remains valid; exceeding the finite resource envelope fails the one provisioning invocation without weakening acceptance.

Ubuntu 24.04's curl 8.5.0 supports all selected options, including `--remove-on-error`, `--retry-connrefused` and `--retry-max-time`. Default curl retry eligibility covers timeout and selected transient HTTP failures; `--retry-connrefused` adds refused connections. The Candidate intentionally omits `--retry-all-errors`, so TLS failures are not broadened into retryable cases. The URL remains the same exact HTTPS GitHub Runner archive and digest mismatch is evaluated only after a successful transfer. Compatibility and timer semantics were checked against the official [Ubuntu Noble curl package](https://packages.ubuntu.com/noble/curl), [curl option history](https://curl.se/docs/optionsall.html) and [curl man page](https://curl.se/docs/manpage.html).

### Error propagation, integrity and authority

The production `cwt_install_runner` calls the helper with the reviewed constants. A final curl error propagates through the existing `set -Eeuo pipefail` path and preserves a nonzero provisioning result. `--remove-on-error` removes a failed transfer file; the existing exit trap removes the whole unique work root. On transfer success, `sha256sum` must match the frozen Runner digest before `install`, extraction or dependency execution begins. A wrong digest returns `67`, is not retried and is removed with the work root.

No token, registration, Runner process, Runtime workflow or Product step enters this helper. Internal retries repeat only the same idempotent public archive GET inside one TAT invocation. The original one-shot TAT, registration and Runtime workflow stop rules are unchanged.

### Decisive verification

| Check | Result |
| --- | --- |
| Focused provisioning suite | PASS: **15/15, 0 skipped** |
| Transient loopback `503` | PASS: exact bytes accepted on transfer 2 only after SHA-256 match |
| Repeated loopback `503` | PASS: exactly three transfers, nonzero exit, no output residue |
| Stalled transfer | PASS: supplied transfer cap enforced and partial output removed |
| Wrong digest | PASS: one transfer, exit `67`, never accepted |
| Independent TLS-negative loopback | PASS: curl exit `35`, exactly one connection despite retry allowance, no archive residue |
| Production caller/order and outer TAT authority | PASS: helper is on the real install path; hash precedes extraction; TAT remains 600 seconds |
| Bash syntax, Node syntax, focused ESLint and Candidate diff hygiene | PASS |

Local loopback tests prove curl behavior and shell propagation only. They do not prove future Tencent routing, GitHub availability, real archive throughput or that 600 seconds is always sufficient. Those remain External Validation Required for a separately authorized native attempt.

### Exit disposition

No blocking or nonblocking code finding remains in this focused scope. The accepted Runtime, backup and packaging modules and published Product release remain closed and unchanged. Stage 6 remains **Partial/HOLD**.

The next gate is coordinator acceptance of this tools-only Candidate. Reusing the retained Product image for a fresh native Runtime attempt requires new reviewed tools plus separate explicit Owner authorization. This Review authorizes no Push, token, TAT invocation, Runner registration, workflow dispatch, Registry or cloud mutation, Product build, production action, deployment or Phase advancement.

## Focused cross-path Runtime preparation/recovery Technical Escalation independent Review

| Field | Value |
| --- | --- |
| Review type | Focused independent Operational/Security Review of the Technical Escalation correction |
| Frozen plan | `90d52261faf619ce9d2c9fff67e1ba606f61a547` |
| Implementation | `a4f137f5e0f964f26bab737fc3a80ae846958e63` |
| Delivered Candidate | `ea2b6b5ef43a166c93ec05302dcde3e767e637a6` |
| Candidate baseline | `345f8b15637578d046a9a07c3bfa3e74c0f72e0c` |
| Retained Product authority | release `78c882345d522d7a83cae9296c26499d49ab2521`; index `sha256:fc96539ee4c51895c1c1fedc8ef873e2fc92b5898c55f273f03d81656d779f0e`; artifact `10004387422` |
| Verdict | **PASS — Runtime preparation/recovery Technical Escalation correction CLOSED** |

This Review accepts the local cross-path correction only. It does not convert either prior native failure into a pass, establish Tencent-to-public-endpoint reachability, authorize a second workflow attempt, or alter the retained Product image.

### Security & Test Simplification Check

**PASS.** Under `delete → merge → standard mechanism → new mechanism`, all three public downloads use one standard native curl policy, and direct plus nested APT acquisition uses one temporary native `APT_CONFIG`. The same-host recovery remains one branch of the existing provisioning path and one tightly bounded Operator admission inside the existing outer attempt; it adds no second downloader, mirror, proxy, persistent counter, run-history authority, service, Reviewer or validation framework.

The added shell guards are proportionate to deleting the fixed Runner tree on an already prepared host. Exact Docker package identities, live versions, process and mount checks, residue refusal, fixed-path validation and current-process ownership protect distinct boundaries. The final removal helper rechecks the destructive preconditions at the mutation point; it is not a parallel cleanup authority. No material control can be safely deleted or merged while preserving the frozen recovery contract, and no extra simplification Reviewer or gate is warranted.

### Plan conformance and authority boundaries

The Docker signing key, GitHub Runner archive and ORAS archive retain their exact HTTPS endpoints, versions and digests. Each uses `--proto '=https'`, TLS 1.2 minimum, a 15-second connection timeout, two retries with a two-second delay, a 45-second retry window, connection-refused eligibility and partial-output removal. Their separate transfer caps remain 60, 390 and 180 seconds. `--retry-all-errors` is absent, and every digest check still precedes extraction or use.

The temporary root-only APT policy sets two acquisition retries and 30-second HTTP/HTTPS timeouts through `APT_CONFIG`, so the same policy reaches the nested Runner dependency installer. Exit cleanup removes it on success and failure. The outer authorities remain unchanged: provisioning and registration each retain TAT 600, the Runtime job retains 60 minutes, and the host lifecycle retains 90 minutes/CNY 10 with recovery admitted only while at least 45 minutes remain and teardown beginning by host age 80 minutes.

Recovery accepts only an exact Ubuntu 24.04/amd64 host with the exact Docker package set and live versions. It refuses mixed Docker state, active Runner processes, mounts under the fixed Runner root, any container, CWT/Compose network residue, private Runtime paths and authentication/OCI/outcome residue. Only `/opt/cwt-actions-runner` may be removed, only after its type and identity are checked, and the installation path becomes cleanup-owned only when the current process creates it. Cleanup failure is terminal with exit `68` and cannot widen the deletion target.

The workflow still authenticates to GHCR only after the bounded ORAS acquisition and digest verification, and it retains one ordered formal Product validator invocation. Attempt `2` is accepted only by the existing job-scoped Runner identity contract. The Operator contract supplies the sole recovery admission: immutable attempt-1 evidence must show that neither GHCR authentication nor the validator started, no outcome exists, the first Runner is absent, the token is expired, local residue checks pass and the time reserve remains. The repository does not infer those external facts and does not create automatic run-history state. Recovery is forbidden once GHCR or validator execution begins, and failed outcomes remain failed.

### Decisive verification

| Check | Result |
| --- | --- |
| Candidate identity and bounded diff | PASS: exact Candidate `ea2b6b5...`; seven authorized files only; protected Product, preflight, registration and TAT contracts byte-unchanged |
| Focused provisioning, registration and release-integration suites | PASS: **48/48, 0 skipped** |
| Independent cleanup symlink substitution | PASS: cleanup returned `68`, preserved the symlink and unrelated target, and emitted the fixed cleanup refusal |
| Download, APT and recovery negative paths | PASS: transient/exhausted/stalled/wrong-digest transport, policy inheritance/removal, mixed state, process, mount, container, network and private-residue refusals are covered |
| Workflow authority | PASS: bounded ORAS acquisition precedes GHCR; attempts are exactly `1` or `2`; one formal validator remains |
| Syntax and static checks | PASS: Bash and Node syntax, focused ESLint, workflow YAML parsing and Candidate diff hygiene |
| Product non-regression | PASS: retained release/index/artifact tuple unchanged; no Product build or Registry write performed |

The loopback and source-level checks establish local transport semantics, failure propagation and workflow ordering only. They do not prove public endpoint availability from a fresh Tencent host, real APT/Runner throughput, Runner registration, GHCR access, actual workflow execution or teardown timing. Those remain External Validation Required in a separately authorized native attempt.

### Exit disposition

No blocking or nonblocking finding remains in this focused Review. The prior accepted Runtime, backup, packaging, Build Once and tools-only corrections remain closed. Stage 6 remains **Partial/HOLD**.

The next gate is coordinator acceptance of this Review and a separate Owner decision on any native same-host recovery attempt. This Review authorizes no Runner start, token use, workflow dispatch or rerun, cloud/provider action, Push, Registry write, Product build, Docker mutation, protected start, deployment or Phase advancement.

## Focused Product bundle dependency-closure independent Review

| Field | Value |
| --- | --- |
| Review type | Focused independent Product/Operational/Security Review |
| Accepted diagnosis | `20e37cec6cba5b69436cb790a72938419f1385aa` |
| Code Candidate | `d283e459a18a503119a28715572596b524209fbb` |
| Candidate report-only delivery | `3c6c9e782f83e0e06a5a3a51382c2fe1bc05bca1` |
| Scope | Production checker dependency, Build Once child gate, bounded diagnostic/outcome retention |
| Verdict | **FAIL — `S6-BD-M-01` OPEN** |

The prior Runtime preparation/recovery Technical Escalation remains **CLOSED/PASS**. This Review does not reinterpret native run `34095608690`: its Product validator result remains `NOT_PASS / bundle_authority_failed`, and the immutable old release `78c882345d522d7a83cae9296c26499d49ab2521` / index `sha256:fc96539ee4c51895c1c1fedc8ef873e2fc92b5898c55f273f03d81656d779f0e` remains unsuitable as a future Runtime subject.

### Security & Test Simplification Check

**PASS.** Under `delete → merge → standard mechanism → new mechanism`, the Candidate makes the intentionally shipped AST checker depend on its already locked compiler through the standard production dependency set, reuses the existing Build Once post-emission child loop, and reuses the existing Runtime outcome plus pinned artifact action. It adds two fixed detail codes rather than a taxonomy, state machine or alternate evidence format. No second checker, publisher, validator, revocation path, persistent state, authority, framework, Reviewer or gate was introduced.

The accepted TypeScript runtime/SBOM increase is necessary because the checker is executed from the production image. Bundling a second self-contained checker artifact would add an equivalence boundary, while removing the AST checker would weaken the accepted authority. The open finding below requires only a least-privilege producer-to-consumer handoff at the existing output boundary; it does not justify a new evidence mechanism or recursive Review stage.

### Accepted correction boundaries

The root importer moves exact `typescript@5.9.3` from development to production in `package.json` and `pnpm-lock.yaml`; package snapshots and all versions remain unchanged. A fresh production-only offline install starts the real shipped checker and reaches the expected missing-build assertion without `ERR_MODULE_NOT_FOUND`. The Docker runtime stage asserts the same exact TypeScript version beside Node and `tsx`.

Build Once loads each emitted `linux/amd64` and `linux/arm64` child and runs `/app/scripts/check-public-bundle.mjs` from that exact tag with `--pull never`, the exact platform, no network, read-only root filesystem, UID/GID `10001:10001`, all capabilities dropped and `no-new-privileges:true`. A spawn error, signal or nonzero status fails the child gate. The existing child loop, `finally` image cleanup and outer `post_emission_gate_failed` revocation path remain authoritative; `release.json` validation, GHCR authentication and publication occur only after Build Once completes. No failed Candidate can advance through the normal publish workflow.

The checker emits at most one of `bundle_dependency_bootstrap_failed` and `bundle_assertion_or_unknown_failed` on stdout, then retains its normal nonzero exception behavior and stderr. Runtime accepts a detail only from complete JSON of at most 256 bytes with exactly `schemaVersion` and one allowlisted `reasonCode`. Extra fields, appended output, unknown codes, malformed JSON and oversized output collapse to `null`; spawn errors and signals remain the broad `bundle_authority_failed`. The additive `failureDetailCode` has no conflicting repository consumer, does not change `schemaVersion: 1`, and never forwards raw stderr, paths, needles, bundle bytes or environment values.

### `S6-BD-M-01` — Medium — Runtime outcome is unreadable to the artifact uploader

The workflow starts the self-hosted Runner as the non-root `ubuntu` user, but line 181 of `.github/workflows/cwt-runtime-validation.yml` runs the validator through `sudo`. The root validator creates the evidence directory with mode `0700` and writes both outcome files with mode `0400`; it does not change their root ownership. The following JavaScript `upload-artifact` action has no privilege bridge and executes as the Runner user. That user cannot traverse the directory or read either file.

A Reviewer-owned Linux isolation probe reproduced the exact DAC boundary: root created a `0700` evidence directory and `0400` outcome, then a UID 1000 consumer received `EACCES`. Separately invoking the Candidate's actual `writeOutcome` confirmed that its JSON and SHA-256 sidecar are internally correct and that it produces those exact modes. The new repository test only asserts the two YAML path literals and does not exercise producer/consumer identities or readability.

This deterministically defeats the newly claimed evidence-retention capability whenever the validator writes an outcome. Depending on artifact glob behavior, the step can retain nothing under `if-no-files-found: ignore` or fail while trying to read the paths; neither result provides a usable outcome/checksum artifact. A successful validator may also leave the workflow failed at upload. The defect is on the supported Runtime path, has direct operational and evidence-integrity impact, and lacks an existing recovery path, so it is a blocking **Medium** under `docs/REVIEW_POLICY.md`.

Bounded remediation must hand off only the exact evidence directory and its two fixed regular files to the already verified sudo-origin Runner identity with least-privilege modes before upload. It must fail closed on type, symlink, owner, path or checksum mismatch; preserve the current no-outcome behavior for failures before evidence creation; retain the existing cleanup and same-run recovery rules; and add an actual two-identity producer/consumer test proving directory traversal, both-file readability, checksum validity and absence of extra/raw content. A generic recursive ownership change, broader `$RUNNER_TEMP` permission, second evidence copy or new schema is unnecessary.

### Decisive verification

| Check | Result |
| --- | --- |
| Exact Candidate scope | PASS: ten code/test files, 205 insertions and 16 deletions; Candidate delivery changes only the principal report |
| Production dependency and lock | PASS: exact `typescript@5.9.3` classification move only; frozen offline lock check; production-only bootstrap reaches checker assertion |
| Build Once focused suite | PASS: **6/6**; both platform command envelopes and nonzero rejection covered |
| Public bundle checker fixtures | PASS: **157/157**; existing assertions plus both fixed diagnostic classes |
| Runtime focused suite | PASS with environmental ceiling: **15/16 passed, 1 existing Scheduler/PostgreSQL case skipped** |
| Registry/workflow focused suite | PASS: **11/11**; Build Once precedes authentication/publication and Runtime remains read-only |
| Reviewer outcome/checksum probe | PASS: actual writer produced exact JSON, matching SHA-256 sidecar, directory `0700` and files `0400` |
| Reviewer root-to-UID-1000 upload probe | **FAIL as expected: deterministic `EACCES`**, substantiating `S6-BD-M-01` |
| Syntax and static checks | PASS: changed Node syntax, focused ESLint, workflow YAML parsing and diff hygiene; `actionlint` unavailable and not downloaded |
| Product/non-regression boundary | PASS: no Product build, Registry mutation or workflow dispatch; Compose, image validator and Registry implementation bodies unchanged |

### Residual scope and gate disposition

No additional blocking or nonblocking finding remains in the assigned scope. Local production dependency installation and Synthetic/emulated tests do not establish a new exact image, SBOM, native Ubuntu/amd64 Product PASS, compose startup or cloud artifact retention. The one environment-dependent Scheduler/PostgreSQL test reuses its previously accepted evidence because that implementation body is unchanged. These remain accepted validation ceilings rather than reasons to enlarge this remediation.

The Candidate is **not accepted** while `S6-BD-M-01` remains open. Stage 6 remains **Partial/HOLD**. The next gate is one bounded Developer correction of the exact producer/uploader permission boundary followed by focused independent re-review in this same scope. This Review authorizes no Push, Product build, Registry write, workflow dispatch, cloud action, Runner start, protected start, deployment or Phase advancement.

## Focused `S6-BD-M-01` correction re-review

| Field | Value |
| --- | --- |
| Review type | Narrow independent Runtime outcome handoff re-review |
| Prior failed Review | `07b504619fc05b46a79624ec1fdebbefc3f0ba94` |
| Correction Candidate | `896dff79fd74ac69cce25c1ca4635fe05060c851` |
| Candidate report-only delivery | `d666f063f8d532aa765f429d2980a1e94426e676` |
| Scope | `S6-BD-M-01` and its direct failure/cleanup neighborhood only |
| Verdict | **PASS — `S6-BD-M-01` CLOSED; dependency-closure correction locally accepted** |

The preceding dependency, Build Once, checker-detail, schema and sanitized-content findings remain closed and were not reopened. The workflow, Product dependency files, Dockerfile, checker, Build Once implementation and release publication path are byte-unchanged from the previously reviewed Candidate.

### Changed-handoff Security & Test Simplification Check

**PASS.** The correction reuses the existing root/sudo Git ownership bridge and the existing `writeOutcome` boundary. It changes ownership in place for the exact two existing files and their directory; it adds no CLI UID, recursive ownership change, broader `$RUNNER_TEMP` permission, copy, alternate path, schema, state or evidence mechanism.

The additional reads protect separate mutation facts: canonical Runner parent and uploader identity, initially empty root-owned output, exact filenames, regular-file/type/mode ownership, checksum before handoff, and final ownership after handoff. Rechecking file state around the two exact `chown` operations is proportionate to a root ownership mutation. No material check can be deleted or merged without weakening this boundary, and no additional Reviewer or gate is warranted.

### Causal closure

The writer derives the uploader UID through the already enforced root `SUDO_UID` to canonical repository-owner relationship. It requires the evidence parent to be a canonical directory owned and traversable by that same UID. This matches the accepted GitHub layout: the non-root `ubuntu` Runner owns its `_work/_temp` directory and invokes only the validator through `sudo`; shell expansion supplies the exact child path while sudo supplies `SUDO_UID`.

The newly created evidence output must remain canonical, empty, root-owned and mode `0700`. The writer creates only `linux-runtime-validation.json` and its SHA-256 sidecar at mode `0400`, verifies both as canonical non-symlink root-owned regular files and verifies the exact sidecar bytes. It then transfers the two files to the verified origin UID and the directory last, preserving `0400/0700`, and verifies the completed ownership. The uploader can traverse and read as owner, while no group or world permission is added.

Direct root execution without sudo and with a root-owned repository/parent resolves to UID 0 and preserves the original root-only behavior. Missing or invalid sudo identity, repository/parent owner mismatch, noncanonical or symlink output and invalid initial output fail closed. A supported Runtime validation failure still completes cleanup, writes and hands off the sanitized `NOT_PASS` outcome, then exits nonzero; a failure before evidence creation still leaves no artifact for the existing `if-no-files-found: ignore` behavior. Because recovery is admitted only before GHCR/validator execution, an outcome-producing run remains ineligible for same-host recovery exactly as before.

### Decisive verification

| Check | Result |
| --- | --- |
| Correction scope | PASS: only `preflight-linux-runtime.mjs` and its focused test changed; **147 insertions, 3 deletions** total |
| Changed Runtime suite | PASS: **16/17 passed**, with the one unchanged environment-dependent Scheduler/PostgreSQL case skipped |
| Actual production writer, two identities | PASS: root writer handed the exact two files to UID/GID 1000; consumer read JSON and checksum; unrelated root-only file remained `EACCES` |
| Reviewer `_work/_temp` layout probe | PASS: root writer used `/opt/cwt-actions-runner/_work/_temp/cwt-runtime-outcome`; UID/GID 1000 traversed `0700`, read both files and recomputed the matching digest |
| Negative handoff paths | PASS: missing origin, mismatched parent, symlink output and root-only direct execution retain fail-closed behavior without widened mutation |
| CLI status and missing-output boundary | PASS: wrong parent returns nonzero `outcome_handoff_invalid` with no success stdout; pre-evidence refusal retains no outcome |
| Syntax, focused ESLint and diff hygiene | PASS |
| Previously accepted Product boundaries | PASS by unchanged-byte confirmation and prior evidence reuse; no full bundle cycle repeated |

The local Linux two-identity probes establish filesystem readability and checksum usability, not hosted GitHub artifact creation or retention. A real `upload-artifact` result remains future external evidence. No new Product image, SBOM, compose result or native Runtime PASS is claimed.

### Exit disposition

No blocking or nonblocking finding remains in this bounded re-review. `S6-BD-M-01` is closed, and the complete dependency-closure correction is locally accepted. The old release `78c882345d522d7a83cae9296c26499d49ab2521` and index `sha256:fc96539ee4c51895c1c1fedc8ef873e2fc92b5898c55f273f03d81656d779f0e` remain immutable failure evidence and unsuitable for a future Runtime subject. Stage 6 remains **Partial/HOLD**.

The next gate is coordinator acceptance of this Review and a concrete separate decision on a new Product Build Once. This Review authorizes no Push, Product build, Registry write, workflow dispatch, cloud action, Runner start, deployment or Phase advancement.

## Focused Bundle / Image Contract Technical Escalation independent Review

| Field | Value |
| --- | --- |
| Review type | Focused independent Product/Test Review under Technical Escalation |
| Frozen plan | `7abb965529e4f3a3e72f0274efdef4c103809ec8` |
| Integrated baseline | `1eecba71e6768661156d0292951f0918d29c00be` |
| Code Candidate | `9f270171fa8e0a467c29283a70e6d91522545a39` |
| Candidate report-only delivery | `758f337d877393de510901ec38de267aebc52bec` |
| Scope | Immutable-image checker filesystem contract and workspace/CI caller sequencing |
| Verdict | **PASS — implementation accepted; Technical Escalation awaits coordinator acceptance** |

The previous dependency/outcome handoff Review and Runtime preparation/recovery Review remain **CLOSED/PASS**. Failed Build Once run `34132330763` and emitted index `sha256:5ea0592ea6dbebcb26efd744e087cd4d7f527ca82e10dc3509f4342ef52bff93` remain immutable revoked failure evidence. This Review creates no replacement Product identity.

### Security & Test Simplification Check

**PASS.** Under `delete → merge → standard mechanism → new mechanism`, the Candidate deletes the incomplete source-mtime inventory from the immutable-artifact checker, anchors its real layout inputs through standard `import.meta.url`, and moves workspace freshness to the existing successful build-then-check command sequence. Aggregate `check` and the CI build-bundle job each reach that sequence once without a duplicate direct build.

No bypass flag, copied lock/config closure, source hash manifest, second checker, validator, evidence state or compatibility path was added. Production complexity falls. The larger test fixture is proportionate because it composes the exact interface missed by two real external attempts: copied checker, production dependency tree, shipped Prompt authority and complete compiled-output assertions in one disposable runtime-shaped root. It creates no new gate or Reviewer.

### Contract closure

The checker now derives `layoutRoot` from its own `scripts/..` location. Default and relative `CWT_BUILD_DIR` values resolve from that root, while the existing absolute Build Once/Runtime value remains absolute. The generated Production Prompt authority is also anchored to the same shipped root. The checker retains a non-empty `BUILD_ID` presence check and every downstream AST, AI/server marker, exact Prompt tuple, Rate Limiter, File Scanner, governed Turbopack runtime/entrypoint, client-manifest framing, root/static chunk, realpath/containment, native-addon and forbidden-public-content assertion. The code diff contains no content-assertion weakening.

The removed mtime walk was neither a complete Next input model nor meaningful after immutable-image timestamp normalization. Workspace command `pnpm check:bundle` now runs exactly one `pnpm build` immediately before the same checker. Aggregate `pnpm check` reaches `check:bundle` once and no longer runs a second direct build. The CI build-bundle job preserves its disposable-database Migration ordering and likewise calls this sequence once. Direct Build Once and Runtime callers remain unchanged and execute the same checker against `/app/.next/standalone/.next` under their already accepted exact-child, no-network, read-only, non-root and privilege-drop envelopes.

### Complete emitted-filesystem verification

The production-only test installs the frozen lock offline into a disposable root, copies the actual Candidate checker and actual generated Production Prompt data, and materializes one Synthetic compiled build containing a non-empty `BUILD_ID`, server/AI/Prompt/Scanner/Rate Limiter/Turbopack evidence, a governed application entrypoint, one valid public client-reference manifest and its public chunk. Before execution it removes the install-only `.npmrc`, lock/workspace files and pnpm workspace metadata and confirms `next.config.ts` is absent.

The copied checker then runs from a separate empty ambient cwd and completes its normal success output. Because module resolution, Prompt data and the absolute build root all originate in the disposable runtime root, the fixture cannot borrow repository cwd or repository build data. Mutating only the referenced public chunk to contain `@refinedev` returns the fixed later-failure detail plus the specific public-leak refusal. Removing only the copied Prompt authority also fails closed. The complete semantic suite separately retains missing and empty `BUILD_ID`, AST, manifest, traversal/symlink, native-addon and forbidden-needle negatives.

A Reviewer-owned probe additionally ran the copied checker from an alien cwd with both an unset and a relative `CWT_BUILD_DIR`. The observed `BUILD_ID` paths resolved under the copied checker's layout root in both cases and never under the alien cwd. This closes the default/relative caller behavior without executing a Product build.

### Decisive verification

| Check | Result |
| --- | --- |
| Exact Candidate inventory | PASS: five authorized code/test/config files; delivery changes only Technical Escalation Section 10 |
| Runtime-shaped production-only checker | PASS: complete success without lock/config/workspace metadata, then intended public-leak and required-Prompt refusals |
| Public bundle semantic suite | PASS: **157/157** |
| Build Once focused suite | PASS: **7/7**; both platform envelopes and fatal nonzero propagation preserved |
| Workspace/aggregate/CI sequencing | PASS: one successful-build-then-checker sequence per caller; Migration ordering retained |
| Reviewer default/relative anchoring probe | PASS: both resolve from checker layout root; alien cwd unused |
| Unchanged authorities | PASS: `pnpm-lock.yaml`, Dockerfile, Build Once production code, Runtime/outcome/recovery and publication implementation byte-unchanged |
| Static quality | PASS: changed Node syntax, focused ESLint, package JSON parse, CI YAML parse and Candidate diff hygiene |

### Residual scope and disposition

No blocking or nonblocking finding remains in this focused scope. Synthetic compiled output proves the complete known checker interface and assertion behavior, but it does not prove a fresh real Next 16.2.12/Turbopack/Docker emission. The direct `node scripts/check-public-bundle.mjs` path intentionally verifies the selected artifact rather than mutable-workspace freshness; the supported workspace command owns fresh sequencing. `linux/arm64` also remains unevaluated for a new Product until the future formal Build Once executes both unchanged child gates. These are accepted residual risks, not reasons to add another freshness authority or expand local Review.

Stage 6 remains **Partial/HOLD**. The next gate is coordinator acceptance of this Review, followed by a concrete decision on an optional bounded rehearsal or a new formal Product Build Once. This Review authorizes no Product build, image/OCI emission, Push, Registry write, workflow/Runner/cloud action, deployment or Phase advancement.

## Focused Compose infrastructure failure-state diagnostic independent Review

| Item | Reviewed identity / conclusion |
| --- | --- |
| Review type | Independent focused Review with one in-Review Security & Test Simplification Check |
| Existing Runtime tools baseline | `91334b31bc83fb99c486a07c77d9ee6fdbb3a5b2` |
| Actual failure report | `5b9abaaf3ca384e98fedb68a0aa69f85b205d1c9` |
| Code Candidate | `c9bc37dbec143df3f8335b42a6d29fbec5ccf287` |
| Report-only delivery | `d0d71566160e1ac35c2780b1f8d023727dc34995` |
| Scope | `deploy/scripts/preflight-linux-runtime.mjs` and its focused test file only |
| Verdict | **PASS — tools-only diagnostic accepted; one nonblocking Low finding recorded** |

This Review does not reopen the accepted Bundle/Image, Product identity, recovery or outcome-handoff conclusions. The actual native run remains NOT PASS: its failure occurred during Compose infrastructure startup before Migration/Web, and this Candidate does not identify that historical root cause or prove a native Runner PASS. The accepted Product release `68c15e6bcd2900f5e634f6c6c6e3b8b3f5550641` and index `sha256:c8d4d1c3148670a683a3509bafb7d832afc6fbe3bb811e2de19b27ae63540ce4` remain unchanged.

### Security & Test Simplification Check

**PASS.** The Candidate adds one bounded, read-only same-project `docker compose ps --all --format json` collection only after the existing infrastructure-up command returns a numeric nonzero status. It reuses the existing command plan, process runner, project identity, environment, cleanup path and outcome artifact. The diagnostic subprocess is bounded to 10 seconds and 16 KiB. It adds no probe container, retry, log collection, journald dependency, persistent state, secondary writer, classification framework or new acceptance gate. Existing runner defaults remain unchanged. The focused tests are proportionate because they cover the failure-only control flow, sanitizer boundary and actual pinned Compose output shape without creating a parallel authority.

### Failure control flow and retained evidence

The infrastructure-up attempt is marked before execution as before. A numeric nonzero result triggers exactly one diagnostic collection before the unchanged refusal and cleanup sequence, and the original `compose_infrastructure_up_failed` reason remains authoritative. Collection, process or parse failure becomes `null`; it cannot replace the original failure, retry the command, turn failure into PASS or skip teardown. A spawn-level failure from the infrastructure-up command retains the same refusal and records no invented inventory. Successful infrastructure startup and unrelated failure paths omit the optional field.

Collection uses the exact repository, Compose plan, project name and environment of the failed attempt. The parser accepts the pinned Compose 5.3.1 NDJSON shape and compatible JSON array or object framing, limits input and row count, rejects duplicate target entries, and retains only the exact `postgres` and `valkey-staging` keys. Each retained value is restricted to `present`, an allowlisted state, an allowlisted health value and a safe-integer exit code or `null`. Container IDs and names, commands, health text, `State.Error`, environment, mounts, raw stdout/stderr and logs are excluded. Valid output with no target row records `present: false`; unavailable or rejected diagnostic output records `null`.

### S6-ID-L-01 — Low — schema-less object rows are interpreted as successful target absence

Reviewer probes found that parseable object rows with a missing or non-string `Service` property, including `{}` and `{ "Service": 1 }`, produce two `present: false` target results rather than an unknown `null` result. Unknown services represented by valid string names are intentionally ignored and are not part of this finding.

The pinned Compose 5.3.1 output exercised by the real-shape test always supplies a string `Service`, and the command, topology and target names are fixed. The issue therefore has no reproduced effect on the supported normal path, exposes no additional data, and does not affect the original NOT PASS or cleanup behavior. If Compose output silently drifts to a still-parseable but schema-incomplete object, however, the diagnostic could describe target absence where the safer meaning is unknown.

This is a nonblocking accepted residual. When this parser is next changed, reject an object row unless `Service` is a string before filtering non-target service names, with a focused regression case. The current phase does not need a new parser framework or remediation loop solely for this Low finding.

### Decisive verification

| Check | Result |
| --- | --- |
| Exact Candidate inventory | PASS: two authorized code/test files, 156 insertions and 5 deletions; delivery changes only its report |
| Focused Runtime preflight suite | PASS: **19 passed, 1 unchanged environment-dependent skip, 0 failed** |
| Actual Compose 5.3.1 shape | PASS: unique no-port project produced the expected exited/running/health records; its containers and network were removed afterward |
| Resource non-interference | PASS: no `cwt-ps-shape-*` resource remained; the Analyst's separate three-container local full-chain project remained running and healthy |
| Sanitizer boundary | PASS: fixed output keys and fields, bounds, allowlists, safe integer handling, duplicate rejection and raw/dynamic-field exclusion verified; S6-ID-L-01 recorded above |
| Failure-only control flow | PASS: one collection before unchanged refusal/cleanup; null on diagnostic failure; no collection on success or unrelated failures |
| Additive compatibility | PASS: no independent consumer assumes a closed outcome schema; existing outcome upload remains opaque |
| Static quality | PASS: Node syntax, targeted ESLint, Candidate diff hygiene and exact changed-file inventory |
| Protected authorities | PASS: workflow, Dockerfile, package/lock, Build Once Product path, publication and accepted Product identity unchanged |

### Residual scope and disposition

The Candidate improves evidence retained by a future infrastructure-up failure. It does not diagnose run `34145251214`, prove the cause of artifact `10027475980`, or convert that run into PASS. The Analyst's Docker Desktop `json-file` result does not establish behavior on the native journald Runner, and any useful future native evidence still depends on a new authorized run reaching this bounded collector. The separate local full-chain result remains an external coordination input rather than evidence created by this Review.

There is no blocking finding. Stage 6 remains **Partial/HOLD**. The next gate is coordinator acceptance of this Review together with the pending local full-chain result. This Review authorizes no automatic Runtime execution, Product build, image/OCI emission, Push, Registry write, workflow/Runner/cloud action, deployment or Phase advancement.

## Focused Runner child umask repair independent Review

| Item | Reviewed identity / conclusion |
| --- | --- |
| Review type | Independent focused Security / Operational Review with one in-Review Security & Test Simplification Check |
| Parent diagnosis report | `57aba3d9ba63167a2c3d1ee5edd2be74a9f2a74a` |
| Code Candidate | `f6703406353412400cf65536915c7a4614ab7dfe` |
| Native evidence under diagnosis | Tools `cf266ae099995ddaf7a2e9572774cd49bc3c1f19`; run `34161175361`; artifact `10032694897` |
| Scope | Runner launch mask boundary, embedded invocation binding, focused registration/provisioning tests and existing principal report |
| Verdict | **PASS — local causal repair accepted; no new finding** |

This Review preserves all accepted Product, Bundle/Image, Runtime diagnostic and recovery conclusions. Product release `68c15e6bcd2900f5e634f6c6c6e3b8b3f5550641` and index `sha256:c8d4d1c3148670a683a3509bafb7d832afc6fbe3bb811e2de19b27ae63540ce4` remain unchanged. The native run remains NOT PASS: Valkey was retained as `created/null/0` while PostgreSQL was `running/starting/0`, and the destroyed host's actual checkout modes remain unavailable.

### Security & Test Simplification Check

**PASS.** Under `delete → merge → standard mechanism → new mechanism`, the Candidate corrects the leaked inherited process state at the existing Runner-child boundary with the standard shell `umask 022`. The child then immediately `exec`s the existing `nohup → env -u CWT_REGISTRATION_TOKEN → run.sh` chain. It adds no chmod repair, privilege wrapper, alternate launcher, retry, new state, permission walker, persistent harness, diagnostic gate or credential path. The four-file Candidate changes one authoritative launcher, regenerates its already-authoritative embedded invocation, updates the existing focused test and records the result in the existing report. This is the smallest coherent correction because the pinned Runner and checkout action contain no later umask reset before Git creates the worktree.

The intentionally conventional `022` mask applies to the trusted single-use Runner child and its job descendants so tracked executable and ordinary source files receive container-usable modes. It does not override explicit security modes. The outer materialization and registration process remains `077`; the payload remains `0700`; Runner registration state and credentials are created before the child boundary; Runtime GHCR authentication retains its explicit directory `0700` and file `0600` controls. The registration token is cleared before launch and `env -u` remains the final child guard.

### Causal and process-boundary closure

The diagnosed mechanism is a real Git/Linux permission boundary: inherited `077` can create tracked executable files as owner-only `0700`, while the Runtime Compose service executes the bind-mounted file as UID/GID `999:999`. The Candidate changes only the Runner child mask to `022`, causing a fresh checkout to materialize tracked executables as `0755` and ordinary source as `0644`. The protected parent retains `077` after the launch.

The background subshell immediately replaces itself through the existing `exec` chain, so `$!` remains the launched process identity used by the unchanged one-second `kill -0` liveness check. Standard input and both output streams retain the exact `/dev/null` redirections. An immediate launch failure still makes the liveness check refuse with `runner_launch_failed`; there is no retry or false success path. The registration token has already been removed from both exported and local custody before the function call, with `env -u` providing defense in depth.

The versioned Tencent TAT invocation embeds bytes exactly equal to the reviewed launcher. Reviewer recomputation confirmed payload size 3,785, SHA-256 `8722709d99d918ea3c52d020971b8a2c80cbc993b2b0df0ce0cf5c1d5ac0cf0d`, wrapper size 6,938 and SHA-256 `a3309b5ea90710f44ff75ec1d75289f932753e1f81050dbffa22e10d9bb2168f`. All decoded wrapper bytes outside the expected payload size/hash/Base64 bindings are unchanged, and all JSON fields outside `content` are unchanged. Parameter substitution, hidden token placeholder, `ubuntu`, `/home/ubuntu`, 600-second timeout, `saveCommand=false` and disabled COS output remain fixed.

### Decisive verification

| Check | Result |
| --- | --- |
| Exact ancestry and inventory | PASS: Candidate parent is exact diagnosis report; exactly four authorized files changed with no unrelated code |
| Focused registration/provisioning suite | PASS: **35/35**, zero failures and zero skips |
| Linux-filesystem production-launcher suite | PASS: **14/14** inside cached public `node:24.14.0-bookworm`, network disabled, repository read-only |
| Parent/child credential boundary | PASS: Reviewer Linux probe observed parent `0077`, child `0022`, Synthetic `.runner`, `.credentials` and `.credentials_rsaparams` all `0600`, registration token absent and launched child alive under the retained liveness contract |
| Fresh child-driven checkout | PASS: tracked executable `0755`; ordinary public source `0644` on Docker's Linux filesystem |
| Actual Valkey UID/bind proof | PASS: exact 985-byte production entrypoint, owner `1000:1000`, target `/opt/cwt/valkey-entrypoint.sh`, service UID/GID `999:999`; `0700` failed with exit 126/permission denied, while changing only the mode to `0755` produced authenticated `PONG` |
| Container security envelope | PASS: read-only root, all capabilities dropped, `no-new-privileges`, accepted limits/tmpfs, no network or published port, Synthetic secret only |
| Embedded invocation | PASS: embedded payload byte-exact; wrapper outside bindings and operational JSON settings unchanged |
| Static quality | PASS: Bash and Node syntax, targeted ESLint and Candidate diff hygiene |
| Owned cleanup | PASS: Reviewer containers and volumes removed; no labelled Reviewer resource remains |

### Findings and residual scope

No new Blocker, High, Medium or Low finding remains in this focused scope. Existing `S6-ID-L-01` remains an accepted nonblocking Low and is not reopened. The previously recorded Operator OAuth-output and transient-token-file nonconformances remain historical constraints on future methods; this Review performed no credential or provider operation and creates no authorization to use those methods.

The local evidence corrects and reproduces the demonstrated launch → checkout → bind permission mechanism. Because the destroyed native host retained neither its actual file modes nor the raw OCI start error, this PASS is not historical certainty about run `34161175361`. A future separately authorized native Tencent run is still required to establish native Runtime behavior, artifact outcome and journald-host compatibility.

Stage 6 remains **Partial/HOLD**. The next gate is coordinator acceptance of this Review and concrete preparation for the next native run under existing authority. This Review authorizes no Product build/private pull, cloud or TAT action, Runner registration, workflow dispatch, Push/Registry write, deployment, native execution or Phase advancement.
