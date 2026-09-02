# CWT Phase 1B Stage 6 — GitHub Actions / Private GHCR / Tencent Ephemeral Runner Integration Evidence Manifest V1.0

Date: **2026-09-02**

Status: **IMPLEMENTATION / LOCAL-STATIC-SYNTHETIC EVIDENCE ONLY**

## 1. Immutable identities

| Evidence | Identity |
| --- | --- |
| Accepted implementation root | `7d6c92718d3e88ec9ab74490da2a81380f33bc3c` |
| Root tree | `6eaae5a052cb26ea65f6296d93bdc7ab12563914` |
| Review-only accepted Re-Review | `ef7d53be2c00349b3faeb05f557caa7f54121cf6`; not in Candidate ancestry |
| Integration implementation Candidate | `512e7a517b81eb68d90d24ed98c2b826595ff2da` |
| Candidate tree | `d7caa0ef82f139575ef30f36878e0f24465032e6` |
| Candidate sole parent | `7d6c92718d3e88ec9ab74490da2a81380f33bc3c` |
| Branch | `codex/stage6-validation-simplification-v1-1` |

## 2. Exact Candidate path set

```text
A  .github/workflows/cwt-release-publish.yml
A  .github/workflows/cwt-runtime-validation.yml
M  deploy/host/README.md
A  deploy/scripts/release-registry-integration.mjs
A  deploy/scripts/release-registry-integration.test.mjs
M  scripts/verify-ai-architecture.ts
M  test-fixtures/ai-architecture/graph-faults.phase-d.synthetic-only.v1_0.json
```

No other Candidate path changed.

## 3. Bound Candidate file identities

| Path | SHA-256 |
| --- | --- |
| `.github/workflows/cwt-release-publish.yml` | `b24fedeaeeb92f3f7161f3c123637e639fd4e65ac74a1cfbb09f63d45d462527` |
| `.github/workflows/cwt-runtime-validation.yml` | `4400303e9307c71df0a8e42236c857fa3563f92bf87a9c27501aa7ead09ccfae` |
| `deploy/scripts/release-registry-integration.mjs` | `f8e4b114f8b0693df5763e498df93d5f43d4d04959e2fedd73cbb085e7bc8051` |
| `deploy/scripts/release-registry-integration.test.mjs` | `71ee5ad9f5c590e9fe2a9ca8d0eb7a76933d2b618811d2e903438d8f0af7293d` |
| `deploy/host/README.md` | `b6ae958f8d34b9c8acb38a65aab7ee8c5294ad3971dbc88d246cff3edf7c318e` |
| `scripts/verify-ai-architecture.ts` | `6231c3a2b6266b6292bfc0a89897d92aa5f7414df33d0b1a6df5409b83debea0` |
| `test-fixtures/ai-architecture/graph-faults.phase-d.synthetic-only.v1_0.json` | `a9fab9ff77fa7362fc9c774e3c0e4dd4cacc4b582a0da5250e470597ed20de72` |

Preserved authority identities:

| Path | SHA-256 |
| --- | --- |
| `deploy/scripts/build-release-once.mjs` | `8dc86d2db65383eb7eb82d2795bd17e22f900b0aa9a0ac610b22f0c4a47bda5e` |
| `deploy/scripts/preflight-image.mjs` | `159cc7b7501fbc9044ff8964c5af47bfabe6f41b4cb52f272210c870462965ea` |
| `deploy/scripts/preflight-linux-runtime.mjs` | `62f51e46fbdc1dcbcd81c4c6e34c5b901886a45a5fa3dacdf68ff4b909ea1903` |
| `deploy/runtime-validation/linux-amd64-compatibility.v1.json` | `5e33bd99e412d35a7e0cffb6a1c379f0decf7f8f816cb087dc162906977514f0` |
| `compose.yaml` | `c94472509c5000aea77611a9f8c9451c2cff2eddffe96e0885b8953031f277e3` |
| `Dockerfile` | `6abe4092df8a271a0c0e4a35ece0e5acc367ccff9245a75d8b19eb0e4f71f783` |
| `package.json` | `6abc2d9288551a4f4fbb37a49985c15c1c673f884b60f3ff680fda938a03ea0d` |
| `pnpm-lock.yaml` | `a56f4762153297db148ffed5a4ef4dfa0e37fd2b495736b58f70e391e1fcdf9e` |

## 4. Tool and controller pins

| Tool/action | Exact identity |
| --- | --- |
| ORAS | `1.3.3`, commit `210747c29c1d38732b3194878dfd8b5a6b9ad7eb`, clean tree |
| ORAS Darwin ARM64 archive | `sha256:f33fc12753c54172b0d0d19eaa0318d3f90fe9b094d96e8b259c881713c92e1c` |
| ORAS Linux AMD64 archive | `sha256:9ce999f8d2de03fc03968b29d743077a58783e545e5eaa53917ca177352d0e59` |
| `actions/checkout` | `d23441a48e516b6c34aea4fa41551a30e30af803`, tag `v6.1.0` |
| `pnpm/action-setup` | `ff378ebe6b225b0680b81c1ad4498ae0d1d3a5e3`, tag `v6.0.10` |
| `actions/setup-node` | `249970729cb0ef3589644e2896645e5dc5ba9c38`, tag `v6.5.0` |
| `actions/upload-artifact` | `ea165f8d65b6e75b540449e92b4886f43607fa02`, tag `v4.6.2` |
| `actions/download-artifact` | `d3f86a106a0bac45b974a628896c90dbdf5c8093`, tag `v4.3.0` |

The ORAS asset hashes were freshly downloaded and matched. The Action tag identities were resolved from their official Git repositories. No action is referenced by a floating tag in either workflow.

## 5. Invariant-to-proof matrix

| Required invariant | Implemented proof |
| --- | --- |
| no automatic release/runtime trigger | each workflow has only `workflow_dispatch`; static adversarial test rejects Push/PR/Schedule |
| Build Once and Runtime remain separately authorized | two workflows; no runtime call in release workflow and no Build Once call in runtime workflow |
| exact source identity | input is 40 lowercase hex; dispatch SHA, checkout HEAD and clean status must agree |
| digest-preserving publication | ORAS source is `subject.oci@sha256:<index>`; tag and digest descriptors must equal the expected OCI index media type/digest |
| private GHCR | exact registry derives only from lowercase `GITHUB_REPOSITORY`; authenticated descriptor succeeds and anonymous descriptor must fail specifically with an authentication denial |
| tag not authority | publication result and Runtime input are `repository@sha256:<index>`; Runtime workflow constructs no tag reference |
| exact detached evidence | named cross-run artifact contains only release record and evidence; existing verifier rechecks every bound hash against the reconstructed exact layout |
| no image transfer fallback | no Docker save/load/archive, transfer tag, host transfer, DIND or Buildx repair/copy in the new plan |
| job-scoped Tencent Runner | cumulative self-hosted/Linux/X64/provider/region/single-use/unique-nonce labels plus exact Runner name and first-attempt check |
| no Provider/destruction overclaim | Runner result explicitly records `actualProviderAndDestructionProven: false` |
| credentials least exposure | GHCR token exists only in login step; password uses stdin; auth config mode `0600`; Runtime token is read-only |
| one Runtime authority | only existing `preflight-linux-runtime.mjs validate` is invoked |

## 6. Decisive Local/Static/Synthetic verification

| Verification | Result |
| --- | --- |
| registry/workflow focused suite | PASS, 6/6 |
| combined new + existing Linux focused suite | PASS, 16/16 |
| deployment suite at Candidate | PASS, 111/111 |
| full ESLint | PASS |
| strict TypeScript | PASS |
| AI architecture at Candidate | PASS, 933 candidates / 618 executable nodes |
| both workflow YAML files | syntax PASS |
| two ORAS official release archive hashes | PASS |
| five referenced Action commit/tag identities | PASS |
| `git diff --check` | PASS |

The implementation report discloses the one non-decisive initial AI classification failure. It is not represented as PASS.

## 7. Structural negatives

| Check | Result |
| --- | --- |
| Candidate sole parent equals accepted implementation root | PASS |
| accepted Re-Review absent from Candidate ancestry | PASS |
| exact Candidate path set | PASS, 7 paths |
| Schema/Migration/Product/SEO/URL/Publish/Index delta | `0` |
| package/lock/Compose/Dockerfile delta | `0` |
| Build Once/image verifier/runtime validator/profile delta | `0` |
| Private DIND implementation/test delta | `0` |
| historical release/audit/revocation delta | `0` |
| cloud provisioning or persistent Runner manager | `0` |
| retry/classifier/automatic revocation/transition/promotion state | `0` |
| secret/credential value in source, fixtures, logs or evidence | `0` |

Both permanently revoked historical subjects remain denied by the unchanged Runtime authority. No historical record was mutated.

## 8. External prerequisites and claim ceiling

No GitHub workflow was dispatched. No account/package/Environment/Runner was created or changed. No credential was used. No Provider or GHCR API was called for project state. No paid VM was created. No OCI Build Once, GHCR publication/pull, actual Runtime Validation, transition, promotion, deployment, S6-06, S6-07 or Stage 7 action occurred.

Private GHCR retention/no-early-delete/audit/replica, protected GitHub Environments, trusted Build Once Runner, Tencent Singapore VM identity/provisioning/registration/destruction and actual compatibility remain External Validation Required.

This manifest supports only the implementation Candidate and Local/Static/Synthetic evidence. The next gate is exactly one Fresh Independent Implementation / Operations / Security Review.
