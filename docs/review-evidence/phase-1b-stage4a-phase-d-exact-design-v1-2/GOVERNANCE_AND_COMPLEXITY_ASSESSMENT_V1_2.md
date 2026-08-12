# Governance and Complexity Assessment V1.2

Prepared: `2026-08-13`

## Root-cause reassessment

`M-01` remained Medium across two review rounds, so Engineering Governance Section 12 required reassessment before another correction.

The accepted state machine was re-inventoried. V1.1 had already converged the billable route on the sole Domain Service, `ai_runs`, Worker, dispatch fence, attempt writer and settlement. The repeated failure was not another lifecycle or authority defect: the authored fixture itself could not enter or exit the accepted security/business contracts, and its identity hashes were manually assumed. The corrected responsibility is therefore the immutable fixture-definition boundary, proved by executing accepted contracts before freezing values.

V1.2 does not add a queue, row, state, Worker, Lease, recovery type, retry, history, writer, budget or dispatch path. It keeps the V1.1 durable route and replaces only the invalid fixture tuple.

`L-02` root cause was duplicated, inconsistent source-count authority. V1.2 moves both credential-free source observations into one dedicated preflight module with two named operations and one summed count. The old remote-fetch role in `deepseek-pricing.ts` is removed; compiled pricing remains there. No dual source verifier remains.

`L-03` root cause was duplicate credential-read responsibility. V1.2 deletes the harness/preflight presence probe and retains only the adapter-private `prepareTextDispatch` reader. The fix removes a branch and a secret-handling boundary.

## Complexity disposition

| Dimension | V1.2 effect |
|---|---|
| persistent coordination/state | unchanged; none added |
| run/Worker/fence/retry states | unchanged |
| fixture authority | remains one resource; exact accepted tuple replaces invalid tuple |
| official-source ownership | one dedicated module replaces an ambiguous role; two fixed methods/paths, no retry |
| credential ownership | reduced from contradictory two probes to one reader |
| Production/phase reachability | unchanged exact-empty/disabled |
| implementation paths | two narrow source-preflight files added; no dependency/Schema/Migration/ADR |

Total architectural complexity stays level; secret-path and source-count comprehension costs decrease. The two added files are justified by separation between compiled pricing authority and design-time public source observation, while V5 forbids any second implementation.

## Proportional verification

This is docs-only design remediation. Relevant gates are accepted-contract execution under pinned Node, official public source reads, consumer/architecture scans, links, immutable hashes, closed path diff, manifest and credential-shaped negative scan. Product Build/unit/browser/Provider suites are not run because no product code changed and a credential/API call is forbidden.
