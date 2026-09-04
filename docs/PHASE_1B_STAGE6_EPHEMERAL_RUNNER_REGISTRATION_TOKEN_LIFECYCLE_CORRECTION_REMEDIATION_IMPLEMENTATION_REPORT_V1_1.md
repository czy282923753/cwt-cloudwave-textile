# CWT Phase 1B Stage 6 — Ephemeral Runner Registration Token-Lifecycle Correction Remediation Implementation Report V1.1

Date: **2026-09-04**

Status: **REMEDIATION IMPLEMENTATION COMPLETE — separate Fresh Independent Review required; Product Runtime remains HOLD**

Evidence manifest: `docs/PHASE_1B_STAGE6_EPHEMERAL_RUNNER_REGISTRATION_TOKEN_LIFECYCLE_CORRECTION_REMEDIATION_EVIDENCE_MANIFEST_V1_1.md`

Authority boundary: **One bounded F-01 remediation. No Technical Escalation artifact was modified, and no live token, Tencent TAT, VM, GitHub Runner, workflow, Registry, Runtime Validation or deployment action was performed.**

## 1. Outcome and exact lineage

The remediation is complete at code Candidate `f26809ad82ff50c9c93e2bf635208e7ec153b117`.

| Boundary | Exact identity |
| --- | --- |
| Failed V1.0 docs closure / remediation base | `3b211373bfdc68cd990887834aff967265a38d68` |
| Failed V1.0 code Candidate | `49f4ab86f0801e8aa5f5354c7c0de97bcba09ac2` |
| Review-only commit | `7fe353622a5bfa311d360fa7420953e9b183f9d6`; inspected read-only and excluded from ancestry |
| V1.1 remediation Candidate / tree | `f26809ad82ff50c9c93e2bf635208e7ec153b117` / `d59c64a18095b5dec7ae51436ba74330e05b13f5` |
| Candidate sole parent | `3b211373bfdc68cd990887834aff967265a38d68` |
| Branch | `codex/stage6-runner-registration-token-lifecycle-v1` |

This append-only V1.1 closure does not alter the failed V1.0 reports or the Review-only commit. There is no merge and the Review-only commit is not an ancestor of the remediation Candidate.

## 2. F-01 root cause and replacement

The failed Candidate launched the exact payload under TAT's default/root execution context, then used `sudo -u ubuntu -H` for both Runner configuration and start. That privilege-transition command necessarily placed the registration token in the `sudo` process argv during `config.sh --token`, making it eligible for process inspection and command-event capture outside the intended GitHub Runner boundary.

The remediation replaces that mechanism rather than layering a token transport workaround:

1. the registration TAT invocation is mechanically fixed to native execution user `ubuntu`;
2. the payload independently verifies current username, non-root UID and equality with the host's actual `ubuntu` UID before reading or using registration inputs;
3. root, another username or a mismatched `ubuntu` UID returns the fixed `execution_user_invalid` refusal before `config.sh` or `run.sh`;
4. the payload invokes `config.sh` directly as its current `ubuntu` process, with the token appearing only at the required official `config.sh --token` child boundary; and
5. after configuration the token is blanked/unset before the one direct detached `run.sh` launch.

The `sudo` transition is deleted from the executable payload. No token file, pipe, vault, daemon, retry, state machine, helper service, second registration path or second startup path was added.

## 3. Current Tencent TAT execution-user authority

The current official Tencent Cloud Automation Assistant `RunCommand` API documents `Username` as the user name under which a command executes on a CVM or Lighthouse instance and states that Linux otherwise defaults to `root`. The official `CommandDocument` and `Invocation` structures also expose the requested/actual execution username. Sources inspected on 2026-09-04:

- Tencent Cloud, **RunCommand** API: <https://cloud.tencent.com/document/api/1340/52676>
- Tencent Cloud, **Data Structures** (`CommandDocument.Username`, `Invocation.Username`): <https://cloud.tencent.com/document/product/1340/52687>

Therefore the minimal repository contract `deploy/runtime-validation/tencent-tat-runner-registration-invocation.v1.json` fixes `operation: RunCommand`, `commandType: SHELL` and `username: ubuntu`. It records only non-secret execution settings. It does not embed a token or introduce another input/custody path; the already accepted one-time environment-input boundary remains unchanged.

This contract is separate from `tencent-tat-provisioning-invocation.v1.json`: provisioning continues to require its root setup authority, while registration/start is the later native-`ubuntu` operation.

## 4. Exact payload contract

| Boundary | V1.1 result |
| --- | --- |
| Shell trace | `set +x` before input read |
| Execution identity | exact `ubuntu`, non-root, current UID equals host `ubuntu` UID |
| Root/wrong identity | refusal before config/start |
| Required one-time inputs | unchanged four environment inputs |
| Exported token | copied once locally, then immediately unset before config |
| Token process argv | exactly one direct `config.sh --token` child; no privilege/wrapper argv |
| Config output | stdout/stderr discarded |
| Post-config token | local blanked/unset and environment name absent before state check/start |
| Runner start | direct `run.sh` under `nohup` plus `env -u CWT_REGISTRATION_TOKEN`; stdin/output closed |
| Registration flags | exact `--unattended --ephemeral --disableupdate --replace --work _work` |
| Repository | exact `czy282923753/cwt-cloudwave-textile` |
| Name | exact `cwt-tencent-sg-<128-bit-lowercase-hex-nonce>` |
| Labels | exact `cwt-tencent-singapore,cwt-single-use,cwt-job-<nonce>` plus GitHub standard labels |
| Retry/fallback/second path | absent |

Unknown, missing or malformed token/nonce/name/repository values still fail before configuration. Registration failure, signal termination, missing/non-regular `.runner` state and launch failure remain terminal and never retry.

## 5. Tests and mutation resistance

The existing test file was extended in place; no second harness was created. It uses only a conspicuously Synthetic token and temporary local runner files.

| Proof | Result |
| --- | --- |
| Exact `ubuntu` identity | one direct config and one start; PASS |
| Root / wrong user / mismatched UID | no config, no start; fail closed |
| Config failure / signal / absent state | no start; fail closed |
| Launch failure | one config and one start attempt; no success marker |
| Missing/malformed inputs | eight cases fail before config |
| Token in payload output, stderr, trace or generated state | absent |
| Token environment in Runner child | absent |
| Direct detached Runner behavior | process remains observable after launch check; token absent |
| Required repository/name/labels/flags | exact, including `--replace` |
| `sudo` or generic wrapper mutation | rejected |
| Token export/output/file-custody mutation | rejected |
| Second config path mutation | rejected |
| TAT username changed from `ubuntu` | rejected |
| Extra invocation token-custody field | rejected |

Negative test strings and README prohibitions name the removed `sudo` mechanism only to prove it cannot re-enter. The executable payload and invocation contract contain no `sudo` reference or path.

## 6. Verification ledger

| Gate | Result |
| --- | --- |
| Bash syntax | PASS |
| Focused registration suite | PASS; 8/8 |
| Full deployment suite | PASS; 138/138 |
| Full repository ESLint | PASS; zero warnings |
| `pnpm typecheck` | PASS |
| Invocation JSON parse and exact-key mutation guard | PASS |
| `git diff --check` | PASS |
| Exact four-path Candidate scope | PASS |
| Review-only commit excluded from ancestry | PASS |

## 7. Security & Test Simplification Check

- **Root Cause First / Replace, Not Layer:** native TAT execution identity replaces the privilege-transition path; no token-hiding mechanism was added around it.
- **One authority:** TAT binds the process to `ubuntu`, while the payload performs one local identity refusal check. Neither creates a second registration or launch mechanism.
- **Minimal secret custody:** one-time environment input, one ordinary local copy, one direct official config child, immediate clear, and explicit removal from the Runner child environment.
- **Bounded implementation:** one existing payload, one existing test, one existing README paragraph and one minimal invocation JSON changed.
- **No control-plane growth:** no file transport, pipe, token service, persistence, daemon, retry, fallback, state machine or cloud helper exists.

## 8. Claim ceiling and next gate

This remediation proves repository structure and Local/Synthetic behavior only. It does not prove a live TAT invocation record, live environment transport, actual GitHub registration, VM destruction or Runtime Validation.

External action ledger: **zero token acquisition; zero TAT/VM/Runner action; zero workflow dispatch/rerun; zero Registry write; zero Build Once; zero promotion/deployment; no push.**

Implementation status: **COMPLETED**. Product Runtime remains **HOLD**. The sole next gate is one separate Fresh Independent Implementation / Operations / Security Review of Candidate `f26809ad82ff50c9c93e2bf635208e7ec153b117`; this Implementer does not self-approve.
