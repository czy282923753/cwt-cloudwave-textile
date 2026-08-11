# Independent Implementation Re-review Evidence V1.0

## Subject

This evidence package supports the Fresh independent review of exact Candidate `10de3daf142561247e141c140b10966954f8dc9e`. The formal Candidate remained byte-identical and clean. All reviewer mutations occurred only in disposable detached worktrees and were restored before the final clean-state check.

## Remediation-closure result

- H-01 ambient/non-emitting declaration root: PASS, CLOSED after correction attempt 3.
- H-02/NH01: PASS, remains CLOSED after attempt 1.
- Owner DB convergence: PASS.
- M02, NM01, M01, M03, M05 and L01: PASS/non-regression.
- L02 and exact-final M04 proof: FAIL under consolidated new root `IMP3-NM01`.
- Frozen Provider/Prompt/security/public/Schema/package/phase boundaries: PASS.

## Decisive exact-final reproduction

The exact sole architecture command was executed under Node 24.14.0 and TypeScript 5.9.3 against both:

1. clean formal attached HEAD `10de3daf...`; and
2. clean detached exact HEAD `/tmp/cwt-h01-m04-v3-review.Yb9gm2`.

Both exited 1 before proof publication. The decisive payload was:

```text
actual Production static-language baseline differs from V3.1
from=docs/review-evidence/.../REVIEWER_H02_NONREGRESSION_IMPORT_PROBE_V1_0.ts
specifier=../../docs/review-evidence/.../REVIEWER_H02_AUTHORIZATION_ORDER_PROBE_V1_0
resolutionKind=unresolved
```

The physical target under the resulting `docs/docs/review-evidence/...` path is absent. This file was added only in the final docs/evidence successor. All five M04 proof artifacts name the earlier code HEAD `df3369e...`.

## H-01 Fresh causal controls

- Prior attempt-2 boundary plus combined non-emitting `declare function fetch`, `declare class WebSocket`, and `declare const window`: exit 0, reproducing the controlling defect.
- Exact V3 plus the same combined witness: exit 1 with `denied_capability_origin` and `typescript_resolved_non_emitting_repository_declaration`.
- Fresh export-declare class/container, overload-only function, interface-only shadow and `.d.ts`-origin declaration: each exit 1.
- Fresh real local function/class/value/parameter/container forms: exit 0.
- Fresh wrong DB global member and destructured global DB alias: each exit 1.
- Corrected code HEAD baseline: exit 0; 633 candidates, 472 executables, 21 ordinary URLs.
- Disposable final-tree control with only the historical import corrected: exit 0; 644 candidates, 474 executables. This was an isolation control only and was restored.

## H-02 Fresh real-service control

A Reviewer-only Vitest entry created a migrated in-memory PGlite database with Product, Content and malformed Revisions. It called the real `createPhaseBAvailabilityServiceV1`, instrumented each transaction-local `select`, and proved:

- wrong Content Editor: existing Product, malformed and missing -> `authorization_denied`;
- wrong Product Editor: existing Content, malformed and missing -> `authorization_denied`;
- correct Product Editor with stale expected version -> `target_version_conflict`;
- Admin with malformed entity type -> `target_scope_mismatch` after authorization;
- exactly one transaction and one `select` per call.

Together with the checked-in Product/Content Draft/Revision matrix, 2 files / 7 tests passed. Static inspection of `composition.ts` showed the single select projection and no lock/execute path.

## Mandatory non-regression

- All AI: 14 files / 163 tests PASS.
- Context/security: 5 files / 101 tests PASS.
- DB/public/SEO focused: 4 files / 10 tests PASS.
- Lint and strict typecheck PASS.
- Database/read-scope types: 2 positives exit 0; 6 expected negatives exit 2.
- DB foundation verifier PASS.
- Independent Design/Drizzle/Migration mapping: 21/21 and 96/96 exact order.
- Prompt bundle/history PASS; exact-empty Production Prompt and Provider registry verified.
- M02 Fresh classifier controls preserved selected protected/safe boundary.
- Official typegen PASS; exact 247-byte `next-env.d.ts` hash reproduced.
- Isolated server/public webpack fixture PASS: 51/16 and no server marker or Synthetic Prompt leak.
- Public/Product/SEO source bytes unchanged from accepted entry.

## Full-review necessity

`FULL_REVIEW_NECESSITY=NOT_REQUIRED`. The bounded two-file non-runtime correction received full causal and affected-boundary coverage. Mandatory frozen gates were run. The new exact-final architecture failure is deterministic and acceptance-blocking; an unrelated exhaustive application suite would not add relevant evidence.

## Process

The only dependency mechanism was a disclosed temporary symlink from disposable worktrees to the already installed local dependency directory. It was removed before clean-state verification. No package manager, install, materialization, download, registry or network action occurred.
