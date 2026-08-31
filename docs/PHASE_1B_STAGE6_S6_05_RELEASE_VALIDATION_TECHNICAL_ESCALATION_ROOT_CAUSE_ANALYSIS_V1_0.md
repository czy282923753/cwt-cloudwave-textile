# CWT Phase 1B Stage 6 — S6-05 Release-Validation Technical Escalation Root-Cause Analysis V1.0

Date: **2026-09-01**

Status: **TECHNICAL ROOT-CAUSE ANALYSIS COMPLETE — bounded repair is required; no implementation or acceptance is authorized by this document**

Role: **Independent Technical Root-Cause Analyst**

Principal repair plan: `docs/PHASE_1B_STAGE6_S6_05_RELEASE_VALIDATION_TECHNICAL_ESCALATION_FROZEN_REPAIR_PLAN_CANDIDATE_V1_0.md`

Authority boundary: **Read-only Git/repository/release-evidence inspection, two non-CWT disposable image-custody controls, and documentation only. No product/config remediation, Candidate image build, un-revocation, lifecycle transition, Registry/Provider/protected action, S6-06, S6-07 or Stage 7 action occurred.**

## 1. Executive disposition

The latest S6-05 failure was caused by the validation harness deleting its own runtime image reference. It was **not** a Product, application-image, root Compose, PostgreSQL, Valkey, `HOSTNAME`, `tmpfs`, readiness or Web-runtime failure.

The post-emission setup loaded `cwt.local/release:32835fcd...` into a nested Docker daemon and then removed the same-name tag through the outer Docker daemon. Both daemon endpoints used Docker Desktop's containerd snapshotter and the same containerd image namespace, `moby`. The tag therefore had one shared metadata authority, not two independent stores. Removing it through the outer endpoint removed the nested endpoint's only Compose-resolvable reference. Root Compose then returned `No such image` before either Web container existed and before any application assertion ran.

The causal correction is not another Product patch or another proof layer. It is a replacement of the release-validation mechanics with:

- one explicit validation daemon/store owner;
- one exclusive containerd store/namespace for that owner;
- one digest-qualified Compose reference bound to the emitted index and selected child;
- one reference lifetime extending through Compose teardown;
- cleanup only through the owning daemon, after all consumers are gone; and
- a failure taxonomy that separates harness preconditions from authenticated subject-gate results.

All five listed S6-05 subjects remain immutably revoked. The latest emitted subject cannot be accepted, even though its observed failure was harness-only. Exactly one fresh successor Build Once is required after the replacement validation path and its non-CWT custody preflight are committed and pass.

No new Owner or ADR decision is required. This is a bounded repair of validation mechanics within the accepted Option F Build Once + Exact Digest Promotion authority.

## 2. Authoritative baseline and evidence

### 2.1 Accepted authority

| Authority | Exact identity / disposition |
| --- | --- |
| Last accepted source checkpoint before S6-05 | `7a63f4647b652857c3882f004a7bcb54b38cca5b` |
| Accepted Option F documentation checkpoint | `0842443b61b42dc1a24f5902960cf97a0faf0121`, tree `c8b881952df7e4713983987df7785030889d55f9` |
| Independent accepted Option F Review | `aa82efe825efee3202c0f5e5773048d83352873b` (`PASS`; review-only sibling, not source-line ancestry) |
| Accepted release authority | One emitted OCI index; exact index and child digests are identity; tags are convenience only; promotion never rebuilds |
| Accepted loss/revocation authority | Revocation is irreversible; total subject/evidence loss means `NEW_RELEASE_REQUIRED` |

The current source line from `0842443b...` through `32835fcd...` is linear. The accepted Review `aa82efe...` and failed S6-05 Review `54e7151...` are deliberately sibling evidence and are not ancestors of `32835fcd...`.

### 2.2 S6-05 source and evidence chronology

```text
0842443b61b42dc1a24f5902960cf97a0faf0121  accepted Option F documentation checkpoint
└── 41b5962744e9ea136da4a85fea03a97b26b518ed  S6-05 health/work implementation
    └── f0096d5109000678efc5b65041375c4341151e1c  health-proxy correction
        └── c0d1e646e55f709cfed335db6ad8dfbf968cbc96  Sharp/libvips correction
            └── 886e357ce316372f7b3e08eed12fac09b19105bc  historical S6-05 evidence closure
                └── 31df26ee0d30755d4e7ec5f02e07e37dcd772bc5  HOSTNAME correction
                    └── 32835fcd84dde6842e4e577be8186933f340aae5  tmpfs parsing correction

54e71513cd9bf71ee58b10a125c39cb62c4a1df2  independent S6-05 FAIL (sibling of 31df... line)
```

The latest source tree is `6fc4cc2d74714a11b873aa00e707722d3d181682`. The `32835fcd...` delta changes exactly `compose.yaml`, `deploy/scripts/preflight-compose-graph.mjs` and its test: 32 insertions and 3 deletions. It preserves mount targets/options while replacing YAML flow sequences with complete quoted scalar entries and adding exact normalized/mutation checks.

### 2.3 Latest immutable local evidence

| Evidence | Exact identity |
| --- | --- |
| Latest retained BLOCKED record | `/tmp/cwt-s605-stage6-32835fcd/post-emission/S6-05_TMPFS_POST_EMISSION_BLOCKED.md` |
| BLOCKED record SHA-256 | `65bb17df745f4faa9c7f568338e6be411ee2d14c0519504b9fb2cdf4962a7392` |
| Latest revoked index | `sha256:f5a0431b53f35b9aa9da58e0d8a261dd9e0b88ab42c8ad53f14ddf59661fcf91` |
| Latest release record SHA-256 | `2e72eca528106f7940247bdd81750f9804c59abd53125b57620832e2d76caa0b` |
| Latest revocation marker SHA-256 | `07b55fceccb57efc79a15630c83475b2a969f271d332d18ae4e771e9f2ce8485` |
| Post-emission harness SHA-256 | `c8d1038c70a2bc82152282058906e491248ebf299c244539b4ed983d5db8b8c4` |

All hashes above were independently recomputed. The marker records `runtime_validation_failed`; this historical value remains immutable even though the technical classification in this analysis is harness/process failure.

## 3. Independently established latest causal chain

### 3.1 Retained evidence establishes the failure boundary

The retained BLOCKED record states, and the retained harness source is consistent with, this sequence:

1. the exact new OCI layout was emitted and its two children passed Build Once identity, package-manager, Sharp/libvips, SBOM, scan and provenance checks;
2. the new application tag was loaded into the isolated nested daemon;
3. setup removed the same-name outer tag before root Compose;
4. root Compose, targeting the nested daemon, returned `No such image: cwt.local/release:32835fcd...` for both Web services;
5. infrastructure network/container creation began, but no Web application container started;
6. no readiness, `HOSTNAME`, `tmpfs`, PostgreSQL/Valkey dependency or application-runtime assertion was reached; and
7. the subject was revoked under the then-current fail-stop rule.

The harness uses the mutable tag `cwt.local/release:32835fcd...` as `CWT_IMAGE_REFERENCE`, even though it separately carries the exact index and child digest variables. That made the tag's lifetime a necessary runtime precondition.

### 3.2 Minimal independent reproduction

A disposable reproduction used no CWT subject and no build. It used:

- Docker Desktop `4.84.0`;
- Docker Engine/CLI `29.6.2`;
- containerd `2.2.5`;
- containerd snapshotter driver `io.containerd.snapshotter.v1`;
- the shared container namespace `moby` at `/run/containerd/containerd.sock`;
- existing `alpine:3.22`, image ID `sha256:14358309a308569c32bdc37e2e0e9694be33a9d99e68afb0f5ff33cc1f695dce`; and
- unique temporary tag `cwt.local/technical-escalation:image-custody-01a051`.

The reproduction sequence and observations were:

| Step | Outer endpoint | Nested endpoint |
| --- | --- | --- |
| Before nested load | temporary tag absent | temporary tag absent |
| Load archive through nested endpoint | tag immediately visible | tag visible at the exact Alpine image ID |
| Remove same-name tag through outer endpoint | `Untagged` | no direct nested cleanup invoked |
| Inspect after outer removal | `No such image` | `No such image` |
| Inspect original `alpine:3.22` | exact base retained | underlying content was not the issue |

The nested daemon log independently confirmed that it connected to `/run/containerd/containerd.sock`, enabled the containerd snapshotter, and used namespace `moby`. The reproduction therefore matches the material semantics of the latest S6-05 setup: distinct Docker API endpoints did not imply distinct tag stores.

A positive control then started the same daemon shape with isolated container namespace `cwt-te-image-custody-01a051`. Loading a second unique Alpine tag through that owner produced a resolvable `repository@sha256:14358309...` reference inside the owner, while the outer endpoint could not see the tag. An outer deletion attempt returned `No such image`; the owner still resolved the exact digest afterward. This independently establishes that namespace isolation plus owner-only cleanup is both causal and executable in the current environment.

All resources from both reproductions were removed: helper containers absent, temporary tags absent, archives absent, isolated daemon processes absent, VM mounts unmounted, exact data/exec roots absent, and the original outer Alpine base retained. No CWT tag, subject, marker or release record was changed.

### 3.3 Root cause and contributing conditions

The root cause is **image-reference ownership split across two Docker clients that shared one containerd image namespace**.

Four conditions made the failure deterministic:

1. **Endpoint identity was mistaken for store identity.** Outer and nested daemon API endpoints both wrote the `moby` containerd namespace.
2. **Compose consumed a mutable tag.** The exact digest remained recorded as evidence, but Compose resolved the tag; deleting the tag made the digest graph unreachable through that execution reference.
3. **Cleanup preceded consumer completion.** The outer tag removal ran after nested load but before nested Compose creation/teardown.
4. **Failure classification conflated tool and subject.** A harness precondition failure before subject execution was recorded under the same broad runtime-revocation path as a real application failure.

No OCI-byte corruption, digest mismatch, child-selection mismatch, container crash, health failure or root Compose behavioral regression is evidenced by the latest run.

## 4. Classification of all five revoked S6-05 releases

Revocation state is an immutable historical fact. Classification answers what caused the observed failure; it does not restore eligibility.

| Source / exact index | Marker SHA-256 | Observed causal failure | Classification |
| --- | --- | --- | --- |
| `41b5962744e9ea136da4a85fea03a97b26b518ed` / `sha256:7e87834db55581f12db87d9cd8558a091e75f8a4f5e89c4c38083ed2e832a445` | `a845994d859f43d5672fd3ce62821c14147060bb29d78b6cdc3e02753c231d93` | Public redirect lookup intercepted health before the fixed readiness boundary. | **Genuine Product/runtime blocker.** Supported health execution was wrong. |
| `f0096d5109000678efc5b65041375c4341151e1c` / `sha256:b1ca00024187a896cff240c011642db546a9c1ea9e91405e6b2d80bf81d97039` | `5bfd50ca4c64f3e1c7656f070bb62096b099341c81697b0fffaff32688eb44c8` | arm64 Next standalone omitted `libvips-cpp.so.8.18.3`; Sharp could not load. | **Genuine Product/runtime blocker.** Exact emitted child lacked executable native closure. |
| `c0d1e646e55f709cfed335db6ad8dfbf968cbc96` / `sha256:03e032006e4b2c8a819f6cce5a1425d57e4d34a11bd2e9939d8910d23ce8a867` | `7f07673096adf4ad847803cac9e72f3a21bb94548d037305f1c9c440a193e33f` | Supported root Compose omitted explicit `HOSTNAME=0.0.0.0`; Docker's injected hostname made Next listen away from loopback while health targeted `127.0.0.1`. | **Genuine Product/runtime blocker.** The retained positive harness had added an unsupported override; independent Review reproduced the supported-path failure. |
| `31df26ee0d30755d4e7ec5f02e07e37dcd772bc5` / `sha256:2efe30d0adea1af28eb791cb3339c9ece8ff90d8b380331bfb863dd33f4b1397` | `5122fe78903a681fc21709050c420ab5de580e5c4d7a50117a04a7ff326e8f4a` | Root Compose YAML flow sequences split infrastructure `tmpfs` specifications into invalid mount fragments, preventing dependency creation before Web startup. | **Genuine supported deployment/runtime blocker.** The application image was not the defect, but the authoritative runtime graph was. |
| `32835fcd84dde6842e4e577be8186933f340aae5` / `sha256:f5a0431b53f35b9aa9da58e0d8a261dd9e0b88ab42c8ad53f14ddf59661fcf91` | `07b55fceccb57efc79a15630c83475b2a969f271d332d18ae4e771e9f2ce8485` | Outer same-name tag removal deleted the nested endpoint's shared-namespace tag before Compose; `No such image` occurred before a Web container existed. | **Harness/process blocker only.** No Product/runtime assertion ran. |

The first four revocations reflect supported-path correctness failures that are now closed in source. The fifth reflects validator self-invalidation. The distinction matters for repair scope, not for revocation eligibility.

## 5. Product/runtime correctness versus harness correctness

### 5.1 Product/runtime correctness already established for the latest source

Before the latest emission, the corrected unchanged root Compose path proved:

- exact normalized PostgreSQL and Valkey `tmpfs` scalar arrays;
- daemon-accepted `tmpfs` maps with no split fragment target;
- PostgreSQL and both Valkeys healthy;
- Production and Staging Web healthy;
- exact `HOSTNAME=0.0.0.0` from root Compose;
- exact loopback readiness at `http://127.0.0.1:3000/api/health/ready/`;
- the prior flow-style mutation rejected statically and by Compose creation; and
- no published application/dependency port or external Provider call.

The newly emitted `32835fcd...` children separately passed exact source/release identity, package-manager absence, Sharp `0.35.3` / libvips `8.18.3` executable smoke and detached evidence integrity.

These facts do not authorize the revoked subject, but they sharply bound the latest unresolved cause to the handoff between OCI layout and Compose's image store.

### 5.2 Harness correctness failure

The harness did not preserve the minimum invariant:

```text
the exact Compose-resolvable reference remains owned by the same image store
from successful import through the final consumer teardown
```

Because this invariant failed before container creation, the harness produced no evidence about whether the new subject would have passed or failed the runtime gate.

## 6. Duplicate-proof assessment

The pre-release and post-emission actual-root-Compose proofs substantially duplicated the same native-host behavior:

- same root `compose.yaml`;
- same PostgreSQL/Valkey/Web service subset;
- same Synthetic protected paths;
- same `tmpfs`, `HOSTNAME`, health URL, network and no-port assertions; and
- same local Docker Desktop Linux boundary.

They differed only in application image input: the pre-release diagnostic used the prior revoked `31df26ee...` child to prove the source-only `tmpfs` correction; the post-emission run intended to substitute the new exact child.

That image difference means some post-emission validation remains mandatory: Option F requires the emitted bytes, not a predecessor, to be the accepted subject. It does **not** justify running the whole actual-root-Compose matrix twice.

The proportional replacement is:

- before emission: normalized root Compose validation, exact mutation tests, source quality gates and a non-CWT image-custody self-test only;
- after emission: one authoritative actual-root-Compose runtime proof against the exact digest-qualified new subject.

The prior-image pre-release runtime proof becomes a non-authoritative diagnostic and is removed from blocking acceptance. This deletes a duplicate runtime path and one unnecessary image transfer/lifetime cycle.

## 7. Proportionality assessment

### Blocking because they test real correctness/security

- exact clean source/tree/archive and one Build Once subject;
- OCI index/ordered children/config/layers/evidence and immutable revocation checks;
- both child package-manager absence, non-root runtime and Sharp/libvips executable closure;
- normalized root Compose topology, protected secret mapping, `HOSTNAME`, loopback health and exact `tmpfs` authority;
- emitted-subject runtime positives on both intended architectures, with the existing bounded selected readiness negatives on one host child;
- one exact native-child root Compose integration proof;
- environment isolation, no external Provider calls, no secret leakage and no published dependency/application ports; and
- append-only exact index/selected-child lifecycle behavior after independent acceptance.

### Non-blocking diagnostics or removed

- byte-identical independent rebuilds;
- controlled-root or pre-entry `LD_PRELOAD` resistance beyond the accepted trust ceiling;
- repeated Docker identity-field experiments after the exact index/child resolver is proven;
- optional alternate-layout AI bundle-agreement experiments when the authoritative AI and public-bundle gates pass;
- a second pre-release actual-root-Compose runtime matrix using a revoked predecessor;
- repeating the same native positive in a separate direct harness when the authoritative root Compose proof already covers it; and
- any claim that a self-generated missing-tag condition is Product-runtime evidence.

Harness setup, daemon availability, image import, namespace isolation and cleanup remain blocking **process preconditions**, but they are not Product-gate results and must not be reported as such.

## 8. Decision and claim ceiling

1. The latest root cause is independently established and bounded.
2. The smallest maintainable correction is a single-store, digest-qualified, cleanup-after-consumer release-validation contract.
3. The already-emitted `32835fcd...` subject can never be accepted because its immutable revocation marker exists.
4. One fresh successor Build Once is necessary only after the validation-mechanics repair and all pre-emission gates pass.
5. The Product fixes at `f0096d51...`, `c0d1e646...`, `31df26ee...` and `32835fcd...`, plus the accepted Valkey health/ACL and lifecycle boundaries, remain closed and must be preserved.
6. No Schema/Migration, Product architecture, URL/SEO, Publish/Index, storage, AI, Provider, promotion-state or ADR change is needed.
7. No Owner decision is needed. A new Owner/ADR gate would arise only if the implementation cannot provide one standard daemon/store plus digest-qualified resolution without changing accepted Option F, selecting an external Provider/protected environment, or adding persistent coordination.

The next action is coordinator verification of the adjacent repair-plan Candidate, followed by a fresh separate Implementer task. This analyst must not implement or self-approve.
