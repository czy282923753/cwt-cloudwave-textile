# CWT Phase 1B Stage 6 — Option F Trusted CI Build Once Owner Decision Record V1.0

Date: 2026-08-31

Status: **RECORDED — Owner direction; implementation and external activation are not authorized by this record**

Decision ID: `OD-B04-01-SUCCESSOR-OPTION-F`

Authoritative planning parent: `be8c8867ed0b35ac725a4f02d5addf55e65f1677` (tree `fe34a9a2d6a2521a6bdec2cbdbc93d8a0d885cb4`)

Prior accepted planning review: `be2bbb79059444a97b7cadebbea545e530fd6890` (review-only sibling; not Candidate ancestry)

Authority boundary: **Stage 6 planning only. Stage 7 remains HOLD and requires a new explicit Owner authorization.**

## 1. Evidence source and chronology

The evidence source is the current Owner instruction delivered through coordinator thread `01a051a7-d4bd-7b11-ae72-a73c2da43656` on 2026-08-31. The Owner selected a new direction after the independently reviewed V1.7 package made the original `OD-B04-01` alternatives eligible for presentation.

The chronological record is:

1. V1.0 documented historical Options A–E without selecting one.
2. V1.7 preserved those options and closed F-01 through F-05 at planning level.
3. Independent V1.7 Review `be2bbb7...` returned `PASS`; it did not select an option.
4. The Owner rejected historical Option A (`HOLD`), did not select historical Option B, and selected the new **Option F — Trusted CI Build Once + Exact Digest Promotion** direction.
5. Option F is a successor decision. It does not rename or rewrite historical Options A–E. In particular, historical Option C remains “one deterministic base image plus runtime manifest materialization” and remains rejected.

## 2. Recorded decision

One trusted CI execution builds one pinned multi-platform application image subject exactly once. The resulting OCI index digest and its `linux/amd64` and `linux/arm64` child identities are recorded immediately. Staging validation and later Production promotion refer to that exact digest graph. Promotion is an authorization-state change for the already-built subject; it is not another build, copy with changed bytes, or later digest.

The Owner approves one narrow image-secret exception: the same image may necessarily contain and share between Staging and Production only the Next.js `16.2.12` framework-generated Preview/Draft material and Server Actions encryption material produced by that one build.

This exception is conditional on executable proof that the shared framework material cannot bypass:

- hostname and Origin enforcement;
- host-only, `Secure`, `HttpOnly`, `SameSite=Strict` authentication-cookie custody;
- environment-private authentication/session secrets and databases;
- current-user resolution, role/permission checks and record-scoped Domain Service authorization;
- Draft/Review/Publish/Index separation; or
- the existing Production AI prohibition.

No other secret class is reclassified. Database, SMTP, AI/Provider, scanner, Valkey, authentication/session, storage, admin, analytics, monitoring, backup and infrastructure credentials remain runtime-injected and environment-private. They may not enter image layers, history, config, Git, logs, build metadata, SBOM, provenance or public evidence.

## 3. Exact operational and security conditions

- The image is stored by immutable digest in a private registry with no overwrite and no early deletion.
- Registry read access is sensitive because it exposes the approved framework material. Access is least-privilege and audited.
- One access-controlled backup or replica must retain the complete OCI graph and digest-bound evidence.
- Staging and Production must reference the same accepted OCI index digest. Each deployed architecture must match the recorded child manifest and config.
- Under the single-host topology, Production and on-demand Staging use the same selected host-architecture child. Mixed-architecture replicas inside one environment are not authorized by this decision.
- A tag is convenience only. A tag, mutable channel or repository name is never identity or promotion authority.
- Framework key values and their hashes must not appear in Git, logs, public metadata, build metadata, SBOM, provenance, reports or callbacks. Evidence may record only expected schema/length/count invariants.
- A failed or rejected image subject is never made promotable. If a recorded subject fails any gate, it is revoked; no rebuild may be substituted under its evidence record.
- If every retained copy of an accepted image or required evidence is lost, the same digest is not promised or reconstructed. Recovery means a new authorized source/release identity, a new build/digest and the full Staging/promotion path.
- Independent rebuild equality remains a useful nonblocking improvement. It is not an acceptance condition for Option F and must not be reintroduced as a hidden two-build gate.

## 4. Non-authority boundary

This decision does **not** authorize:

- product/runtime implementation in this planning task;
- a CI, registry or cloud Provider selection, account, subscription, purchase, spend or commercial-term acceptance;
- credentials, registry Push, external artifact upload, Provider call or real file/data transfer;
- protected Staging/Production access, deployment, DNS, traffic, target-host mutation or Production activation;
- Schema/Migration, S6-05, S6-06 or Stage 7; or
- weakening any accepted F-01–F-05, bundle, AI, storage, network, database, Publish/Index or raw-root fail-stop boundary.

Any external CI/registry/provider/account/access choice is a later Owner/Stage 7 gate. If the standard private immutable registry/replica or exact-digest promotion contract cannot be provided without a materially different business, security or authority direction, stop and return for Owner decision.

## 5. Relationship to historical alternatives

| Historical/new option | Current disposition |
| --- | --- |
| A — HOLD for supported mechanism | Rejected by the Owner for the current direction. |
| B — environment-specific immutable images | Not selected; two environment image authorities are prohibited. |
| C — deterministic base plus runtime private-manifest materialization | Remains rejected; no startup mutation or private Next output rewriter. |
| D — ignore random files / semantic equality | Remains rejected; exact accepted subject identity is mandatory. |
| E — derive keys from public release metadata | Remains rejected as predictable key material. |
| **F — Trusted CI Build Once + Exact Digest Promotion** | **Selected, subject to this record and fresh independent planning Review.** |

There is no fallback chain. A failure of Option F stops; it does not silently activate A–E, an environment-specific rebuild, a startup materializer or a semantic-only comparison.

## 6. Required next gates

1. Fresh independent Stage 6 feasibility/planning Review of the Option F package.
2. Only after `PASS`, one bounded Stage 6 implementation Candidate may be produced; the existing Implementer task/worktree may be reused after the coordinator supplies the accepted delta.
3. One independent implementation/security/operations Review must verify the exact built subject, digest chronology, secret exception and unchanged F-01–F-05 boundaries.
4. After accepted Stage 6, stop. **Owner authorization is required before Stage 7.**

This record is not self-approval and does not dispatch implementation or Review.
