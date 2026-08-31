# CWT Phase 1B Stage 6 S6-04 B-04 Planning Amendment Evidence Manifest V1.7

Status: **TECHNICAL LEAD EVIDENCE MANIFEST — F-04B-R1-only remediation; fresh independent V1.7 Review required**

Date: **2026-08-31**

Companion Candidate: `docs/PHASE_1B_STAGE6_S6_04_B_04_REPRODUCIBLE_IMAGE_TECHNICAL_DISPOSITION_AND_PLANNING_AMENDMENT_CANDIDATE_V1_7.md`

Required Candidate branch/parent: `codex/phase-1b-stage6-s6-04-b04-planning-remediation-v1-7` / `c78bc73eef3283468766a3c460a5e33f6d7f83d2`

This manifest is planning evidence, not an independent Review, implementation report, Owner presentation, Production/Provider proof, protected-environment action, or Stage 7 evidence.

## 1. Authority, lineage, and immutable inputs

| Item | Exact identity / result |
| --- | --- |
| V1.6 Candidate | commit `c78bc73eef3283468766a3c460a5e33f6d7f83d2`; tree `9f959bc7c49bd3a6d5d7268ca28de4dde3cc1eb3`; sole parent `59f356751c34f1a6064925c5bb4c052b737e605f` |
| V1.6 principal hashes | Candidate `02a8a127d7e5d039c5d2d44ef4da32665195dca42a040acb09feda6ca4fa001a`; Manifest `112f0c4de65c05aec945f55177799de4dae48fdcf4f0ee37f3eb756d14c1f5a2` |
| V1.6 Review | sibling-only commit `00fa1c559f97846b9fa886b8219b76f2738ebdc5`; tree `1d2421553df313b2cb6236b7033d211060f4bff3`; sole parent `c78bc73...`; Review SHA-256 `0f858b50eaad428e26ae2231bd7cf679fd24b2de999e5d0d744f7ec7b0b8190f` |
| Review result | overall `FAIL`; only F-04B-R1 open; F-04A, ordinary F-04B, and F-05 closed |
| Review ancestry | `git merge-base --is-ancestor 00fa1c5... c78bc73...` exits `1`; Review is excluded from Candidate ancestry |
| Earlier artifacts | V1.0-V1.6 Candidate artifacts and sidecars remain immutable; final control gate re-verifies every adjacent sidecar |
| Implementer boundary | HEAD `de40457e2e99d118915998ed57be33257512c0df`; tree `8a151d2a8c20011099d0322ce7d5fd074de215ce`; dirty-inventory SHA-256 `683d91416e25b3675d79f8842ae340de45095e741c384bc2e98e4b68aebc4310` before/after; no write or stage |
| Stage boundary | no implementation, protected/external action, S6-05/S6-06, Owner presentation, or Stage 7; Stage 7 remains HOLD |

`OD-B04-01` remains byte-identical at its historical authority location and is neither restated, selected, nor presented. F-05 remains exactly incorporated from V1.5 and Review `2f36b5a7ecac35e4607c0aa9b706671adecd3777`; this task ran no competing ACL/client/readiness path.

## 2. Evidence method and controls

### 2.1 Bounded disposable method

The task restored the recoverably retained V1.6 evidence root for read-only inspection, then returned it to Trash. Fresh executable checks used only local, previously downloaded exact Ubuntu Noble `bash-static` packages, the accepted architecture-matched Synthetic loader fixtures, scratch root filesystems imported into the local disposable Docker engine, and Bash builtins. No registry, package repository, Provider, remote endpoint, account, credential, real private file, protected Staging/Production environment, or Implementer-worktree mutation was used.

The fresh smoke is deliberately narrower than the accepted V1.6 full gate/Compose evidence. V1.7 changes no F-04A interpreter, ordinary F-04B process composition, or F-05 ACL; the smoke protects those frozen boundaries without pretending to replace their already accepted evidence.

### 2.2 Exact local inputs

| Input | `linux/amd64` | `linux/arm64` |
| --- | --- | --- |
| `bash-static` package/version | Ubuntu Noble `5.2.21-2ubuntu4` | same |
| `.deb` SHA-256 | `684691928e746a29d4b97c3b58069666a3cdd73104c90b217501f5c1ae7cbd64` | `1fd25dda094189ac7ad22acad78c298fdd7fedc60c2f45bb00512c13708224a2` |
| extracted binary SHA-256 | `ea3065d65dd07162e42e6db082103ef7dda0578436f15da76ff17be7b31cf671` | `923600157c5ec8cbd17c45127cbf34c766ad401722ceb0f0661f2a287538be47` |
| Build ID / ELF | `d682de4864fa3a62f2cc9cc29b95c7506427897f`; static x86-64 | `c7c2ad3d91bd5d9f629a5c6e48b2528779f8df3b`; static AArch64 |
| loader fixture SHA-256 | `1a3b0c975596d2da248e03636c8816e28d05cc5cc1b6dd0f00f82c591e71dcea` | `33aea8335f4584a7abd60b93fae93c3d371075c40a4160288a6691bb89379a31` |
| disposable imported image ID | `sha256:c54f9a8b653b6c9514aa0b8a8df177a822e4d1bc8f66b1c185ad5025ce6e9feb` | `sha256:42d7866facd729ba696848a5fcddc884d8ccfc448b816d20b088966d5129443c` |

The imported image IDs are test-only locators, not release inputs. Both exact image tags/IDs and all task containers were removed after evidence capture.

## 3. Focused dual-architecture non-regression

### 3.1 Clean-exec smoke

| Evidence ID | Challenge | `amd64` | `arm64` | Result |
| --- | --- | --- | --- | --- |
| `V17-F04A-01` | exact static package/binary extraction and identity | expected SHA/build ID/static ELF | expected SHA/build ID/static ELF | PASS; accepted identity unchanged |
| `V17-F04A-02` | architecture-matched `LD_PRELOAD` constructor plus first-instruction rejection | exit `65`; constructor marker absent; body absent | same | PASS; no pre-body injection |

The accepted V1.6 full 21-cell hostile selector/path/tool matrix remains normative and is not reopened by a documentation-only F-04B-R1 correction.

### 3.2 Descriptor/signal smoke

The local smoke opened FD9 in the static-Bash parent, launched one lifecycle child inheriting FD9, launched one validation child with literal `9>&-`, deferred supported parent signals, and waited for lifecycle completion. It added no retry, forwarder, lock replacement, or lifecycle action.

| Evidence ID | Event | `amd64` | `arm64` | Required observations |
| --- | --- | --- | --- | --- |
| `V17-F04B-L01` | normal | `0` | `0` | parent/lifecycle FD9 present; validation FD9 closed; child completes before parent terminal output |
| `V17-F04B-L02` | parent `INT` | `130` | `130` | signal deferred; child exits `0`; parent terminal last |
| `V17-F04B-L03` | parent `TERM` | `143` | `143` | same |
| `V17-F04B-L04` | parent `HUP` | `129` | `129` | same |

This focused smoke is a non-regression check, not a substitute for accepted V1.6 `flock`, process-group, real Docker CLI/Compose FD inheritance, parent-only kill, child-group termination, 1407/1408, or F-05 evidence. No concrete regression required reopening those closed proofs.

### 3.3 All-holder evidence reclassification

The immutable V1.6 dual-architecture challenge was re-read and its first causal result was reasserted:

| Evidence ID | Accepted observation | V1.7 classification |
| --- | --- | --- |
| `V17-F04B-R1-A` | `amd64`: after all holders were killed, all four Staging services were running/starting; seven seconds later they were healthy. The immediate second invocation refused because `web-staging` was not inactive. | Engine mutation continued after kernel lock loss. The refusal due to visible state is diagnostic, not a general completion barrier. |
| `V17-F04B-R1-B` | `arm64`: after all holders were killed, two Staging services were still `created` and two running/starting; one second later all four were running/starting. | Same causal divergence. |
| `V17-F04B-R1-C` | independent Review: the lock became immediately acquirable while the previously submitted Engine action continued; a later 120-second quiet sample existed but was not gate-bound or a documented Docker transaction fence. | Total-holder loss is terminal fail-stop/escalation. No local observation can authorize re-entry under V1.7. |

No all-holder mutation was re-executed because the mechanism and causal evidence are accepted and unchanged. Repeating a destructive ceiling challenge would not establish the missing completion authority that V1.7 intentionally does not claim.

## 4. Exact F-04B-R1 contract and closure ledger

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

| F-04B-R1 assertion | Candidate correction | Positive evidence | Hostile/document negative | Rollback / stop | Future locator |
| --- | --- | --- | --- | --- | --- |
| external quiet-window `PASS` is not a Docker completion barrier | Candidate §§1, 4 delete it as authority | `V17-F04B-R1-A`-`C` | `V17-DOC-N01`: no value grants timer/event/snapshot/rollback-observation authority | never restore; S6-04 stays stopped | runbooks/checker tests |
| zero-argument gate cannot bind skipped versus completed observation | post-loss gate invocation is forbidden; no machine-enforcement claim | exact contract appears once in each principal V1.7 document | `V17-DOC-N02`: no allowed/recovery value, argument, token, mode, or same-host rerun | new bound mechanism requires separate Owner/ADR scope | gate/source checker |
| kernel lock can release before Engine action ends | total-holder loss is terminal fail-stop/escalation | accepted dual-architecture state progression and independent reproduction | `V17-DOC-N03`: no “lock acquired means settled” or local completion assertion | preserve evidence/report/escalate only | incident/runbook wording |
| operator path must not deliberately create the ceiling | authorized signals are only `INT`, `TERM`, `HUP`; deliberate `SIGKILL` is prohibited | `V17-F04B-L01`-`L04` | `V17-DOC-N04`: no SIGKILL recovery recipe or action after total loss | any such instruction stops | gate/runbook/signal tests |
| no replacement complexity is authorized | choose no marker/lease/state/service/second lock/launcher/principal | exact Candidate stop list | `V17-DOC-N05`: forbidden mechanism inventory remains empty | discovery of need returns for decision | planning/implementation review |

## 5. Document-consistency and negative gate

The “current V1.7 package” for these assertions is exactly the two V1.7 principal Markdown files and their adjacent sidecars. V1.6 remains immutable history; its superseded recovery prose is not current authority.

The final checker must prove all of the following:

1. each principal document contains exactly one identical machine-readable contract from §4;
2. no contract value equals `ALLOWED`, `RECOVER`, `RETRY`, `PASS`, or any equivalent positive post-loss authority;
3. a checker assembles and rejects the legacy phrase pairs `120 consecutive` + `seconds`, `only after` + `PASS`, `then invokes` + `the same zero-argument gate`, `bounded` + `recovery`, and `later same-host re-entry` + `is permitted`; each assembled phrase has zero occurrences in the current package;
4. every occurrence of “120” is either the unchanged ordinary Compose `--wait-timeout 120` health wait or an explicitly rejected historical quiet-window claim; none is a post-loss clock authority;
5. every total-holder-loss instruction terminates in stop, preserve evidence, report, and escalation; no local rollback, cleanup, gate invocation, Compose action, recovery recipe, manual token, or automated token follows;
6. the authorized runbook names only `INT`, `TERM`, and `HUP`; `SIGKILL` appears only as prohibition, negative challenge, or incident classification;
7. no text claims that raw root cannot bypass the repository gate or that the zero-argument gate can recognize a skipped observation;
8. the exact one-lock/one-action/root-Compose command and exact closed F-05 ACL remain present without a second authority; and
9. Stage 7 remains HOLD; `OD-B04-01` is unchanged and unpresented; there is no implementation, Schema/Migration, external/protected, S6-05/S6-06, or deployment authorization.

These assertions distinguish the ordinary `--wait-timeout 120` lifecycle option from the deleted post-loss quiet-window theory. They do not suppress the historical finding or rewrite V1.6 evidence.

## 6. F-04A/F-04B/F-05 non-regression and hygiene

The exact F-05 line remains:

```text
user cwt-<environment> on >password resetkeys ~cwt:<environment>:rate:* resetchannels -@all +ping +client|setname +script|load +evalsha +incr +pexpire +pttl
```

Review `2f36b5a...` remains the independent source for exact GLIDE/Lua necessity, denial, two-process atomic/TTL behavior, outage fail-closed, and same-process recovery without replay. V1.7 adds or removes no ACL command, client, key prefix, credential, liveness, or readiness authority.

The exact prior Synthetic image `cwt-gate-runner:f04-f05` remains absent. Final cleanup found zero matching `cwt-v16-*`/`cwt-v17-*` containers, images, networks and volumes, and no matching gate-runner image. The two disposable file roots were returned recoverably to Trash. No unrelated Docker resource was selected.

The Implementer HEAD/tree/status-inventory hash in §1 matched before and after every planning/evidence action. No Implementer path was written, staged, cleaned, or normalized.

## 7. Git and document-control gate

Final Candidate control is:

1. pre-commit HEAD is exact `c78bc73...`; the new commit has that sole parent;
2. exact diff adds only the V1.7 Technical Candidate, Evidence Manifest, and their two adjacent sidecars as mode `100644` files;
3. no V1.0-V1.6 artifact, sidecar, failed Review, product code, test, package, lockfile, Compose implementation, Schema/Migration, or Implementer path is modified;
4. both V1.7 sidecars and every prior adjacent sidecar verify with lowercase SHA-256, two spaces, basename, and one LF;
5. Review `00fa1c5...` and all earlier Reviews remain non-ancestors; `git diff --check` exits `0`; worktree is clean after commit; and
6. the exact §5 negative gate and F-04A/F-04B/F-05/Stage-boundary searches pass.

The Candidate commit/tree are recorded only after Git creates them and are returned in the coordinator callback; embedding them in a hashed principal document would create a self-reference.

## 8. Independent next gate

Decisive Technical Lead result: **F-04B-R1 is closed at planning-Candidate level by deleting the unbound local recovery claim and selecting terminal fail-stop/escalation after total-holder loss. F-04A, ordinary F-04B, and F-05 remain closed and unchanged. No blocking Owner/ADR decision is introduced.**

Next gate: fresh independent Stage 6 S6-04 B-04 planning-amendment Review of V1.7 only. Only a later `PASS` permits coordinator presentation of unchanged `OD-B04-01`. No implementation, S6-05/S6-06, deployment, protected/Provider action, or Stage 7 follows from this manifest.
