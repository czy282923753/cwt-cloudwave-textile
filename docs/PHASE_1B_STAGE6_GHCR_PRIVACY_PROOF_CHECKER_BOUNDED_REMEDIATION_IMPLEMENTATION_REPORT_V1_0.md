# CWT Phase 1B Stage 6 — GHCR Privacy-Proof Checker Bounded Remediation Implementation Report V1.0

Status: **IMPLEMENTED CANDIDATE — Fresh Independent Review required**

Implementation commit: `9eb6d1d8fff385a61eb7d6c07f64de5bb4b16e8f`

Evidence manifest: [PHASE_1B_STAGE6_GHCR_PRIVACY_PROOF_CHECKER_BOUNDED_REMEDIATION_EVIDENCE_MANIFEST_V1_0.md](./PHASE_1B_STAGE6_GHCR_PRIVACY_PROOF_CHECKER_BOUNDED_REMEDIATION_EVIDENCE_MANIFEST_V1_0.md)

## 1. Scope and authority

This remediation changes only the GHCR anonymous-access verdict in `deploy/scripts/release-registry-integration.mjs` and its deterministic test. It starts from closure commit `cdb08cd0293163bb573499a04240343d9d74a27c` and retains accepted source commit `eb18aa94e1bd11d1e5b61714533fbde643d5c5ce` in ancestry.

No workflow was dispatched or rerun. No Build Once, GHCR publication, tag, delete, pull, repair, Runtime Validation, Tencent operation, promotion, deployment, package/lock change, workflow change, schema change, Compose change or runtime-validator change occurred.

## 2. Root cause and evidence boundary

The failed immutable GitHub job `100251178915` ended its publication step with `ghcr_privacy_unproven`. The former checker accepted any failed ORAS process whose combined output contained `denied`, `unauthorized` or `authentication required`. Pinned ORAS `1.3.3` uses `oras-go v2.6.2`. For an anonymous bearer-token request whose 403 response has no structured Registry error array, that dependency formats the response as:

`GET "https://ghcr.io/token?scope=repository%3A<owner>%2F<repository>%3Apull&service=ghcr.io": response status code 403: Forbidden`

ORAS then emits the terminal form:

`Error response from registry: GET "https://ghcr.io/token?scope=repository%3A<owner>%2F<repository>%3Apull&service=ghcr.io": response status code 403: Forbidden`

This exact pinned-output class contains none of the former regex terms, so the old classifier fails closed with `ghcr_privacy_unproven` even though the anonymous token request is forbidden.

The immutable Actions log does **not** contain the raw child-process stderr: the integration script captures the `spawnSync` result and reports only its own reason code. The cleaned ephemeral Runner retained no diagnostic copy. Therefore the report does not claim that the historical stderr was directly recovered. The exact remediation fixture is a deterministic reconstruction from the pinned ORAS/`oras-go` source path and the immutable run's checker verdict. A future authorized execution remains required for real post-remediation operational proof.

## 3. Corrected responsibility boundary

The broad substring regex was replaced by one pure, exported classifier. It returns `true` only when all of these conditions hold:

1. the requested reference is a lowercase `ghcr.io/<owner>/<repository>@sha256:<64 hex>` digest reference;
2. the digest equals the immediately preceding authenticated descriptor result;
3. ORAS exited exactly with status `1`, no signal, no spawn error, empty stdout and one exact stderr line;
4. the stderr is the pinned ORAS terminal form for HTTP `403: Forbidden` from exactly `https://ghcr.io/token`;
5. the token query is canonical and contains only `scope=repository:<same owner/repository>:pull` and `service=ghcr.io`.

The caller still performs authenticated tag and exact-digest descriptor validation before the anonymous probe. This sequencing proves that the repository and exact digest exist and match before a token-endpoint 403 may be interpreted as anonymous denial. The classifier does not treat the token response alone as existence proof.

## 4. Fail-closed matrix

The deterministic matrix rejects:

- anonymous fetch success;
- a bare Registry manifest first-hop `401`;
- generic or structured text containing `Forbidden`, `denied`, `unauthorized` or `authentication required` outside the one accepted form;
- not-found output;
- DNS, TLS and timeout errors;
- spawn errors, signal termination and unexpected exit codes;
- empty, malformed, multi-line or stdout-contaminated output;
- wrong digest, missing authenticated digest agreement, wrong repository scope or wrong token host;
- reordered or extra token parameters.

The anonymous ORAS config remains a newly created mode-`0600` file containing only `{"auths":{}}`. The anonymous probe receives no authenticated config, token, Authorization header or credential argument. It remains digest-rooted.

## 5. Complexity disposition

The incorrect permissive regex was deleted rather than retained as a fallback. One small pure classifier replaces it; no second client, retry loop, state machine, persistent state, curl authority or dual decision path was added. No table, Worker, Lease, Recovery type or state transition changed. Persistent and operational complexity stayed level; the security decision became narrower and unit-testable.

## 6. Verification

| Check | Result |
|---|---|
| Focused Node test | PASS — 8/8 |
| Scoped ESLint | PASS |
| Repository ESLint | PASS |
| TypeScript typecheck | PASS |
| Deployment suite | 114/115 PASS; one unrelated Docker-dependent test could not connect to the local Docker daemon |
| `git diff --check` | PASS |
| Scope inspection | PASS — exactly two code/test files before documentation closure |

The Docker-daemon failure is not in the modified checker and did not invalidate the focused test. It is reported, not suppressed. A full Vitest run was started but did not produce a completion result within the bounded local verification window and was stopped; no PASS is claimed for it.

## 7. Candidate disposition and next gate

The implementation is a code Candidate only. It does not change the historical failed workflow verdict, validate the existing GHCR subject, authorize a rerun, or establish Runtime Validation or Production readiness.

Next gate: **Fresh Independent Review** of the implementation commit plus this docs-only closure. The reviewer must explicitly assess whether the historical raw-stderr evidence limitation is acceptable and whether the authenticated-descriptor sequencing sufficiently excludes nonexistent repository/subject ambiguity. No external execution is authorized by this report.
