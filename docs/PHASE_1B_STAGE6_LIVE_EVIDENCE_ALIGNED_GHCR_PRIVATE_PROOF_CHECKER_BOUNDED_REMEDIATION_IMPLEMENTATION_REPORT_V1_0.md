# CWT Phase 1B Stage 6 — Live-Evidence-Aligned GHCR Private-Proof Checker Bounded Remediation Implementation Report V1.0

Status: **IMPLEMENTED CANDIDATE — Fresh Independent Review required**

Implementation commit: `a77e8d1a9cd5dc1c494fc4a44987e8cf983f8094`

Evidence manifest: [PHASE_1B_STAGE6_LIVE_EVIDENCE_ALIGNED_GHCR_PRIVATE_PROOF_CHECKER_BOUNDED_REMEDIATION_EVIDENCE_MANIFEST_V1_0.md](./PHASE_1B_STAGE6_LIVE_EVIDENCE_ALIGNED_GHCR_PRIVATE_PROOF_CHECKER_BOUNDED_REMEDIATION_EVIDENCE_MANIFEST_V1_0.md)

## 1. Scope and source

This Candidate starts exactly from clean Operator closure `5012e003fc80594e3b4edd474c885075815e9522`, tree `35d4cd8d049b37574a7c318f86233a8ad35ea1f9`. Prior review-only commit `0fb5561e2aed132673b003dad4df60514da627a3` remains excluded from Candidate ancestry.

The mutation is limited to:

- `deploy/scripts/release-registry-integration.mjs`;
- `deploy/scripts/release-registry-integration.test.mjs`;
- this append-only report, its evidence manifest and adjacent sidecars.

No GitHub/GHCR setting, Provider observation, push, workflow, Build Once, Runner, Tencent resource, Production host, COS, Runtime Validation, promotion or deployment action occurred.

## 2. Root cause

The prior remediation replaced a broad substring regex with an overfit assumption that complete private denial must be one exact GHCR token-endpoint `403: Forbidden` form. The accepted live evidence recorded by Operator closure `5012e003` instead showed pinned ORAS `1.3.3` returning one structured Registry error:

`Error response from registry: unauthorized: authentication required`

The process context was already strict: credential-free empty mode-`0600` config, exact digest target, authenticated descriptor agreement, exit `1`, no signal/spawn error and empty stdout. The former predicate discarded that valid semantic denial because it depended on the unverified endpoint/status shape.

## 3. Corrected boundary

The unverified 403 URL assumption was deleted. The replacement remains one predicate in the existing proof boundary:

1. require an exact lowercase `ghcr.io/<owner>/<repository>@sha256:<64 hex>` reference;
2. require that reference repository to equal the canonical expected repository;
3. require its digest to equal the immediately preceding authenticated exact-digest descriptor;
4. require ORAS exit exactly `1`, no signal, no spawn error and empty stdout;
5. require stderr to be at most 256 characters and parse as exactly one ORAS Registry error line with bounded lowercase `code` and `message` fields;
6. accept only semantic code `unauthorized` paired with message `authentication required`.

This is semantic field parsing, not equality against one complete stderr sentence and not substring matching. The anonymous config creation, credential-free invocation, digest-rooted descriptor command and `finally` cleanup remain unchanged.

## 4. Fail-closed behavior

The focused adversarial matrix proves rejection of:

- anonymous success;
- bare Registry manifest first-hop 401;
- the prior unverified token-endpoint 403 assumption;
- generic forbidden, denied and ambiguous authorization text;
- missing repository/manifest semantics;
- DNS, TLS and timeout failures;
- empty, multiline, oversized or stdout-contaminated output;
- spawn error, signal termination and exit drift;
- wrong registry host, expected repository, requested repository, requested digest or authenticated digest.

The immediately preceding authenticated tag and exact-digest descriptor checks remain in the same sequence, so the semantic denial is never used as repository or subject existence proof.

## 5. Complexity disposition

The previous 403-specific parsing path and its tests were replaced, not layered. The code/test commit changes 37 insertions and 43 deletions. No parser framework, retry, fallback, second client, second proof authority, state machine, persistent state, table, Worker, Lease or Recovery type was added. Operational and persistent complexity stayed level; the local decision boundary became aligned with recorded Provider behavior.

## 6. Verification

| Check | Result |
|---|---|
| `node --test deploy/scripts/release-registry-integration.test.mjs` | PASS — 8 tests, 0 failures |
| Scoped ESLint | PASS |
| Repository `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `git diff --check` | PASS |
| Code/test scope before docs | PASS — exactly 2 allowed files |

No full Product or Docker suite was run because this is a pure bounded parser/predicate correction with no Product, workflow, Compose or runtime change. No unrelated environment result is represented as verification.

## 7. Evidence boundary and next gate

The live Provider output was captured before this task and is referenced from the `5012e003` Operator report/manifest. This task used it only as an offline test fixture and made no new Provider call. Consequently this Candidate is not new live proof and does not resume or authorize the external chain.

Next gate: exactly one coordinator-dispatched Fresh Independent Review. If Review is not PASS, HOLD with no further repair under the current authority.
