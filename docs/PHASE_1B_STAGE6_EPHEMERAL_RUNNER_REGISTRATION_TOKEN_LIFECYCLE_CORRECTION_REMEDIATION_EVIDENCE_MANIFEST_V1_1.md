# CWT Phase 1B Stage 6 — Ephemeral Runner Registration Token-Lifecycle Correction Remediation Evidence Manifest V1.1

Date: **2026-09-04**

Status: **COMPLETE REMEDIATION EVIDENCE — awaiting Fresh Independent Review; Product Runtime remains HOLD**

Principal report: `docs/PHASE_1B_STAGE6_EPHEMERAL_RUNNER_REGISTRATION_TOKEN_LIFECYCLE_CORRECTION_REMEDIATION_IMPLEMENTATION_REPORT_V1_1.md`

## 1. Identity and ancestry

| Evidence | Exact result |
| --- | --- |
| Remediation base / failed V1.0 docs closure | `3b211373bfdc68cd990887834aff967265a38d68` |
| Failed V1.0 Candidate | `49f4ab86f0801e8aa5f5354c7c0de97bcba09ac2` |
| Review-only finding commit | `7fe353622a5bfa311d360fa7420953e9b183f9d6`; non-ancestor |
| Remediation Candidate / tree | `f26809ad82ff50c9c93e2bf635208e7ec153b117` / `d59c64a18095b5dec7ae51436ba74330e05b13f5` |
| Candidate sole parent | `3b211373bfdc68cd990887834aff967265a38d68` |
| Push / live external action | none / none |

## 2. Exact Candidate inventory

The Candidate changes exactly four allowed paths:

```text
M deploy/host/README.md
M deploy/runtime-validation/register-and-start-ephemeral-runner.sh
A deploy/runtime-validation/tencent-tat-runner-registration-invocation.v1.json
M deploy/scripts/register-and-start-ephemeral-runner.test.mjs
```

| Path | Mode / Git blob | SHA-256 |
| --- | --- | --- |
| `deploy/host/README.md` | `100644` / `0e22111e7fca4dd2859a974ce950632be08c7400` | `41da623cffe4655670017d3181a7aecf53a999f06fe383df6a7fb59f89d8de84` |
| `deploy/runtime-validation/register-and-start-ephemeral-runner.sh` | `100755` / `1281a207e5ebe58b7fb78900213a44ef26ad7e0a` | `7c773a341cfd629dae2985f7c51792aee6f917ca5df7733f7200d26e780da94b` |
| `deploy/runtime-validation/tencent-tat-runner-registration-invocation.v1.json` | `100644` / `5ab9405bc487d8cf74ab32c4daa9c1a51dfab759` | `3c65d0b05ae694885b7bb9c32ebed048758a3369bcf2d4637721506eaec448a1` |
| `deploy/scripts/register-and-start-ephemeral-runner.test.mjs` | `100644` / `af23836ffb4a46e3c1098d72c99e9f3f05f5b1cc` | `c64b12cf0e67deee07bc8e2f9f712fc94231d466fa35afb0ac68486bad05478e` |

No product, workflow, provisioning payload, OCI checker, database, Schema/Migration, Registry, lifecycle, Runtime validator or protected-environment path changed.

## 3. Decisive F-01 evidence

| Boundary | Candidate result |
| --- | --- |
| TAT action | exact `RunCommand` |
| TAT execution user | exact `ubuntu` |
| TAT default/root execution | rejected by contract and payload identity check |
| Current identity | username `ubuntu`, non-root UID, exact host `ubuntu` UID |
| Identity failure point | before token validation, config and start |
| Config process | one direct `config.sh`; no privilege or generic wrapper process |
| Token process argument | only direct `config.sh --token` |
| Executable `sudo` reference/path | zero |
| Token environment after local copy | unset before config |
| Token local lifetime | blanked/unset immediately after config and before state/start |
| Config output / token file / pipe / retained evidence | discarded / absent / absent / absent |
| Runner child | one direct `run.sh`, detached; token environment explicitly removed |
| Repository, name and labels | exact and unchanged |
| Flags | exact `--unattended --ephemeral --disableupdate --replace --work _work` |
| Retry / fallback / second path / new authority | absent / absent / absent / absent |

Official execution-user evidence:

- <https://cloud.tencent.com/document/api/1340/52676> — current `RunCommand.Username` execution-user field; Linux default is root when omitted.
- <https://cloud.tencent.com/document/product/1340/52687> — current command/invocation data structures expose execution username.

## 4. Local/Synthetic verification

| Check | Exact result |
| --- | --- |
| Bash syntax | PASS |
| Focused suite | 8 tests; 8 PASS; 0 failed/skipped/cancelled/todo |
| Full deployment suite | 138 tests; 138 PASS; 0 failed/skipped/cancelled/todo |
| Exact `ubuntu` positive | one config, one start, one sanitized marker |
| Root/wrong-user/wrong-UID negatives | three fail before config/start |
| Config failure/signal/state absence | three fail without start |
| Missing/malformed input negatives | eight fail before config |
| Launch failure | terminal after one start attempt |
| Detached direct start / child token env | PASS / absent |
| Token output/trace/generated-state content | absent |
| `sudo`/wrapper/token-retention/second-path mutations | rejected |
| Wrong TAT username / added token-custody field mutations | rejected |
| Full repository ESLint / TypeScript | PASS / PASS |
| Invocation JSON / diff check | PASS / PASS |

## 5. Resource and mutation ledger

| Boundary | Result |
| --- | --- |
| Real credential/token acquisition or use | `0` |
| Tencent TAT / VM / Runner invocation or mutation | `0 / 0 / 0` |
| GitHub Runner registration/deletion | `0 / 0` |
| Workflow dispatch/rerun | `0 / 0` |
| Registry write / Build Once / retag | `0 / 0 / 0` |
| Runtime transition / promotion / deployment | `0 / 0 / 0` |
| Production / Staging / Lighthouse / COS / DNS | untouched |
| S6-06 / S6-07 / Stage 7 | not started |
| Git push | none |

## 6. Claim ceiling

This manifest proves only the bounded local remediation Candidate and the non-secret TAT execution-user contract. Live Tencent event-record behavior, live environment transport, actual Runner registration/start, VM destruction and exact-digest Runtime Validation remain External Validation Required.

Implementation status: **COMPLETED**. Product Runtime: **HOLD**. Next gate: one separate Fresh Independent Implementation / Operations / Security Review of `f26809ad82ff50c9c93e2bf635208e7ec153b117`.
