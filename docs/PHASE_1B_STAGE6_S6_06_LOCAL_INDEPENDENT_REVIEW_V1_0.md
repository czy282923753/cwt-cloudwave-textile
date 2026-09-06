# CWT Phase 1B Stage 6 S6-06 Local Independent Review V1.0

## Final focused re-review disposition

| Field | Value |
| --- | --- |
| Review type | Focused independent re-review of `S6-06-M-01` stale-marker recovery |
| Candidate | `14c11b9e78274f7280281418a4295a3894f40619` |
| Code/test/runbook commit | `587acdaf17c2c031289158d5fb491a4b11a0794c` |
| Correction parent | `6205927d446d114175e3081a3bcd8152a68a0433` |
| Prior focused Review | `3dd685f15c7a17b093ac9f74dfa52a110af967ef` |
| Verdict | **PASS for the bounded local Candidate** |
| Finding disposition | **`S6-06-M-01` CLOSED** |

This report preserves the two prior Review results and records only the final bounded re-review. It is not Stage 6 acceptance, production packaging evidence or external provider validation.

The corrected historical Runtime Review citation remains: report commit `2ad7146b48bc1930332966c47da28b8fddd923a0`, parent `7e48c72940261ea264fef20d4a54355a4e14a609`. Runtime remains **CLOSED/PASS** and was not reopened.

## Security & Test Simplification Check

**PASS.** The correction narrows one existing condition in the existing `retain-daily` action. It adds no state, schema, marker field, authority, repair command, lock, queue, framework or test gate. Under the ordered `delete → merge → standard mechanism → new mechanism` check, verified durable backup sets remain authoritative and the existing health file remains derived reporting. No additional simplification or Reviewer is justified.

## `S6-06-M-01` closure

`deploy/backup/files.mjs:186-195` now distinguishes the two supported entry modes:

- with an exact verified direct-child admission, retention always protects that new set; it also protects the old health-corresponding valid set when one exists, but a structurally valid dangling old marker cannot veto the replacement;
- without a replacement admission, standalone retention still requires one verified set corresponding to the current health marker and otherwise fails before deletion.

The existing `backup-postgresql` ordering remains correct: the exact new set is verified and durable, retention completes while protecting that set, and only then is health atomically replaced. If the prior marker still corresponds, that prior set is protected until new health publication. If the prior marker is the dangling output of the original defect, one ordinary scheduled backup restores matching retained health without an operator editing the marker. Subsequent ordinary backup and standalone retention remain convergent.

The original clock-order deletion, its narrower stale-marker retry trap and their practical recovery boundary are therefore closed without a second state or manual repair path.

## Decisive independent verification

| Check | Result |
| --- | --- |
| Candidate identity, ancestry and four-file delta | PASS |
| Code inspection of exact admission, prior-set protection, standalone refusal and post-retention health publication | PASS |
| Focused PostgreSQL 18.4 daily regression | PASS: clock-forward/correction, exact-new survival, old valid correspondence, seven-valid retention, corrupt/unknown preservation, outside-root refusal, standalone refusal with zero deletion, stale-marker recovery, subsequent admission and subsequent standalone convergence |
| Independent stale-marker closure probe | PASS: after removing the old advertised set, one ordinary admission restored matching health; standalone, a subsequent ordinary admission and another standalone retention all succeeded |
| Changed Node syntax | PASS |
| Focused lint | PASS |
| Diff whitespace check | PASS |

The tests used the exact tracked Candidate exported to disposable directories with empty untracked `node_modules/` mountpoints, the existing local PostgreSQL 18.4/Restic 0.19.1 tooling, network isolation and disposable volumes. Candidate source was not changed. The temporary runners removed their own containers and volumes.

The earlier passed weekly/restore/Compose/network/TLS-S3/Migration/typecheck evidence is reused. The correction changes only two lines of the daily-retention branch plus its focused test and documentation, and no concrete regression requires reopening those unaffected checks.

## Remaining gates

The exact Bookworm production image pin remains unavailable locally. Real COS/provider behavior, target-host Linux/amd64 controls and capacity, monitoring, time synchronization, measured RPO/RTO, an operator-witnessed restore drill and coherent successor-release integration remain unvalidated. Stage 6 remains Partial/HOLD pending those gates and coordinator disposition.

## Exit

The focused independent re-review is complete with **PASS** for Candidate `14c11b9e78274f7280281418a4295a3894f40619`. There are no open local findings in the assigned `S6-06-M-01` scope. This result authorizes no Push, image emission, provider operation, protected start, deployment or Phase advancement.
