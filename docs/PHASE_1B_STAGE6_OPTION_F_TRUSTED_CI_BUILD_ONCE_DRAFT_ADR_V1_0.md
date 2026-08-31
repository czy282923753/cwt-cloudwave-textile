# Draft ADR — Trusted CI Build Once and Exact Digest Promotion

Date: 2026-08-31

Status: **DRAFT — Owner direction recorded; pending independent Stage 6 planning Review and later bounded implementation acceptance**

Decision record: `docs/PHASE_1B_STAGE6_OPTION_F_TRUSTED_CI_BUILD_ONCE_OWNER_DECISION_RECORD_V1_0.md`

Authoritative planning parent: `be8c8867ed0b35ac725a4f02d5addf55e65f1677`

## Context

Next.js `16.2.12` generates build-specific Preview/Draft and Server Actions cryptographic material and embeds it in server output. The accepted B-04 diagnosis proved that fixed timestamps and an explicit `generateBuildId` remove ordinary build entropy but do not remove this framework entropy. A supported public override for the complete Preview material is not available in the frozen baseline.

Historical Option B could make two environment-specific images reproducible but would create parallel image authority and private-format coupling. Historical Option C would mutate private framework output at startup. Both conflict with the Owner's selected direction.

The Owner instead accepts one trusted build and a narrow shared-framework-material exception, while retaining exact-digest identity, runtime business-secret separation and all application authorization boundaries.

## Decision

### One subject and one promotion path

The release authority builds one ordered `linux/amd64`, `linux/arm64` OCI index in one trusted CI execution. Once the index is emitted, these identities are immutable evidence:

- source commit/tree and non-secret release ID;
- OCI index digest;
- per-platform manifest, config and ordered layer identities;
- build frontend/base/tool/package inputs;
- detached build metadata, SBOM and security evidence bound to the exact child subjects.

Staging validates the exact recorded subject. Production promotion later authorizes the same digest; no rebuild, byte-changing copy or new index is permitted. A release name or tag is not identity.

The multi-platform index is portability packaging, not permission to mix child architectures in one running environment. The single application host selects one child; Production and on-demand Staging on that host therefore use the same child and its framework material. A later target-architecture change must validate that exact child before both environments select it.

### Narrow framework-material exception

The same image may carry only the Next-generated Preview/Draft and Server Actions framework material produced by that build. It remains sensitive registry content, but is permitted to be common across Staging and Production because application authority remains environment-private:

- there are zero production uses of Next `draftMode()`;
- Preview cookies alone do not resolve an authenticated CWT user or authorize a preview route;
- the auth cookie is host-only (no `Domain`), `Secure`, `HttpOnly` and `SameSite=Strict`;
- auth/session secrets, session rows and all business databases are separate;
- Next rejects a Server Action Origin/Host mismatch before application mutation;
- every protected mutation still resolves the environment-local user and calls existing role-, permission- and record-scoped Domain Services;
- Publish and Index remain independent human authorities; and
- Production AI remains prohibited.

Any demonstrated bypass invalidates this ADR and stops promotion.

### Runtime configuration

All environment-specific public response policy is evaluated at request/runtime, not frozen at build time. Production and Staging use separate runtime configuration and secret files. The build receives no business credential and no environment-specific application secret.

### Registry, evidence and loss boundary

The future external activation target is a private immutable registry with least-read access, audit, no overwrite and retention sufficient for rollback. One access-controlled backup/replica retains the complete blob graph and detached evidence. Evidence tooling must not attach additional manifests that redefine the accepted image index; use digest-bound detached artifacts/records.

If all retained copies are lost, there is no local inference or deterministic-rebuild promise. A new source/release identity, digest, validation and promotion record are required.

## Consequences

### Benefits

- one image authority replaces environment-specific builds and runtime mutation;
- Staging validates the bytes later eligible for Production;
- framework entropy is contained by immutable digest rather than hidden or ignored;
- application/business secret separation remains explicit; and
- rollback selects a previously retained accepted digest without rebuilding.

### Costs and residual risks

- registry readers can obtain the embedded framework material, so image read custody is security-sensitive;
- exact independent rebuild equality is not promised for the accepted subject;
- a lost subject cannot be recreated with the same digest;
- every intended Production architecture needs matching-child validation; and
- mixed-architecture replicas are outside this single-host ADR because separately built children may carry different framework material; and
- a Next upgrade or framework schema change reopens the exception and requires a new reviewed ADR revision.

These residuals are accepted only within the recorded Owner boundary. Raw root, Docker-socket and all-FD9-holder-loss ceilings remain governed by accepted V1.7; Option F creates no new recovery authority.

## Rejected alternatives

- historical A: indefinite HOLD;
- historical B: separate Production/Staging image digests;
- historical C: startup materialization of private Next manifests;
- historical D: excluding random files or using semantic equality;
- historical E: predictable keys derived from release metadata;
- patched Next, custom entropy interception, custom bundler, Webpack fallback, sidecar, HTTP compatibility layer or gate suppression; and
- rebuilding after Staging and treating the replacement as promoted.

## Compatibility and impact

- Next remains exactly `16.2.12`; Node remains `24.14.0`; pnpm build tooling remains `11.9.0`; Supercronic remains `0.2.48`.
- The ordered platform set remains `linux/amd64`, `linux/arm64`.
- The modular monolith, one PostgreSQL instance with separate DBs/users, Valkey authority, Cloudmersive direction, storage partitions, URL/SEO, Draft/Publish/Index and AI authority do not change.
- No Schema/Migration is required. Discovery of one is a stop condition and requires a new decision/ADR.
- Build load moves to trusted CI; the 2 vCPU/4 GB application host is not a live build authority.

## Implementation ownership

The implementation is bounded to:

- `next.config.ts`, `src/proxy.ts`, `src/app/layout.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`;
- `.dockerignore`, `Dockerfile`, `package.json` and the exact existing direct Node/tsx role scripts;
- `compose.yaml`, `deploy/schedule/`, existing `deploy/scripts/preflight-image.mjs`, Compose graph/gate tests and deployment runbooks;
- one CI build-once entry under existing `deploy/scripts/` authority and one package command;
- `scripts/verify-ai-architecture.ts` plus its current synthetic-only profile solely to classify the four exact non-AI deployment preflight paths; and
- one versioned digest/evidence report for the built implementation Candidate.

No second Compose file, image builder, promotion daemon, lease, database row, startup rewriter, package-manager runtime path or fallback image authority is permitted.

## Verification and rollback

Acceptance requires the implementation plan Candidate's exact gates, including runtime policy separation, session/Preview/Origin negatives, bundle and AI gates, both platform children, detached SBOM, secret scanning, rejected-digest handling and one-subject promotion chronology.

Rollback revokes the failed promotion record and selects a previously retained, independently accepted digest. It never rebuilds the failed release, restores a rejected digest, shares a business secret, weakens an authorization gate or mutates private Next output.

## Stage boundary

This draft ADR does not authorize CI/registry account access, purchase, credentials, Push, external artifacts, deployment or protected-environment action. Stage 7 remains HOLD and requires a new explicit Owner authorization.
