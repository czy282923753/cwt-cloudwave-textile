# CWT Phase 1B Stage 6 S6-04 B-04 Reproducible-Image Technical Disposition and Planning Amendment Candidate V1.7

Status: **TECHNICAL LEAD F-04B-R1-ONLY REMEDIATION CANDIDATE — fresh independent planning re-review required; not self-approved, implementation authority, Owner presentation, or Stage 7 authority**

Date: **2026-08-31**

Candidate branch: `codex/phase-1b-stage6-s6-04-b04-planning-remediation-v1-7`

Required sole parent: `c78bc73eef3283468766a3c460a5e33f6d7f83d2` (V1.6 tree `9f959bc7c49bd3a6d5d7268ca28de4dde3cc1eb3`; sole parent `59f356751c34f1a6064925c5bb4c052b737e605f`)

The V1.6 independent Review is failed sibling-only evidence: commit `00fa1c559f97846b9fa886b8219b76f2738ebdc5`, tree `1d2421553df313b2cb6236b7033d211060f4bff3`, sole parent `c78bc73...`, Review-file SHA-256 `0f858b50eaad428e26ae2231bd7cf679fd24b2de999e5d0d744f7ec7b0b8190f`. It and every earlier Review commit remain excluded from Candidate ancestry.

V1.0 through V1.6 Candidate artifacts and sidecars remain byte-identical audit history. The read-only Implementer checkpoint and intentionally dirty Implementer worktree remain outside this Candidate.

Authority boundary: **Stage 6 planning/remediation only. `OD-B04-01` is unchanged, is neither selected nor presented here, and may be presented only after a fresh independent V1.7 `PASS`. No implementation, protected/external action, S6-05/S6-06, deployment, Provider access, or Stage 7 is authorized. Stage 7 remains HOLD pending new explicit Owner authorization.**

## 1. Disposition and exact supersession

Review `00fa1c5...` closes F-04A, ordinary F-04B, and unchanged F-05. Its sole finding, F-04B-R1, is that V1.6's external 120-second event/snapshot `PASS` is diagnostic evidence, not a causal Docker completion barrier or an authority consumed by the zero-argument gate.

V1.7 selects Review direction 1 only: **simultaneous loss of every FD9 holder is outside the supported gate contract and is a terminal fail-stop/escalation event. It has no locally authorized recovery or re-entry path.** This is a narrowing of the unsupported ceiling, not a new mechanism.

V1.7 supersedes only these conflicting V1.6 statements:

- Candidate §2 row “Abrupt death can outlive a process-scoped lock” where it permits local rollback/stability proof followed by re-entry;
- Candidate §4.2 final event row and §4.3 in full;
- Candidate §§5.2, 6 and 7 only where they describe total-holder “recovery,” a 120-second quiet observation, a local `PASS`, or later same-host gate invocation;
- Evidence Manifest §§4.2, 6 and 8 only where they incorporate that recovery claim; and
- any future checker/runbook expectation derived from those superseded passages.

Those V1.6 passages remain immutable audit history but are not current authority. `--wait-timeout 120` remains only the ordinary Compose running/healthy wait inside the already serialized lifecycle action; it is not total-holder-loss settlement evidence.

The exact current contract is machine-readable:

```text
SUPPORTED_GATE_ARGUMENT_COUNT=0
SUPPORTED_OPERATOR_SIGNALS=INT,TERM,HUP
TOTAL_FD9_HOLDER_LOSS_SUPPORTED=false
TOTAL_FD9_HOLDER_LOSS_DISPOSITION=FAIL_STOP_ESCALATE
POST_TOTAL_LOSS_LOCAL_REENTRY=FORBIDDEN
POST_TOTAL_LOSS_ZERO_ARGUMENT_GATE_INVOCATION=FORBIDDEN
POST_TOTAL_LOSS_TIMER_AUTHORITY=NONE
POST_TOTAL_LOSS_EVENT_AUTHORITY=NONE
POST_TOTAL_LOSS_SNAPSHOT_AUTHORITY=NONE
POST_TOTAL_LOSS_ROLLBACK_OBSERVATION_AUTHORITY=NONE
POST_TOTAL_LOSS_MANUAL_OR_AUTOMATED_PASS_AUTHORITY=NONE
MACHINE_ENFORCEMENT_AT_RAW_ROOT_CEILING=NOT_CLAIMED
```

## 2. Frozen closures and F-04B-R1 one-to-one correction

| Boundary | V1.7 disposition |
| --- | --- |
| F-04A | **CLOSED and unchanged.** Exact Ubuntu Noble `bash-static 5.2.21-2ubuntu4`, exact architecture/package/binary identities, first-instruction normalization, absolute downstream tools, and hostile-loader/startup matrix remain normative. |
| ordinary F-04B | **CLOSED and unchanged.** One FD9, parent plus singular lifecycle-tree ownership, validation-child closure, separate lifecycle process group, deferred `INT`/`TERM`/`HUP`, `wait -f`, exact statuses, and actual Docker CLI/Compose inheritance remain normative. |
| F-05 | **CLOSED and unchanged.** Exact granular GLIDE/Valkey ACL and S6-04 functional-acceptance boundary remain normative. |
| F-04B-R1 | **Corrected at Technical Lead Candidate level only.** Total-holder loss is fail-stop/escalation with no local re-entry authority; fresh independent Review is required. |

| Review assertion | Corrected mechanism | Positive / hostile evidence | Rollback / stop | Future implementation locator |
| --- | --- | --- | --- | --- |
| Two snapshots plus 120 quiet event seconds do not causally settle an in-flight Engine mutation | Delete the local recovery claim. Timers, events and snapshots may be preserved as incident evidence only; none authorizes another lifecycle action. | V1.6 evidence and Review show Engine state continuing after lock release; V1.7 document checks reject any timer/event/snapshot authorization sentence. | Revert the unaccepted S6-04 gate/checker/runbook unit and keep S6-04 stopped. Never restore the quiet-window claim. | `deploy/host/README.md`; `docs/ENVIRONMENT_AND_DEPLOYMENT.md`; `docs/OPERATIONS_RUNBOOK.md`; existing checker tests |
| The zero-argument gate cannot authenticate whether an external observation passed or was skipped | Do not claim it can. After total-holder loss, the authorized principal must not invoke the gate again on that host under this plan. | Exact contract above freezes zero arguments and forbids post-loss invocation; hostile consistency check finds no local re-entry recipe or positive `PASS` token. | If mechanically recoverable re-entry is required, stop for a separately scoped Owner/ADR decision; do not add state here. | singular gate source and source checker; operator runbook |
| Killing all holders makes the kernel lock acquirable while the accepted Engine request may continue | Classify this state as terminal fail-stop/escalation, not recovery. Kernel reacquisition is not authorization. | Independent dual-architecture evidence shows created/starting services continuing toward running/healthy after holder loss. | Preserve evidence, report, and await separately authorized recovery/reprovisioning disposition; no local rollback/start action. | incident wording in runbooks; total-loss negative acceptance case |
| A raw-root/Docker-socket principal can bypass repository policy | Retain the honest ceiling. Least-privilege custody and audit define authorized operation; no machine-enforcement claim is made after all holders disappear. | Gate selector/path/socket controls remain effective inside supported execution; raw-root bypass remains explicitly out of contract. | Any claim that zero-argument execution detects skipped observation is a stop condition. | host custody documentation and audit evidence |
| Ordinary operator signals must remain serialized | Keep `INT`, `TERM`, and `HUP` as the only supported operator termination inputs; defer them until the lifecycle child is terminal. Deliberate `SIGKILL` against any gate/lifecycle holder is prohibited operationally and retained only as a negative evidence challenge. | Fresh offline dual-architecture smoke returned `0/130/143/129`, lifecycle FD9 present, validation FD9 closed, and lifecycle completion before parent terminal output. | Stop on forwarding, early release, hidden child failure, retry, or a second action. | `deploy/scripts/preflight-staging.sh`; signal/process-tree tests; runbook |

## 3. Supported one-lock/one-action contract

The accepted V1.6 supported path remains one repository-controlled gate, one root Compose graph, one root principal, one FD9, and one literal lifecycle action. The parent and causally necessary Docker CLI/Compose process tree hold FD9 until the child terminates and post-state verification completes. Every unrelated validation child closes FD9. No second lock, marker, lease, durable incident file, retry controller, helper service, alternate Compose file, or recovery mode is added.

The unchanged lifecycle command is:

```text
/usr/bin/docker --config /etc/cwt/docker-cli --host unix:///run/docker.sock \
  compose --env-file /etc/cwt/compose.env --project-name cwt \
  --file /etc/cwt/compose.yaml --profile staging \
  up --detach --wait --wait-timeout 120 --no-deps \
  web-staging worker-staging scheduler-staging valkey-staging
```

Normal child success returns `0`. A parent `INT`, `TERM`, or `HUP` is deferred; after child termination and exact post-state verification, the gate returns `130`, `143`, or `129`. Child failure remains exact and fail-closed. Parent-only or parent-process-group abrupt-death tests remain evidence that a surviving lifecycle child holds the lock; they are not authorized operator recipes.

F-04A retains these exact binary SHA-256 values: `ea3065d65dd07162e42e6db082103ef7dda0578436f15da76ff17be7b31cf671` (`amd64`) and `923600157c5ec8cbd17c45127cbf34c766ad401722ceb0f0661f2a287538be47` (`arm64`). F-05 retains this exact named-user boundary without addition or deletion:

```text
user cwt-<environment> on >password resetkeys ~cwt:<environment>:rate:* resetchannels -@all +ping +client|setname +script|load +evalsha +incr +pexpire +pttl
```

Authenticated `REDISCLI_AUTH` PING remains liveness only. The matching-network, two-process GLIDE verifier remains mandatory S6-04 functional acceptance; the operational Staging gate runs no limiter canary and does not duplicate S6-05 readiness.

## 4. Total-holder-loss terminal boundary

“Total-holder loss” means every process holding the single FD9 has ceased while its submitted Docker lifecycle request may still be causally active. It includes deliberate all-holder `SIGKILL`, raw-root destruction of the lifecycle tree, host/runtime failure, or any equivalent observation. The supported zero-argument contract ends at that point.

The only authorized response is:

1. stop all repository-controlled and raw Docker/Compose lifecycle actions for the affected CWT host;
2. preserve available read-only process, lock, journald, Docker event and Engine/project state evidence without treating any observation or elapsed period as settlement;
3. report the incident and the unsupported total-holder-loss condition; and
4. escalate for a separately authorized recovery or reprovisioning disposition and wait for it.

There is no pre-authorized rollback, cleanup, resumption, timer, event filter, snapshot comparison, manual approval token, automated approval token, zero-argument rerun, or same-host recovery recipe. Evidence collection is diagnostic only. V1.7 does not specify how a later authority should recover or reprovision.

The zero-argument gate cannot mechanically distinguish a compliant operator from a raw-root principal who skipped the observation and invoked Docker or the gate after all kernel holders vanished. V1.7 therefore makes no machine-enforcement claim at that ceiling. The boundary is enforced by protected root custody, least-privilege access, audit, and the explicit operational prohibition, consistent with the already accepted raw-root/Docker-socket bypass ceiling.

The authorized runbook must state: **do not send `SIGKILL` to the gate, its lifecycle child, their process groups, or all FD9 holders; if total-holder loss nevertheless occurs, do not run the gate or any local recovery action again—stop, preserve evidence, report, and escalate.** Ordinary `INT`, `TERM`, and `HUP` remain the supported feedback/serialization path.

## 5. Executable evidence and non-regression

Fresh V1.7 evidence used only previously downloaded exact `bash-static` packages, architecture-matched Synthetic loader fixtures, locally imported scratch images, and the local disposable Docker engine. It made no network, Provider, credential, real-file, protected-environment, or Implementer-worktree mutation.

| Check | `linux/amd64` | `linux/arm64` | Result |
| --- | --- | --- | --- |
| exact static binary | SHA-256 `ea3065...cf671`; build ID `d682de4864fa3a62f2cc9cc29b95c7506427897f` | SHA-256 `923600...be47`; build ID `c7c2ad3d91bd5d9f629a5c6e48b2528779f8df3b` | unchanged F-04A identity |
| architecture-matched `LD_PRELOAD` challenge | exit `65`; gate body absent; constructor marker absent | same | clean-exec smoke PASS |
| normal / parent `INT` / `TERM` / `HUP` | `0` / `130` / `143` / `129` | same | lifecycle FD9 present; validation FD9 closed; child completed before parent terminal output |
| accepted all-holder challenge, re-read | services moved from starting to healthy after holder loss | created/starting services continued toward running | kernel lock release is not Engine completion; expected disposition is terminal escalation |

The V1.6 independent Review separately reproduced immediate lock acquisition while the already submitted Engine action continued. Its prior 120-second quiet sample remains useful incident evidence but is explicitly non-authoritative.

There is no concrete F-04A, ordinary F-04B, or F-05 regression. Proportional non-regression therefore retains their accepted full evidence and adds only the focused smoke above. The exact V1.5/V1.6 F-05 ACL text is byte-identical; Review `2f36b5a7...` remains its independent closure evidence.

The Implementer worktree remained at HEAD `de40457e2e99d118915998ed57be33257512c0df`, tree `8a151d2a8c20011099d0322ce7d5fd074de215ce`, with porcelain inventory SHA-256 `683d91416e25b3675d79f8842ae340de45095e741c384bc2e98e4b68aebc4310` before and after this task. No Implementer file was modified or staged.

All `cwt-v16-*`, `cwt-v17-*`, and `cwt-gate-runner:f04-f05` test containers/images/networks/volumes are absent after cleanup. The V1.6 evidence root and V1.7 disposable root were returned recoverably to Trash. No unrelated Docker resource was selected.

## 6. Bounded future implementation ownership

Implementation remains stopped pending a fresh V1.7 planning `PASS`, later unchanged `OD-B04-01` Owner disposition, and the resulting decision-aligned S6-04 authority. Only after those gates may the existing Implementer task/worktree be reused; this Candidate does not dispatch it.

| Slice | Scope / ownership | Required verification | Rollback / stop |
| --- | --- | --- | --- |
| `B04-V17-01` gate-contract convergence | In `deploy/scripts/preflight-staging.sh`, retain V1.6 F-04A and ordinary F-04B exactly; expose no post-loss argument, mode, token, marker, timer, recovery branch, or alternate action. | exact zero-argument source check; one FD9/one lifecycle child; normal and signal matrix; no re-entry mode/string | revert the unaccepted S6-04 gate as one unit and stop; never restore V1.6 local recovery |
| `B04-V17-02` checker/runbook replacement | Update the existing checker/tests, `deploy/host/README.md`, `docs/ENVIRONMENT_AND_DEPLOYMENT.md`, and `docs/OPERATIONS_RUNBOOK.md`. Delete the 120-second quiet-window `PASS` and every local post-loss rollback/re-entry instruction; add the exact prohibition and escalation-only text from §4. | repository consistency test over every authorized operational document; no positive local re-entry path; `--wait-timeout 120` classified only as ordinary health wait | any contradictory start/recovery instruction stops; no optional checker or second runbook path |
| `B04-V17-03` focused and whole-S6-04 evidence | Re-run exact F-04A/ordinary F-04B/F-05 evidence, 1407 zero-start, 1408 exact four-service path, OCI equality and unchanged bundle/AI gates. Total-holder challenge ends in evidence preservation/escalation and performs no later action. | dual architecture; exact signals/FDs/process tree; no post-total-loss gate or Compose invocation; prior closures unchanged | any timer/PASS authority, local recovery, second action, nondeterminism, topology/ACL/AI regression, or hidden retry stops |

No Schema/Migration, application API, network topology, secret, Provider, FileScanner, RateLimiter, Production-AI, persistent coordination, or new host authority is included.

## 7. Rollback, stop conditions, and Security & Test Simplification

Planning/implementation rollback before activation is Replace, Not Layer: revert the unaccepted S6-04 gate/checker/runbook unit to the accepted pre-S6-04 checkpoint and keep S6-04 stopped. This source rollback is not an incident-recovery authorization after total-holder loss. Do not restore V1.6's quiet-window recovery, retain two runbook paths, or attempt local repair after total-holder loss.

Stop immediately if:

- any document, gate, checker, test, or operator instruction permits local lifecycle action after total-holder loss;
- elapsed time, Docker events, snapshots, rollback observation, a human assertion, or an automated `PASS` is treated as causal Engine settlement or re-entry authority;
- the zero-argument gate is claimed to mechanically detect a skipped total-loss observation;
- deliberate `SIGKILL` is presented as an authorized operator action or followed by a local recovery recipe;
- a marker, lease, durable file, database state, daemon, service, transaction token, second lock, retry controller, checker authority, second launcher, new principal, or new host authority is proposed;
- ordinary F-04A/F-04B, F-05, 1407/1408, exact service/network/profile/resource, OCI, bundle, AI, secret, role, or reproducibility gates regress; or
- implementation requires Schema/Migration, protected/external action, S6-05/S6-06, Owner presentation before V1.7 Review `PASS`, or Stage 7.

| Principle | V1.7 result |
| --- | --- |
| Root Cause First | Removes the unbound local authorization claim instead of treating a quiet sample as Docker transaction settlement. |
| Simplification First | Narrows unsupported total-holder loss to fail-stop/escalation; adds no completion mechanism or state. |
| Replace, Not Layer | Deletes the recovery path rather than layering another checker beside the zero-argument gate. |
| Fail closed | Supported execution stays serialized; unsupported total-holder loss ends local authority. |
| Test integrity | Existing all-holder evidence is reclassified honestly; focused dual-architecture smoke protects closed boundaries without inventing completion proof. |
| Operational honesty | Raw root can bypass policy and the gate cannot identify a skipped observation after lock-holder loss; no contrary machine-enforcement claim remains. |
| Persistent complexity | No new daemon, service, principal, lock, lease, marker, table, Migration, or recovery authority. |

This correction requires no new Owner decision or ADR because it only removes an unsafe local recovery claim and narrows unauthorized operation. If the project later requires mechanically recoverable same-host re-entry after total-holder loss, stop and obtain a separately scoped Owner/ADR decision before selecting any mechanism.

## 8. Unchanged decisions and next gate

V1.7 does not restate or alter the byte-identical `OD-B04-01` wording/options in V1.0, the BuildKit/Next diagnosis, exact reproducibility requirement, release/build-ID/key classification, Options A-E, B04-D1 through B04-D5 as corrected through V1.6, direct Node/tsx runtime, profile/network/resource topology, AI prohibition/gates, or exact F-05 boundary. It makes no Production, Provider, deployment, or external-validation claim.

Next gate: **fresh independent Stage 6 S6-04 B-04 planning-amendment Review of V1.7 only**. Only a later `PASS` permits coordinator presentation of unchanged `OD-B04-01`. No implementation, S6-05/S6-06, Owner presentation, or Stage 7 may start from this Candidate alone.
