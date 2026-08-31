# CWT Phase 1B Stage 6 — Option F Trusted CI Build Once Implementation Report V1.1

Date: **2026-08-31**

Status: **CORRECTED IMPLEMENTATION CANDIDATE COMPLETE — fresh independent implementation/security/operations Review required**

Failed Candidate documentation closure: `8944439a0d0d795358848a358b585a466be2500c`

Failed independent Review: `4475313dacf5177f848a0a49264cc4311e2089e5` (**review-only sibling; not an ancestor of this Candidate**)

Corrected release source commit: `7a63f4647b652857c3882f004a7bcb54b38cca5b`

Corrected release source tree: `0f1039b232c744a7eefaa63f6a7deff89715094e`

Branch: `codex/phase-1b-stage6-option-f-implementation-v1`

Authority boundary: **Owner-authorized bounded F-01/F-02 remediation only. No Registry push, Provider selection, protected Staging or Production deployment, DNS/traffic change, Production credential use, S6-05, S6-06 or Stage 7 action occurred. Stage 7 remains HOLD.**

## 1. Outcome

The two blocking findings in the failed independent Review are corrected at their causal boundaries:

- **F-01:** the runtime no longer retains Yarn/Yarnpkg launcher or backing-module surfaces, and the existing release producer/checker now derives package-manager evidence from each exact OCI child rootfs and its bound SPDX document. A caller-written `pass` is no longer authority.
- **F-02:** the existing protected-secret and root Compose authorities now agree on the exact ten required secret-file classes, including environment-isolated COS access-key IDs. All six protected Web/Worker/Scheduler role parsers close using only their normalized Compose environment and mounted Synthetic secrets.

The failed subject was retained and revoked before producing a successor. Exactly **one** new `build:release-once` invocation was made for the corrected source. It emitted one new dual-architecture OCI subject and exited `0`. All genuine accepted post-emission gates passed; the append-only lifecycle for the new subject reached `promotion_authorized`.

| Identity | Exact value |
| --- | --- |
| Release ID / source commit | `7a63f4647b652857c3882f004a7bcb54b38cca5b` |
| Source tree | `0f1039b232c744a7eefaa63f6a7deff89715094e` |
| Source archive SHA-256 | `832c2959244a3a865eb22c88c29a22f8bfb5ccb15dedbe64ad08e15e7132ddfb` |
| OCI index | `sha256:9af936d47ab8a037e95f52b389a9f31cb80866de3044087476638b9ec1f45162` |
| `linux/amd64` manifest | `sha256:9d5bdf87605138884632b4697848f8551b2f2069cfc0a66946bf9340168bcbe4` |
| `linux/amd64` config | `sha256:2808ee7bb5bea793950a6380f48a100701be09aa57c98f7223c2c66c1293aa50` |
| `linux/arm64` manifest | `sha256:56dd5f0b6e26e49e08ea9ddfb996109806902c03d8ca18f5bdb798e0e916d323` |
| `linux/arm64` config | `sha256:5933b165619b20db797e9f09446ea9a7084b742793881a19f770d8dc079d19bb` |
| Selected local validation child | `linux/arm64` / `sha256:56dd5f0b6e26e49e08ea9ddfb996109806902c03d8ca18f5bdb798e0e916d323` |
| Derived state | `promotion_authorized` |

`release.json` remains immutable at emitted `state: built`; the derived state exists only in two append-only transition records. Tags remain disposable runtime handles and are not identity or authority.

## 2. Failed-subject disposition

| Item | Exact value |
| --- | --- |
| Failed release source | `fedc9ee804ad2073a75e08966df140ff8bea0bf7` |
| Failed source tree | `88e85e8b9eddaa76ba0bbac2835a32aa91ee22b6` |
| Failed OCI index | `sha256:ba865c03cf91c06cda171eccac38ce96012853a0dc3c57e7aeed80cd67d5973b` |
| Revocation reason | `post_emission_gate_failed` |
| Revocation marker | `/tmp/cwt-option-f-stage6-fedc9ee8/revoked/ba865c03cf91c06cda171eccac38ce96012853a0dc3c57e7aeed80cd67d5973b.json` |
| Marker SHA-256 | `2cc53dc0df992d2b69f2de69cbbbebd068b384eca4edd17e560e8e1f146b87e0` |

The corrected checker independently rejects the failed subject because its exact children contain a prohibited runtime package manager. The immutable revocation marker additionally prevents eligibility. Loss verification returns exit `78` with `NEW_RELEASE_REQUIRED`. The failed subject was not edited, rebuilt, reused or made an eligible fallback.

## 3. F-01 correction — derived package-manager evidence

### 3.1 Runtime boundary

The Dockerfile now deletes and then asserts absence of:

- npm/npx and their module surfaces;
- Corepack;
- pnpm/pnpx and pnpm state;
- Yarn/Yarnpkg launchers; and
- the inherited Yarn Classic backing module.

The assertions distinguish nonexistent paths from dangling symlinks. Both emitted children were loaded directly from the new OCI layout. Node `24.14.0`, UID:GID `10001:10001`, Next `16.2.12`, tsx `4.23.1`, GLIDE `2.5.1` native import and Supercronic `0.2.48` passed on each architecture. npm, npx, Corepack, pnpm, pnpx, Yarn and Yarnpkg commands and declared launcher/module paths were absent.

### 3.2 Single evidence authority

`deploy/scripts/preflight-image.mjs` owns the one explicit prohibited-package-manager inventory. It extracts each exact child rootfs from the emitted OCI layout with overlay whiteout handling, inventories prohibited paths, inspects the bound SPDX package names and derives:

```text
runtimePackageManagerAbsent = {
  status,
  rootfsMatchCount,
  sbomMatchCount
}
```

`deploy/scripts/build-release-once.mjs` consumes that same authority to produce evidence. Verification independently derives the result again from exact subject bytes and refuses any mismatch. Both accepted children record `status: pass`, `rootfsMatchCount: 0`, `sbomMatchCount: 0`, with `packageCount: 439` bound to the SPDX inventory.

The existing image-checker test surface now includes real tar-rootfs fixtures, positive derivation, executable-launcher, backing-module and bound-SPDX Yarn mutations, plus a forged caller-written-pass negative. Deployment tests increased from 18 to 27 without adding a second scanner or checker.

## 4. F-02 correction — exact protected-secret closure

`src/config/env.ts` exports the authoritative protected requirement tuples used by the parser. The existing Compose checker owns a matching exact list and compares it to the normalized root graph. The ten environment-specific classes are:

| Literal / file field | Subject suffix |
| --- | --- |
| `DATABASE_URL` / `DATABASE_URL_FILE` | `database-url` |
| `AUTH_SESSION_SECRET` / `AUTH_SESSION_SECRET_FILE` | `auth-session-secret` |
| `FILE_SCAN_API_KEY` / `FILE_SCAN_API_KEY_FILE` | `cloudmersive-api-key` |
| `VALKEY_PASSWORD` / `VALKEY_PASSWORD_FILE` | `valkey-password` |
| `SMTP_PASSWORD` / `SMTP_PASSWORD_FILE` | `smtp-password` |
| `SENTRY_DSN` / `SENTRY_DSN_FILE` | `monitoring-dsn` |
| `AI_PROVIDER_API_KEY` / `AI_PROVIDER_API_KEY_FILE` | `ai-api-key` |
| `COS_ACCESS_KEY_ID` / `COS_ACCESS_KEY_ID_FILE` | `cos-access-key-id` |
| `COS_SECRET_ACCESS_KEY` / `COS_SECRET_ACCESS_KEY_FILE` | `cos-secret-key` |
| `BACKUP_REPOSITORY_PASSWORD` / `BACKUP_REPOSITORY_PASSWORD_FILE` | `backup-password` |

The root Compose graph now defines `production-cos-access-key-id` and `staging-cos-access-key-id`, maps each exact `*_FILE` path and grants all ten environment-specific subjects to each environment's application roles. Together with the three infrastructure subjects, the graph has exactly 23 top-level secrets.

The checker rejects a missing definition, wrong top-level custody path, omitted or extra role grant, wrong target, literal protected value, wrong semantic class and cross-environment mapping/grant. Focused tests also prove the parser tuple list and checker list remain identical.

Using separate random Synthetic files and isolated Synthetic databases, the exact normalized environment/secret set parsed successfully for:

| Environment | Web | Worker | Scheduler |
| --- | --- | --- | --- |
| Production | PASS | PASS | PASS |
| Staging | PASS | PASS | PASS |

No secret values were printed, committed, put into public Assets or used across environments. No real credential or Provider connection was used.

## 5. Validation ledger

### 5.1 Build, subject and lifecycle

| Gate | Result |
| --- | --- |
| Failed subject revocation | PASS; immutable marker present and old exact subject rejected |
| New Build Once count | PASS; exactly one invocation for release `7a63f464...` |
| Build result | PASS; exit `0`, one ordered `linux/amd64,linux/arm64` OCI index |
| Corrected exact-subject checker | PASS at `built`, `staging_validated` and `promotion_authorized` |
| Detached evidence | PASS; exact children/configs/SPDX/scans/provenance bound |
| Package-manager derivation | PASS; both children rootfs/SPDX counts `0/0` |
| Loss and revoked-subject behavior | PASS; fail closed, exit `78`, `NEW_RELEASE_REQUIRED` |

Docker Scout indexed each exact child locally. The subject-bound SPDX documents and scan records use package count `439`; no external vulnerability-feed clearance is claimed.

### 5.2 Exact emitted runtime and normalized Compose

| Gate | Result |
| --- | --- |
| amd64 and arm64 runtime pins/native import/user | PASS |
| All prohibited package-manager commands/paths | PASS; absent on both children |
| Normalized Compose graph | PASS; 10 services, exact profiles/networks/resource arithmetic, 23 secrets |
| Six protected role parsers | PASS; exact normalized role environment plus ten mounted Synthetic secrets |
| Production Web | PASS; robots indexable, HSTS/CSP |
| Staging Web | PASS; `Disallow: /`, noindex/nofollow/noarchive, HSTS/CSP |
| Preview and cross-Origin action | PASS; private no-store/noindex 404; cross-Origin rejected with 500 |
| Worker refusal/fail-closed paths | PASS; Production, disabled Staging and disconnected Staging exit 1 without secret leakage |
| Staging Worker graceful stop | PASS; SIGTERM exit 0 within 30-second grace |
| Scheduler and three one-shots | PASS; scheduler SIGTERM exit 0; zero-work one-shots exit 0; lock collision exit 75 |
| Nginx | PASS; real `nginx -t` as UID 101, read-only, cap drop, bounded tmpfs |

Three runtime-lab harness corrections are disclosed to preserve test chronology:

1. the first Web aggregation assertion expected exact `noindex,nofollow`, while the actual accepted response was the stronger `noindex,nofollow,noarchive`; all required Web policy checks had passed;
2. a subsequent aggregation assertion required the default Web process to exit `0` after signal, although the accepted Web contract contains no such exit-code requirement; the policy observations remained valid; and
3. the first one-shot aggregation omitted non-secret `SMTP_USER` from the Synthetic `runtime.env`; adding conspicuous Synthetic `synthetic@invalid.example` to the temporary lab input allowed all three one-shots to exercise their accepted paths.

These were errors in temporary assertions/Synthetic input, not subject, source, Compose or accepted-gate failures. They did not alter the committed source or emitted evidence and therefore did not trigger revocation. All lab containers were removed after validation.

### 5.3 Source quality gates

| Gate | Result |
| --- | --- |
| `pnpm test:deployment` | PASS; 27/27 |
| Focused protected env/secret tests | PASS; 11/11 |
| `pnpm lint` | PASS; exit 0, zero warnings |
| `pnpm typecheck` | PASS; exit 0 |
| AI Prompt/history | PASS; direct verifier plus 24/24 tests |
| AI architecture | PASS; exact head `7a63f464...`, 908 candidates, 593 executable nodes |
| Full Vitest | PASS on the exact committed byte tree; 155 files passed, 11 skipped; 1,221 passed, 85 skipped |
| Exact-release local Next build | PASS; Next `16.2.12`, all routes dynamic |
| Public bundle | PASS; 392 eligible server JS, 20 public manifests, 15 distinct public chunks |
| `git diff --check` / clean source checkpoint | PASS / PASS before this documentation closure |

The local Next build is a source quality gate and did not invoke `build:release-once` or emit a second OCI successor.

## 6. Scope, complexity and compatibility

The bounded remediation changes exactly 10 implementation paths relative to failed Candidate closure `8944439...`: 298 insertions and 51 deletions before this V1.1 documentation closure. V1.0 documents and failed evidence remain unchanged.

There is no Schema/Migration, URL/SEO, Product, Publish/Index, storage-boundary, Provider, database-authority or external-interface change. No second Compose file, scanner, checker, secret manager, promotion service or persistent coordination mechanism was added.

Complexity increased only where independent byte-derived proof requires OCI layer application, whiteout handling and rootfs/SBOM comparison. The change reduces authority risk: one prohibited inventory, one producer path, one verifier and one exact protected-secret closure replace the previous constant evidence and parser/Compose disagreement. This follows Root Cause First, Simplification First and Replace Not Layer; rollback remains commit-scoped to the failed Candidate plus its ineligible subject.

## 7. Rollback, claim ceiling and next gate

Code rollback may return to the prior source only as a development checkpoint; it must not make the revoked index eligible. Artifact rollback may select only a separately reviewed immutable digest graph with complete matching evidence. Loss of the corrected retained subject/evidence requires a newly authorized source/release and a new complete Build Once path.

This local/Synthetic implementation handoff does not prove or authorize:

- private immutable Registry custody, replica, no-overwrite/no-early-delete or audited access;
- external vulnerability-feed clearance;
- target Linux static-shell paths, root-only Docker socket or `/proc/meminfo` behavior;
- protected Staging/Production exact-digest selection, real secrets, Provider/account behavior, DNS or traffic changes; or
- S6-05, S6-06 or Stage 7.

Mandatory next gate: a **fresh independent implementation/security/operations Review** must inspect corrected source `7a63f464...`, OCI index `sha256:9af936d...`, both exact children, F-01/F-02 negative tests, old-subject revocation and the V1.1 evidence closure. **Stage 7 remains HOLD pending explicit Owner authorization.**
