# CWT Phase 1B Stage 6 S6-04 B-04 Reproducible-Image Planning Amendment Evidence Manifest V1.1

Status: **TECHNICAL LEAD EVIDENCE CANDIDATE — supports F-01 remediation planning only; fresh independent re-review required**

Date: **2026-08-31**

Principal Candidate: [Technical Disposition and Planning Amendment Candidate V1.1](./PHASE_1B_STAGE6_S6_04_B_04_REPRODUCIBLE_IMAGE_TECHNICAL_DISPOSITION_AND_PLANNING_AMENDMENT_CANDIDATE_V1_1.md)

Authority boundary: **Stage 6 planning only. No implementation, Owner presentation, Provider/protected action, deployment, S6-05/S6-06 or Stage 7.**

## 1. Lineage and immutable inputs

| Evidence | Exact identity / disposition |
| --- | --- |
| Accepted Stage 6 planning Candidate | `cf03e22ce690a1a09b79bba32434a44aaa7046de` |
| Accepted implementation checkpoint | `de40457e2e99d118915998ed57be33257512c0df` |
| V1.0 B-04 Candidate | commit `75be4d9689be85c2c18d762f44a300fe93c3b40d`; tree `d77e13ffa67c663a85c1b238a244d13889d8e4aa`; sole parent `de40457e...` |
| V1.0 Technical Disposition bytes | SHA-256 `7048188d9d951553d192138964e1275130318ccc9a14de4864a1015a6c7eb343` |
| V1.0 Evidence Manifest bytes | SHA-256 `77f924d9278a92df97adc30229f90d2c783dc05d45be5da8974959e83fd1b53a` |
| Failed independent Review | review-only commit `a1a4321ae9741f51dd026ca854b7d6d829390dea`; tree `6ccaf83f0396ea9a765a1a86e3371a0a8623cc88`; sole parent `75be4d...`; Review-file SHA-256 `52c8b69de8622a21a0377eed353c7f7259a28cf405f552062971d87d850946f9` |
| Review ancestry rule | sibling evidence only; `a1a4321...` must not be an ancestor of this Candidate |
| V1.1 required sole parent | `75be4d9689be85c2c18d762f44a300fe93c3b40d` |
| Implementer tree | exact dirty S6-04 worktree at `/Users/calvin/.codex/worktrees/39c0/CWT（CloudWave Textile）项目`; inspected read-only and not copied into Candidate ancestry |

V1.0 artifacts and the failed Review remain byte-identical. This V1.1 adds new files only.

## 2. Accepted evidence carried forward

The independent Review expressly accepted these V1.0 substantive conclusions, which V1.1 does not rerun, relabel or weaken:

- first CWT-layer divergence is BuildKit tar-member mtime; `SOURCE_DATE_EPOCH` and OCI `rewrite-timestamp=true` govern different surfaces;
- Next `16.2.12` random Build ID, Preview/Draft material and Server Actions key are independent byte-divergence sources;
- `generateBuildId` is necessary but insufficient;
- the Next key material is security authority, and a shared deterministic key-bearing image conflicts with current image-secret/environment-isolation authority;
- `OD-B04-01`, Options A–E, and `B04-D1`, `B04-D2`, `B04-D4`, `B04-D5` remain substantively valid;
- exact full OCI equality remains mandatory; and
- no Schema/Migration, Provider/account, protected-environment or Stage 7 action is needed to repair Review F-01.

The only superseded evidence is the executable classification of V1.0 `B04-D3` and its pnpm-runtime assertions.

## 3. Disposable prototype inventory

All prototypes used disposable directories and local containers. No real customer/product/private file, Provider endpoint, Provider key, account, purchase, protected environment, target host or external delivery was used.

### 3.1 Tool and input identities

| Item | Exact value |
| --- | --- |
| Node | `24.14.0` |
| pnpm build tool | `11.9.0` |
| `tsx` runtime loader | `4.23.1` exact; same resolved package moved to Production dependency in the prototype |
| Next | `16.2.12` Turbopack |
| Node base | `node:24.14.0-bookworm-slim@sha256:d8e448a56fc63242f70026718378bd4b00f8c82e78d20eefb199224a4d8e33d8` |
| Supercronic | `0.2.48`; amd64 SHA-256 `88c1b66b94c486f972fdd1a4d1f901e3e75ff04f749cddd60c5db573e3a33c6c`; arm64 SHA-256 `50ae8755e04fa72812d0a1bc47a112a856811cc91cce7b6c875c378a850788bc` |
| Local PostgreSQL | `postgres:18.4-bookworm@sha256:882236b897e39051d2368c5ccc6cda944904723506b2dfc97f2a8f5bc9afa382`; isolated Synthetic databases/users only |
| Build frontend observed | `docker/dockerfile:1.20@sha256:26147acbda4f14c5add9946e2fd2ed543fc402884fd75146bd342a7f6271dc1d` |
| Buildx / BuildKit / Docker | `v0.35.0-desktop.2` / `v0.31.2` / `29.6.2`, inherited from accepted V1.0 diagnosis |

### 3.2 Selected Option A artifact identities

| Platform | Full no-cache base manifest / config | Hardened runtime manifest / config | Build/runtime gate |
| --- | --- | --- | --- |
| `linux/amd64` | `sha256:8a6fdee5a931dfbe24df6faff7b752dc1cb4327bb19a03127dd3170792ff66f3` / `sha256:f800ced617175e0c43877df3a058ef0bc603ddd04be44c2944bd97ed4233f175` | `sha256:87b310b408ecec4845fa4915d28d65a4b8c0d7a2df5f82694704625cfd78188f` / `sha256:ce7f688f571b55280ae04723bf141899bfc94526317bc3c3bf369c30f46706d6` | Next compile + TypeScript PASS; full role matrix PASS after package-manager removal |
| `linux/arm64` | `sha256:e6219d6bb2b64a363a8d1a3eff50e5ad74ade31035e1efe84477912a7ec6ce6e` / `sha256:274cd3c22b2c7dcf97e8cd66b40ee9540aaaf106f950a8ecaf64e3c2060544ab` | `sha256:cb10ad28e083afc808810ff744869fa40aa669c47992e457faee5b2633f7fab4` / `sha256:2f046209b55bb366e6d8e709edaa6ff8871870846b5e060dab1716e042cbd2e4` | same |

These manifests are prototype identities only. They intentionally do not claim V1.0's unresolved full reproducibility/key gate.

## 4. F-01 prototype ledger

| ID | Assertion | `linux/amd64` | `linux/arm64` | Result |
| --- | --- | --- | --- | --- |
| `F01-A01` | Runtime Node and Supercronic exact | `24.14.0` / `0.2.48` | same | PASS |
| `F01-A02` | Corepack/npm/npx/pnpm executable/module surfaces, `.modules.yaml`, workspace-state and Node compile cache absent | all absent | all absent | PASS |
| `F01-A03` | `node_modules/tsx` and exact `.pnpm/tsx@4.23.1/node_modules/tsx` present | present | present | PASS |
| `F01-A04` | Production and Staging Web start non-root/read-only; `/robots.txt` | HTTP `200` / `200` | HTTP `200` / `200` | PASS |
| `F01-A05` | Web SIGTERM | exit `143`, not OOM | exit `143`, not OOM | PASS; direct signal termination |
| `F01-A06` | Enabled-Staging Worker on local PostgreSQL, zero work/Provider calls | running; SIGTERM drain exit `0` | running; SIGTERM drain exit `0` | PASS |
| `F01-A07` | Wrong database credential | prompt exit `1` | prompt exit `1` | PASS fail-closed |
| `F01-A08` | Production and disabled-Staging Worker authority negatives | each exit `1` | each exit `1` | PASS negative control; no Production readiness claim |
| `F01-A09` | Production/Staging Supercronic crontabs parse/start/signal | both exit `0` on signal | both exit `0` on signal | PASS |
| `F01-A10` | Production outbox/cleanup/retention one-shots | `0` / `0` / `0` | `0` / `0` / `0` | PASS |
| `F01-A11` | Staging outbox/cleanup/retention one-shots | `0` / `0` / `0` | `0` / `0` / `0` | PASS |
| `F01-A12` | Focused real-local-PostgreSQL Worker shutdown suite | 3/3 passed | runtime matrix covers arm64 | PASS |
| `F01-A13` | Direct Node without `react-server` condition | refused by `server-only` | not promoted | PASS negative; condition frozen mandatory |

All positive runtime rows used UID/GID `10001:10001`, read-only root and only the already-authorized `/tmp`, Web `.next/cache`, data/log/secret mounts applicable to the role. No `/app` or package-store write was granted.

## 5. Option B rejection ledger

| ID | Observation | Result/disposition |
| --- | --- | --- |
| `F01-B01` | Fresh unnormalized pnpm state, read-only `pnpm outbox:process` | exits `0` and performs no visible install while state is fresh; not sufficient for reproducibility |
| `F01-B02` | Build 1 `.modules.yaml` / workspace state | SHA-256 `e497a164b8234b9206c4cfaffb410f9bb29971c32706f4e2dcec747e2a804793` / `18ac5fb3aecaaff1d8221fb3cdf952805d94eea60c7896260ee73f24a8b34a5d`; time values `17:56:57 GMT` / `1788112617415` |
| `F01-B03` | Build 2 same files | SHA-256 `0b3e0c332309e54e04d0da40a41c660435a5166c579c3046259f4c1004227914` / `5fb56e57fb75a5b67dc4b79a26507edb283efddd0b2b777b336d2d9fc67ce29a`; time values `17:59:08 GMT` / `1788112748491` |
| `F01-B04` | Normalize both fields to source epoch `1788103897000`, then run pnpm read-only | pnpm invokes implicit `install`; inner exit `226`; `EROFS` creating `/app/_tmp_*` |
| `F01-B05` | Future timestamp/private-state mutation | rejected without prototype as unsupported internal-format/freshness authority and a maintenance/security regression |

Option B is not retained as a fallback. Option C is unnecessary because Option A passed the mandatory artifact/role boundary.

## 6. Reviewer mechanical assertions

A fresh Reviewer must reproduce or statically prove all of the following against the committed implementation only after that implementation is separately authorized:

1. exact role tokens equal the closed allowlist in Candidate V1.1 §4;
2. `compose.yaml` and both crontabs contain no complete runtime `pnpm` token;
3. root `tsx` is exact `4.23.1` under `dependencies`, not duplicated under `devDependencies`, and the lock resolution is unchanged;
4. the four operational scripts contain one explicit main; none has top-level `await`; all terminal rejections are nonzero; one-shots close the database; cleanup preserves exit `2`;
5. Worker imports only the sole existing composition root, awaits `join`, handles both signals through `stop`, and has no direct database/provider/repository import;
6. Docker build stages alone contain pnpm/Corepack; runtime image has Node/tsx/Supercronic but no Corepack/npm/npx/pnpm/state file or writable package path;
7. every Web/Worker/Scheduler/one-shot positive and negative row in `F01-A04`–`F01-A13` executes on the exact built `linux/amd64` and `linux/arm64` artifacts;
8. immutable historical AI hash remains exact; current Worker hash is exact; only the four explicit S6-04 preflight `.mjs` files gain build-only project-tooling classification; class count/capability ceilings/mutation probes remain strict; and
9. V1.0 exact OCI equality, key decision, detached SBOM/provenance/scan and all stop conditions remain present.

Any wildcard allowlist, broad `deploy/` classification, runtime package-manager fallback, writable metadata path, hidden install, semantic-only digest comparison, Provider call or Stage 7 action is a fail.

## 7. Document-control verification contract

Before callback and again in fresh re-review:

- `git rev-parse HEAD^` equals `75be4d9689be85c2c18d762f44a300fe93c3b40d`;
- `git merge-base --is-ancestor a1a4321ae9741f51dd026ca854b7d6d829390dea HEAD` returns nonzero;
- the Candidate diff adds only this V1.1 Candidate, this V1.1 manifest and their adjacent sidecars;
- V1.0 file hashes equal §1 and the Review commit/file identities remain exact;
- each sidecar contains exactly `<lowercase SHA-256><two spaces><basename><LF>` and verifies from `docs/`;
- `git diff --check HEAD^ HEAD` passes;
- Candidate has one parent, no rename/mode change and a clean worktree; and
- Stage 7 HOLD, no implementation/Owner presentation and no external-action boundaries remain explicit.

## 8. Claim ceiling and next gate

This manifest proves a bounded planning prototype and an executable F-01 correction. It does not prove final OCI equality, accepted implementation, Production Worker readiness, Provider behavior, target-host behavior, protected-environment behavior or Stage 7.

Next gate: **fresh independent Stage 6 B-04 planning-amendment re-review of V1.1**. Only `PASS` permits coordinator presentation of the unchanged `OD-B04-01` to the Owner.
