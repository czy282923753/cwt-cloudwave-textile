# CWT Phase 1B Stage 6 — Option F Trusted CI Build Once Evidence Manifest V1.0

Date: 2026-08-31

Status: **PLANNING/FEASIBILITY EVIDENCE — ready for independent Review; not implementation acceptance**

Authoritative parent: `be8c8867ed0b35ac725a4f02d5addf55e65f1677` (tree `fe34a9a2d6a2521a6bdec2cbdbc93d8a0d885cb4`)

Accepted V1.7 Review: `be2bbb79059444a97b7cadebbea545e530fd6890` (tree `46ee08d5b95dc46fb6d976697546fe01a3b81e2e`; sibling-only)

Read-only Implementer checkpoint: `de40457e2e99d118915998ed57be33257512c0df` (tree `8a151d2a8c20011099d0322ce7d5fd074de215ce`)

## 1. Evidence scope and qualification

All executable evidence was local/Synthetic in disposable directories and local containers. It used no real customer/product/private file, external registry, Provider/account/credential, Push, deployment, target host, protected Staging/Production or Stage 7 action. Synthetic credential values are intentionally omitted.

The final image below is a feasibility subject. It is not the future implementation Candidate, not externally retained and not Production-ready. Local promotion tags demonstrated chronology only and were removed during cleanup.

## 2. Final promotable feasibility subject

### Source and build inputs

| Item | Exact identity |
| --- | --- |
| Disposable source commit | `77ea81ad15120bfcfea17fa6ef8f060f6b96be99` |
| Source tree | `8164abe2466b0e104bc748058dc9b2e9defc23c3` |
| Sole parent | `ae8d1bfe7b571629f822bc832dcd8e6f55f178e6` |
| Source commit epoch / OCI created | `1788152237` / `2026-08-31T04:57:17Z` |
| `git archive` SHA-256 | `113df1d231a75e097c5a3806852ccbb34eb854d23096d5ccce3318170335d6c0` |
| Dockerfile SHA-256 | `56786edaa82d45f2f05cc25642e50e90c228f7fb7a816a6cb495be2bca797822` |
| `next.config.ts` SHA-256 | `d4be16da0989860fe24e29d5cd5b838d4cac20b7d74b69b8e263c9532fb8b7e5` |
| `src/proxy.ts` SHA-256 | `9c9766fd0ca5cabd240b3427b98e9c8d6a49c97711a07aa1ad97e53cbba5c1d5` |
| `package.json` / lock SHA-256 | `70d8306d1d6bd37c7d7941a86eaa8b4d9ca9c53bd482943b6536f8c2ac248d7b` / `e8258c9913d9a9204ac5617bded1fb1922d64e39ca31a15fb20f78510d5efde7` |
| Dockerfile frontend | `docker/dockerfile:1.20@sha256:26147acbda4f14c5add9946e2fd2ed543fc402884fd75146bd342a7f6271dc1d` |
| Node base | `node:24.14.0-bookworm-slim@sha256:d8e448a56fc63242f70026718378bd4b00f8c82e78d20eefb199224a4d8e33d8` |
| Build command boundary | one `--no-cache`, `--network=none`, ordered dual-platform OCI export; `rewrite-timestamp=true`; attached provenance/SBOM disabled |

Prototype-only per-platform dependency tar inputs were exact-pinned and permitted a network-none causal test. They are not selected as Git/runtime artifacts; `OF-02` replaces them with immutable CI dependency-acquisition artifacts outside Git.

### OCI identities

| Item | Exact identity/result |
| --- | --- |
| OCI index | `sha256:0b2e540a3642fd6ee6b3a0795faa8a5a52028127f4cd8781b88c8d7e40ceefa5` |
| `linux/amd64` manifest / config | `sha256:6e69484a118afe60c8b03faa3822f04c93b7f891e22611ac587bca92b4ff6951` / `sha256:bf1996ba07c18480538c60025afb56dda5da6dc519a4052f51fe19b8346ad21b` |
| `linux/arm64` manifest / config | `sha256:bd3e0f0b44e411357a5c20753f221c9aa7433c99160322cb28d1f432535ef275` / `sha256:55a435bb70d953d379357fe6475120c89252475b39ee6f6079c1b2538c4860dc` |
| Config contract | both `created=2026-08-31T04:57:17Z`, `User=10001:10001`, 10 rootfs diff IDs, 21 history entries |
| OCI tar SHA-256 | `5d511261108abf63fa28f47459b2466f5bd9cc060d09039d26e3c4b7e9a3f330` |
| Sanitized Buildx metadata SHA-256 | `3a4245bb393746c25432e2bd0a8921a975cdb3d04f9a36b5e1edbed194214206` |

Toolchain: Docker client/server `29.6.2`; Buildx `v0.35.0-desktop.2` commit `b554ce1...`; BuildKit `v0.31.2`; Docker Scout `v1.24.0` commit `b1c9331...`.

## 3. Decisive proof matrix

| Gate | Positive result | Negative/change-control result |
| --- | --- | --- |
| Runtime residue | Both children: UID:GID `10001:10001`, read-only root, BUILD_ID equals source commit; no runtime pnpm/Corepack/npm, `/app/deploy/vendor`, pnpm state or build cache. No absolute source-home or feasibility-temp path occurs in `/app`. | Missing/wrong BUILD_ID and runtime package-manager/residue assertions fail. |
| Public bundle | Both children: 392 eligible server runtime JS files; GLIDE, FileScanner and AI stay server-only; 20 public page manifests and all client/public exclusions pass. | Client marker/dependency drift is a hard failure. |
| Same-image runtime policy | The same arm64 child runs Production-like and Staging-like Web on the one-host model. Production emits HSTS, indexable robots and Production sitemap; Staging emits HSTS, exact `Disallow: /`, no sitemap and `X-Robots-Tag: noindex, nofollow, noarchive`. Runtime-rendered origins differ correctly. | Build-frozen origin/index policy, different-child environment selection and mixed-child replicas fail focused assertions. |
| Session/Preview isolation | One Synthetic Staging admin session returns `200` in Staging; the same cookie returns `307` in Production. Fabricated Preview cookies return `307`. Production source has zero non-test `draftMode()` calls. | Cross-environment session and cookie-only Preview authority are rejected. |
| Server Actions Origin | A Staging Origin against Production Host returns `500`; Production logs the invalid Server Actions request. | Origin/Host mismatch cannot reach application mutation. |
| Framework schema hygiene | Preview schema lengths are `32/64/64`; Server Actions key length is `44`; node action count `87`, edge `0`. Values and hashes were never emitted. | Schema `32/64/63/44/87/0`, Next `16.2.13`, wrong index and wrong child are rejected. |
| Role matrix | arm64: Staging AI Worker runs and post-readiness `SIGTERM=0`; Production AI, disabled Staging AI and disconnected DB each exit `1`; all six environment one-shots exit `0`; both schedulers start and `SIGTERM=0`. An initial amd64 fixed-sleep probe signalled before tsx/module initialization registered handlers and exited `143` with no Worker log/activity; it was rejected as a readiness proof. The exact amd64 artifact was then observed with both signal bits caught (`SigCgt=0000000100014612`) and exited `0` on `SIGTERM`; scheduler and retention also passed. | Fixed-sleep “readiness”, Production AI widening, implicit retry/launcher and dependency-open behavior fail. |
| Business-secret scan | Every Synthetic secret file was searched as an exact pattern against `.next` and `node_modules`: zero matches. Build metadata/SBOM have zero matches for Synthetic environment secret markers or framework key field/value material. | Any match blocks and revokes the subject. |
| Detached SBOM | Docker Scout indexed 838 packages per child (839 SPDX entries including the document/root); Next, tsx and `@valkey/valkey-glide` are present on both. amd64 SPDX SHA-256 `bab5e5ad...`; arm64 `69e799c9...`. | Missing child/package or subject mismatch blocks. |
| Promotion chronology | Only after all gates, local `staging-validated` and `production-authorized` tags both resolved to index `0b2e540a...`; the running Production-like and Staging-like containers resolved to the same index; no rebuild occurred. | Tag-only, replaced digest or post-validation rebuild is rejected. |

Detached archive/evidence hashes:

- amd64 Docker archive `b8eb168304311f7007e3a9c7ee9e15aa838d0bd28ba67125ca621f2c29f1ece0`;
- arm64 Docker archive `322f350e205799e73b35bbac6ceca80a544ae528e2cd593899f8cc057701b6f7`;
- amd64 SPDX `bab5e5ada9c7d7febb7092b2487d2ab38b1857efabe4d01c5c5148fab99d0439`;
- arm64 SPDX `69e799c925beeee7485e43a6fd7193dd455bb4b32b77818c8ab5daa0dce55bf9`.

## 4. Rejected-subject chronology

| Subject | Disposition and causal evidence |
| --- | --- |
| Index `bce15ae2...` | Rejected: Staging Worker received `SIGTERM` but the Node process did not terminate. It was never promotion-authorized. |
| Index `3eaab541...` | Runtime gates passed, but `/app/deploy/vendor` retained about 407 MB of build-only dependency material. Temporary local promotion tags were immediately revoked. It was never an accepted subject. |
| Index `0b2e540a...` | Final feasibility subject: explicit worker exit handling and build-only vendor removal; all decisive gates passed before local promotion marking. |

This chronology proves fail-closed revocation. It does not authorize reuse of any local image.

## 5. AI architecture gate integration evidence

The unmodified checker correctly failed closed on four new non-AI deployment preflight candidates. In a separate disposable clone with complete accepted Git history, the prototype changed only the existing exact-file disposition and its sealed integrity identities:

- add exactly `deploy/scripts/preflight-compose-graph.mjs`, `preflight-image.mjs`, `preflight-proxy-config.mjs`, `preflight-proxy-ranges.mjs` to `other-project-tooling`;
- no directory wildcard, AI reachability, Provider, credential or Production capability change;
- synthetic-only profile SHA-256 `c3af70b6657dbbaf647ccc223fe1f2ac096fd9ab570d526beb9449c186254a71`;
- selected-pointer integrity `f5df37104a9f65fa133d2cb7c2011b61c28dd14d2b872e2adeb4e42bbbe95989`; and
- Node `24.14.0`, linux/arm64, network-none full gate result: `ok=true`, 903 candidates, 588 executables, 48 inherited mutations, four Phase D bespoke mutations, seven Phase F runtime-authority mutations, `bundleProofReady=false` because this separate gate clone intentionally had no `.next` output, and no emitted aggregate. The final image's independent public-bundle gate passed on both children.

The future implementation must reproduce this through reviewed source changes. The disposable prototype is evidence, not authority.

## 6. Preserved prior closures and limitations

- F-01 direct Node/tsx, F-02 dormant Production Worker, F-03 singular Staging gate, F-04 trusted bootstrap/one-lock/fail-stop and F-05 granular GLIDE/Valkey ACL remain accepted V1.7 contracts. Option F does not edit them.
- The feasibility runtime used focused manually isolated containers; it did not claim the dirty S6-04 Compose/runbook implementation is accepted.
- No external immutable registry, replica, CI identity, signing, vulnerability service, target architecture host, protected Staging/Production or rollback was exercised. These are implementation hooks and future Stage 7 prerequisites, not local proof.
- No O-01–O-25 or X-05/X-06 Stage 7 result is claimed.
- No Schema/Migration was used or identified.

## 7. Lineage, hygiene and independent Review assertions

The independent reviewer must verify:

1. this Candidate's sole parent is exactly `be8c8867...` and Review `be2bbb7...` is not an ancestor;
2. V1.0–V1.7 artifacts and sidecars are byte-identical;
3. the Candidate diff is exactly the four principal V1.0 documents and four adjacent sidecars;
4. every sidecar matches, `git diff --check` passes and the worktree is clean;
5. historical Options A–E retain their original meanings and only Option F is current;
6. the image-secret exception is narrow and every business secret remains environment-private;
7. implementation slices have executable verification, rollback and stop conditions without a second authority; and
8. all named Synthetic containers, networks, volumes and task-created image tags are absent after cleanup, while Implementer HEAD/tree/dirt inventory is unchanged.

Final Technical Lead hygiene observation: all `cwt-option-f-*` containers, networks, volumes and image tags were absent; the Implementer remained at HEAD `de40457e...`, tree `8a151d2...`, with status-inventory SHA-256 `9eb33f636d5b9ff13fa1a3ccb2722be540840ab2ea2fce04c26b33d7a15f8b16` before/after the read-only gate diagnostic and at final recheck. The Technical Lead made no Implementer-worktree write.

The next gate is a **fresh independent Stage 6 Option F feasibility/planning Review**. No implementation, Owner re-presentation, external action or Stage 7 follows from this manifest. Stage 7 remains HOLD and requires a new explicit Owner authorization.
