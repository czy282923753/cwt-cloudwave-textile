# CWT Phase 1B Stage 6 S6-04 B-04 Reproducible-Image Planning Amendment Evidence Manifest V1.5

Status: **TECHNICAL LEAD EVIDENCE CANDIDATE — supports V1.4 F-04/F-05 remediation planning only; fresh independent re-review required**

Date: **2026-08-31**

Principal Candidate: [Technical Disposition and Planning Amendment Candidate V1.5](./PHASE_1B_STAGE6_S6_04_B_04_REPRODUCIBLE_IMAGE_TECHNICAL_DISPOSITION_AND_PLANNING_AMENDMENT_CANDIDATE_V1_5.md)

Authority boundary: **Stage 6 planning only. No implementation, Owner presentation, Provider/protected action, deployment, S6-05/S6-06, or Stage 7. Stage 7 remains HOLD pending new explicit Owner authorization.**

## 1. Lineage and immutable inputs

| Evidence | Exact identity / disposition |
| --- | --- |
| Accepted Stage 6 planning Candidate | `cf03e22ce690a1a09b79bba32434a44aaa7046de` |
| Accepted implementation checkpoint | `de40457e2e99d118915998ed57be33257512c0df` |
| B-04 V1.0 Candidate | `75be4d9689be85c2c18d762f44a300fe93c3b40d`; tree `d77e13ffa67c663a85c1b238a244d13889d8e4aa`; sole parent `de40457e...` |
| V1.0 Technical / Manifest SHA-256 | `7048188d9d951553d192138964e1275130318ccc9a14de4864a1015a6c7eb343` / `77f924d9278a92df97adc30229f90d2c783dc05d45be5da8974959e83fd1b53a` |
| Failed V1.0 Review | `a1a4321ae9741f51dd026ca854b7d6d829390dea`; sibling-only |
| B-04 V1.1 Candidate | `e0d3b9d6fea0431d00850b1278b8d3717055311e`; tree `551454854a7f976eb104a19d411c88e160624ba8`; sole parent `75be4d...` |
| V1.1 Technical / Manifest SHA-256 | `ffded21bfc497d352c4e8b753bbadf31144c81bc51f885d7931602ab6ab9b040` / `fee3d6460a6ecd8f074bc3212be7bb480e8598bf2df10f61ab4eda049d9a72a3` |
| Failed V1.1 Review | `a694946af822f122e4a2586a42ee39e5978b244e`; sibling-only |
| B-04 V1.2 Candidate | `d8068e4082eb70f1b41f903f0203626125562d77`; tree `486f53b5229f25c697e772754082d52856ecdccb`; sole parent `e0d3b9d...` |
| V1.2 Technical / Manifest SHA-256 | `b7d6a9cffcecf675c3d863035ecc795b6a09b5c1bd706b11043a1ea0ca315dfb` / `8d229e9dfd9db99d6eb2028e01cfd475e8e8c19cafde48bccf36e3c51db53411` |
| Failed V1.2 Review | `a333f4b71b2c12f7a7164a2d7c4688f87a98bef2`; sibling-only |
| B-04 V1.3 Candidate | `6da8450e40e54028926dccdccbc002762674196b`; tree `fc05ec36a267471186a45cc8727aa8fcd9a05d24`; sole parent `d8068e4...` |
| V1.3 Technical / Manifest SHA-256 | `c02a4db98669632bdd669d83e687444d1e998854c943bc9642d9b2c1fa0c7e2b` / `8d8d09d7c9e4e8bdec3ba49324edb8f43b14ff20ddb84fd6badfc90edaa9d5a6` |
| Failed V1.3 Review | `662e5d28b1575dd276620eb81587a9f651d42863`; tree `ce27e34460c4e597625fb6f98c908be45421c1f7`; sibling-only |
| B-04 V1.4 Candidate | `15d536042d002a251796e45b47b141320c33e56e`; tree `cff5df59dae5ff3fce59765b4ce47ceaf0cbecf5`; sole parent `6da8450...` |
| V1.4 Technical / Manifest SHA-256 | `384255cea5601617623c8909c03b99dc25fd1d8984cd2979b35342ac17dcc4ed` / `b3878f22bd7fc074ea50b3ded575b5fc50ab201551a0f5171c4c5804d82d3b9e` |
| Failed V1.4 Review | `e0cabfc0010e1da1c5afc6815980ecb051e02e35`; tree `10441951101bde75f64ea83f1669ef0ec0f59a2a`; sole parent `15d5360...`; Review SHA-256 `168951e87064dc2813bb14bca3a3b031f85a34a7d0cf0bb225b24cdb624aec4b`; sibling-only |
| V1.5 required sole parent | `15d536042d002a251796e45b47b141320c33e56e` |
| Implementer state | HEAD `de40457e...`; dirty S6-04 worktree read-only; status-inventory SHA-256 at planning capture `b73a2412b951b804942fcfbd3e920b90859eb40eabe8a82eddffbd445651dd8f`; excluded |

V1.0-V1.4 principal artifacts and sidecars remain byte-identical. All five failed Review commits must return nonzero from `git merge-base --is-ancestor <review> <V1.5>`. V1.5 adds exactly its two Markdown files and adjacent sidecars.

## 2. Accepted evidence carried forward

V1.5 does not reopen or weaken:

- F-01 direct Node `24.14.0`, exact `tsx@4.23.1`, pnpm build-only/runtime removal, explicit async main/error handling, signal/exit behavior, and dual-architecture role matrix;
- F-02 exact default five, dormant `worker-production` sole `production-ai` profile, restart `no`, Production-only networks, and exact resource arithmetic;
- F-03 one root Compose, one nonblocking-lock repository gate, zero args, exact four-service Staging allowlist, and no raw documented authorized Staging start;
- exact OCI index/manifest/config/layer/diff-ID/file equality, BuildKit/Next entropy and key classification, detached SBOM/provenance/scan contract;
- Options A-E, B04-D1 through B04-D5, and unchanged `OD-B04-01`;
- accepted shared `RateLimiter` singular boundary and retired HTTP/in-memory path; and
- no Schema/Migration, Provider/account, protected environment, S6-05/S6-06, or Stage 7 action.

Only the V1.4 gate-local execution trust gap and incorrect Valkey named ACL/readiness claim are superseded.

## 3. Read-only and primary evidence

| Item | Exact observation / authority use |
| --- | --- |
| V1.4 independent Review | `e0cabfc...` formal `FAIL`; F-04 and F-05 are the only reopened blockers; all prior closures retained |
| Dirty Implementer tree | inspected read-only at `/Users/calvin/.codex/worktrees/39c0/CWT（CloudWave Textile）项目`; exact accepted limiter and current S6-04 Compose/entrypoint/gate paths; no mutation |
| Accepted limiter source | `src/security/valkey-rate-limiter.ts`: GLIDE client name, one fixed Lua, typed unavailable; Lua uses `INCR`, first-write `PEXPIRE`, `PTTL` |
| Exact GLIDE package | `@valkey/valkey-glide@2.5.1`; installed `BaseClient.js` SHA-256 `35a9a6e22361e795d689c39bf1fdf677109f44b443ca657872d94f299ff5f263`; package JSON SHA-256 `a55791d6b6bd8f82ce126e8ae7e5da9c991b2b6d027758261c820414259e5531`; [official repository](https://github.com/valkey-io/valkey-glide) |
| Valkey ACL syntax | [official ACL SETUSER reference](https://github.com/valkey-io/valkey-doc/blob/main/commands/acl-setuser.md); granular `command|subcommand` selectors |
| Script lifecycle | [official SCRIPT LOAD reference](https://valkey.io/commands/script-load/); live trace confirms cold load then `EVALSHA` |
| Client naming | [official CLIENT SETNAME reference](https://valkey.io/commands/client-setname/); exact GLIDE config uses it |
| Bash privileged mode | [GNU Bash privileged-mode documentation](https://www.gnu.org/s/bash/manual/html_node/The-Set-Builtin.html); ignores startup environment/function/shell-option influence selected by V1.5 |
| Docker authority | V1.4 official Docker Engine/context/API/security/package evidence retained; exact local `unix:///run/docker.sock`, CLI config, API, root socket contract unchanged |

Official documentation supports the mechanism, but the exact pinned binaries, package bytes, live wire behavior, and negative matrices are the decisive version-specific evidence.

## 4. Disposable prototype identity and claim ceiling

| Item | Exact value / boundary |
| --- | --- |
| Prototype roots | `/private/tmp/cwt-s6-04-v1-5.I5rXHo` and read-only disposable lifecycle copy `/private/tmp/cwt-s6-04-b04-f04-f05.TZ4Vr6`; neither is Candidate content |
| Ubuntu fixture | `ubuntu:24.04@sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517` |
| Node fixture | `node@sha256:d8e448a56fc63242f70026718378bd4b00f8c82e78d20eefb199224a4d8e33d8`; Node `24.14.0`; pnpm `11.9.0` |
| Valkey | `valkey/valkey:8.1.9@sha256:f0ba225266310efba5fb33383e21c64fbd07907304224786c780606e7ebd7327`; amd64 manifest `sha256:3d9b17f...`; arm64 `sha256:50e8e85f...` |
| GLIDE | exact `2.5.1`; no alternate client, HTTP compatibility layer, or fallback limiter |
| Docker CLI / API / Compose | exact `29.6.2` / `1.55` / `5.3.1`; official Noble packages on both architectures |
| Data | conspicuously Synthetic credentials and rate-limit keys only; no Provider, real file/credential/data, target/protected environment, or external mutation |
| Lifecycle claim | local Docker Desktop fixture proves bounded mechanism/state; it does not prove target Ubuntu/systemd/journald/live-restore, release OCI equality, or Stage 7 |

## 5. F-04 evidence ledger

### 5.1 Exact package and binary identity

| Identity | `linux/amd64` | `linux/arm64` |
| --- | --- | --- |
| Bash package | `5.2.21-2ubuntu4` | `5.2.21-2ubuntu4` |
| coreutils / util-linux | `9.4-3ubuntu6.2` / `2.39.3-9ubuntu6.5` | same |
| Docker CLI `.deb` SHA-256 | `fcc3014d7a8c5c16abda30ce643a498f8b34aa213ad7a14ff8fb30ad07670d7d` | `95b1e7dfee15ffdcbfb8336c3c73fae64d3218ec2300264c489f721e35c7bccd` |
| Compose `.deb` SHA-256 | `19d9473c2f011f94e1e54b035dcac170dab0c19671799db6f015e29eb9f23357` | `6ee2017f5d4909391ac331163e93515a30ca5bd2d892e0e44ab65a46532a64d8` |
| `/bin/bash` | `bc5945feb8bd26203ebfafea5ce1878bb2e32cb8fb50ab7ae395cfb1e1aaaef1` | `af955ef55333c8fc9c5aa50df91ad1a629d9a79a9afa125cd5e9629585f78015` |
| `/usr/bin/env` | `0aefff8f912fb75716c5d4de3b6acde93edbe8fa280fc8ee895c1226d3e373ef` | `dde57443115af498aa981159ba6517b156547173342af36487ed58631d9e47c3` |
| `/usr/bin/id` | `9f2e8d80e1c357b889e1b827566e882411ddc6ff45a70196e808f00e62a6c7c5` | `3b3b0197ad50b7e388e433e4e116bca4c860214148c108909154eb516d2dc9ed` |
| `/usr/bin/stat` | `3b87d297111f11d30b3c51fd2663f131a161e09d8e130e1842adaefb74307efe` | `86b89355842f54a49698069b345eabb94c2f26d2f33b5734ec91c68de8fe6f7a` |
| `/usr/bin/sha256sum` | `9992e1f1feb6f0f396bc8d6691ebc1adbfc269fd628bce84eda1d4ba5c3995c7` | `f3d040161f5c29e4c7cd4e3d6bb513ce9a43b9d1bd06f456a6aab3d34d0f1e33` |
| `/usr/bin/flock` | `487fc764723f08f70a630c517b6847165efab683d42a62f03956320a150cf801` | `2cd7af43ad6967d6049c882ccd914623e30db81e29e7d69e430c4aaa59d44144` |
| `/usr/bin/node` | `e237a2839d0cbdc9a9a2adda1a184afc0f5b20306ffbe923af5686550472d8a8` | `9fbdfa827e8827fe757d063f791df12f94092a4e7f0d32df758b2799114311e5` |
| `/usr/bin/docker` | `628af575ee8499596e7d266c221ee6bb74fbc20de3a81dd6fe5106f81e652db4` | `a35dd75f7309ee7ab912cc108cba220a4864cb058d091c4515ae27e8c7126c11` |
| Compose plugin | `f9ebc6ebdb19d769b793c245a736caaeb198c62587f13b25c660c13b4987f959` | `aa611e811d0ea25897839c404bfb5bf93ce706dc51c500a4457890f5d0606a86` |

### 5.2 Execution and hostile matrix

| ID | Assertion | Exact observation | Result |
| --- | --- | --- | --- |
| `F04-V15-A01` | first external lookup independent of caller | absolute `/bin/bash -p`; builtin environment scan/normalization before any child; hostile PATH/HOME/locale still reached only expected absolute fixtures on both architectures | PASS |
| `F04-V15-A02` | startup injection denied | `BASH_ENV`, `ENV`, `SHELLOPTS`, `BASHOPTS`, `CDPATH`, `GLOBIGNORE`, exported function, and argument cases exited `64`/`66`; injection marker absent | PASS zero-socket |
| `F04-V15-A03` | selectors prefix-complete | DOCKER host/context/config/cert/TLS/API and COMPOSE profile/file/project/env/path classes exited `65` | PASS zero-socket |
| `F04-V15-A04` | shadow/replacement cannot redirect | hostile PATH plus replacements for env/id/stat/flock/node/docker/Compose and both child paths produced no shadow/malicious execution | PASS zero-socket |
| `F04-V15-A05` | exact privilege | root proceeded; non-root returned `77`; non-privileged Bash returned `70` | PASS zero-socket |
| `F04-V15-A06` | clean positive | both exact architecture fixtures returned `0`, invoked exact children, and connected only to the protected fixture endpoint | PASS |
| `F04-V15-A07` | lock exclusion | exact tmpfs parent/file custody plus held FD9 caused concurrent gate return `81` with zero connection | PASS |
| `F04-V15-A08` | no child lock inheritance | every spawned child closed FD9; lock remained held while parent active, `SIGTERM` returned `143`, and immediate post-exit reacquire returned `0` on both architectures | PASS |
| `F04-V15-A09` | V1.4 path/socket negatives retained | missing/type/symlink/hardlink/owner/group/mode/unopenable lock or socket cases and alternate valid context/endpoint refused before lifecycle | PASS |
| `F04-V15-A10` | trust claim bounded | signed-package/activation manifest is trust root; runtime anchors are named; no claim that root-hostile replacement can be self-detected | PASS claim ceiling |

An earlier signal prototype exposed that an inherited lock FD kept exclusion after parent termination. The fixed-FD9 plus literal `9>&-` design removed that root cause; V1.5 freezes the corrected design, not the failed prototype.

## 6. F-05 evidence ledger

### 6.1 Exact observed closure

Live tracing on the exact pin observed `HELLO 3 AUTH`, `CLIENT SETNAME`, cold `EVALSHA`/`NOSCRIPT`, `SCRIPT LOAD`, retry `EVALSHA`, and Lua `INCR`/first-write `PEXPIRE`/`PTTL`. No successful limiter path required `EVAL`, `SCRIPT EXISTS`, `SELECT`, `INFO`, or `CLIENT SETINFO`.

Exact selected line:

```text
user cwt-<environment> on >${password} resetkeys ~cwt:<environment>:rate:* resetchannels -@all +ping +client|setname +script|load +evalsha +incr +pexpire +pttl
```

The broad V1.4 `+script` and unused `+eval` are deleted. Exact GLIDE 2.5.1 attempted denied `CLIENT SETINFO` six times in the traced cold/repeated sample but continued correctly; this best-effort behavior is version-specific and is a mandatory upgrade stop/retest boundary.

### 6.2 Runtime matrix

| ID | Assertion | Exact observation | Result |
| --- | --- | --- | --- |
| `F05-V15-A01` | both architectures/environments | `arm64/production`, `arm64/staging`, `amd64/production`, `amd64/staging` each passed functional and denial harness; aggregate `exact-total|pass=8|fail=0` | PASS |
| `F05-V15-A02` | matching app networks | exact hardcoded Production/Staging backend-network probes used matching user, secret file, and literal environment prefix | PASS |
| `F05-V15-A03` | client/script lifecycle | `CLIENT SETNAME`, cold `SCRIPT LOAD`, and `EVALSHA` succeeded; warm path remained `EVALSHA` | PASS |
| `F05-V15-A04` | atomic two-process contract | two clients jointly consumed exact `30`; `31` rejected; separate action remained isolated | PASS |
| `F05-V15-A05` | TTL | first write set bounded TTL, `PTTL` positive, expiry produced a fresh window/count, and no immortal key appeared | PASS |
| `F05-V15-A06` | auth/environment denial | missing/wrong password, wrong user, default user, opposite user/secret, cross service, and cross prefix all denied in all four cells | PASS |
| `F05-V15-A07` | script/admin denial | only `SCRIPT LOAD` allowed; FLUSH/KILL/EXISTS/DEBUG/SHOW denied | PASS |
| `F05-V15-A08` | client denial | only `CLIENT SETNAME` allowed; SETINFO and all enumerated control/discovery subcommands denied | PASS |
| `F05-V15-A09` | other unnecessary authority | CONFIG/ACL/MODULE/shutdown/flush/key scan/discovery/pubsub/select/data-command set denied | PASS |
| `F05-V15-A10` | fail closed and same-process recovery | while stopped, exact call timed out/failed closed; after exact restart, same process recovered; first count `1`, proving no offline replay | PASS; probe exit `0`, restartCount `0` |
| `F05-V15-A11` | secret absence | no Synthetic password matched container inspect, args, environment evidence, process, or logs | PASS |
| `F05-V15-A12` | health/readiness split | matching named-user PING healthy; independent functional verifier decisive; no operational-gate canary or duplicate S6-05 readiness | PASS design boundary |

During derivation, two disposable-harness defects were found and corrected before decisive evidence: unbraced zsh expansion changed a literal key prefix, and one Staging probe mounted the Production Synthetic secret. ACL logs and exact secret inspection identified each error. They are not product failures; the final hardcoded-prefix/per-environment-secret matrix above is the decisive evidence and the future harness must reject such mapping drift.

## 7. Singular gate and topology replay

| ID | Assertion | Exact observation | Result |
| --- | --- | --- | --- |
| `GATE-V15-A01` | lower bound | exact `1407 MiB` gate exited `1`; Staging remained absent; Production Worker absent; Scheduler paused; reason was insufficient headroom | PASS zero-start |
| `GATE-V15-A02` | positive | exact `1408 MiB` gate exited `0` before `120s` | PASS |
| `GATE-V15-A03` | exact service selection | only `web-staging`, `worker-staging`, `scheduler-staging`, `valkey-staging` became running/healthy | PASS |
| `GATE-V15-A04` | Production isolation | `worker-production` absent/stopped; `scheduler-production` stayed paused; foundation unchanged | PASS |
| `GATE-V15-A05` | network isolation | no Production/Staging cross-network attachment; exact database memberships and one PostgreSQL instance unchanged | PASS |
| `GATE-V15-A06` | health contract | both named-user `REDISCLI_AUTH` healthchecks returned exact PONG; no `-a`, literal secret, unauthenticated/process-only substitute, or weakened wait | PASS |

The lifecycle result is not by itself limiter readiness. `F05-V15-A01` through `A10` are jointly required for S6-04 acceptance.

## 8. One-to-one fresh Review assertions

| Review requirement | Candidate locator | Evidence locator | Mandatory Reviewer result |
| --- | --- | --- | --- |
| entire gate frozen before first external operation | Candidate §§2.1, 3.1 | Manifest §5.2 A01-A03 | privileged absolute entry; builtin rejection; no injection marker/socket/action |
| exact absolute tool/child trust without circular claim | Candidate §§2.1, 3.2-3.3 | Manifest §§5.1-5.2 A04/A10 | both-arch package/binary hashes; installed source hashes; honest bootstrap/raw-root residual |
| lock ownership and release | Candidate §§2.1, 3.4 | Manifest §5.2 A07-A08 | contention zero-action; FD9 closed in children; signal release immediate |
| V1.4 root/socket/Docker selector contract retained | Candidate §§2.1, 3.3-3.4 | Manifest §5.2 A03/A05/A09 | exact 0:0, paths/modes, local socket/config/API; all hostile cases causal |
| ACL derived from accepted client/script | Candidate §§2.2, 4.1 | Manifest §§3, 6.1 | exact trace and granular line; no broad script/eval/category |
| exact real functional positive | Candidate §§2.2, 4.3 | Manifest §6.2 A01-A05 | both architectures/environments/networks; naming/load/evalsha/30-31/TTL/action |
| comprehensive least-privilege denial | Candidate §§2.2, 4.3 | Manifest §6.2 A06-A09 | auth/cross/default/prefix/script/client/admin/discovery/data denial |
| fail-closed and later recovery/no replay | Candidate §§2.2, 4.3 | Manifest §6.2 A10 | stopped unavailable; same-process recovery; count 1; no fallback/offline replay |
| liveness/readiness authority honest | Candidate §§2.2, 4.2 | Manifest §6.2 A12 | PING described only as liveness; S6-04 verifier required; no gate canary/S6-05 duplicate |
| exact 1407/1408 and topology | Candidate §§2.2, 5 | Manifest §7 | lower zero-start; positive exact four; Production/network/resource invariants |
| rollback/stop and implementation ownership | Candidate §§6-8 | Manifest §§8-9 | bounded slices; one replacement; every widening or incomplete proof stops |
| prior closure and authority boundaries | Candidate §§1, 5, 8-9 | Manifest §§1-2, 9-10 | F-01/F-02/F-03/OCI/Next/key/AI/OD unchanged; no Migration/external/Stage 7 |

## 9. Mechanical and cleanup contract

Before callback and again in fresh Review:

1. `git rev-parse HEAD^` equals `15d536042d002a251796e45b47b141320c33e56e`; HEAD has one parent.
2. The V1.5 diff adds exactly four mode-`100644` files: Technical Candidate, Evidence Manifest, and their adjacent sidecars; no rename or prior-file edit.
3. All five failed Review commits are non-ancestors; V1.0-V1.4 sidecars verify; V1.4 Review identity/file hash remains exact.
4. Both V1.5 sidecars use lowercase SHA-256, two spaces, basename, and final LF and verify from `docs/`.
5. `git diff --check HEAD^ HEAD` passes; repository worktree is clean; Implementer HEAD/status inventory remains unchanged.
6. Static text assertions find the exact `bash -p`, reject classes, absolute paths, FD9 child closure, ACL line, denial set, liveness/readiness split, 1407/1408, and Stage 7 HOLD boundaries.
7. Task-created containers, networks, volumes, relay, and images are removed. Disposable directories are moved to Trash or otherwise recoverably cleaned; no protected target is touched.

Any missing item is a planning Review failure, not permission to weaken or reinterpret the contract.

## 10. Claim ceiling and next gate

This manifest proves a bounded local/synthetic planning mechanism and closes the V1.4 Review assertions at Technical Lead level. It does not prove accepted implementation, final release OCI equality, target Ubuntu/systemd/journald/resource behavior, protected environment, Provider behavior, Production, or Stage 7.

Next gate: **fresh independent Stage 6 S6-04 B-04 planning-amendment Review of V1.5 only**. Only a later `PASS` permits coordinator presentation of unchanged `OD-B04-01`. No implementation, S6-05/S6-06, deployment, Provider/protected action, or Stage 7 is authorized.
