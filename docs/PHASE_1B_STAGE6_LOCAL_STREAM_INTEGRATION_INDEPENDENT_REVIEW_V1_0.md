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
