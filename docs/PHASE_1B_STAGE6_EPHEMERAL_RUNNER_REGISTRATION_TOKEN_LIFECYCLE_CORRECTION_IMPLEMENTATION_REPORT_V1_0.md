# CWT Phase 1B Stage 6 — Ephemeral Runner Registration Token-Lifecycle Correction Implementation Report V1.0

Date: **2026-09-04**

Status: **IMPLEMENTATION COMPLETE — separate independent Review required; Product Runtime remains HOLD**

Evidence manifest: `docs/PHASE_1B_STAGE6_EPHEMERAL_RUNNER_REGISTRATION_TOKEN_LIFECYCLE_CORRECTION_EVIDENCE_MANIFEST_V1_0.md`

Authority boundary: **One ordinary bounded correction for the new pre-Runtime Runner registration/start shell root cause. No Technical Escalation artifact was modified, and no cloud, token acquisition, TAT execution, Runner, workflow, Registry or Runtime action was performed.**

## 1. Outcome

The correction is complete at code Candidate `49f4ab86f0801e8aa5f5354c7c0de97bcba09ac2`.

The prior operator-assembled registration/start text is replaced by one reviewable executable payload at `deploy/runtime-validation/register-and-start-ephemeral-runner.sh`. The payload remains separate from the accepted provisioning setup payload and owns only one registration followed by one start. It is not a validator, cloud lifecycle authority, token-acquisition mechanism or workflow controller.

The failed `readonly CWT_REGISTRATION_TOKEN` plus `unset CWT_REGISTRATION_TOKEN` lifecycle is removed. The payload copies the required exported token into an ordinary local variable, immediately unsets the exported input, supplies the local value only to the single silent `config.sh` invocation, verifies the expected `.runner` registration state, clears the local value, proves the exported name remains absent, and performs one `run.sh` launch through an explicit `env -u CWT_REGISTRATION_TOKEN` child boundary.

## 2. Corrected linear baseline

| Boundary | Exact identity |
| --- | --- |
| Accepted OCI repair Candidate | `506d92bf396bae52d7d8e54dabc46345036e4f86` / tree `d1e61ef09baccbb2229886a97394ec65156e7797` |
| Original append-only V1.6 evidence | `3b2801bfbb27d672b2dc2e2d7b88c1cc8fea0c5c` |
| Corrected linear evidence baseline | `aece565bc062ad47d6e92b4503c0e4c130c802bd` |
| Baseline sole parent / tree | `506d92bf396bae52d7d8e54dabc46345036e4f86` / `5e34a14e6e8b3cc707397bfc7bce6acadda87c57` |
| Code Candidate | `49f4ab86f0801e8aa5f5354c7c0de97bcba09ac2` |
| Candidate sole parent / tree | `aece565bc062ad47d6e92b4503c0e4c130c802bd` / `20937e58cea896e612bbd1f141d28813d0648a1e` |
| Branch | `codex/stage6-runner-registration-token-lifecycle-v1` |

The corrected baseline replays exactly the four V1.6 evidence blobs byte-for-byte on top of the accepted OCI repair. All five accepted OCI repair code/test blobs at `aece565b...` equal the corresponding blobs at `506d92bf...`. No merge, rebase of immutable evidence, or code regression exists in the Candidate lineage.

## 3. Exact implementation

### 3.1 Required inputs and fixed identity

The zero-argument payload accepts exactly four required environment inputs from the already accepted single TAT transmission boundary:

- `CWT_REGISTRATION_TOKEN`: 20–256 characters from the conservative alphanumeric, underscore and hyphen set;
- `CWT_RUNNER_NONCE`: exactly 128-bit lowercase hex;
- `CWT_RUNNER_NAME`: exactly `cwt-tencent-sg-<nonce>`; and
- `CWT_GITHUB_REPOSITORY`: exactly `czy282923753/cwt-cloudwave-textile`.

Missing or malformed values fail before registration. The runner installation must be the non-symlink `/opt/cwt-actions-runner` directory with executable `config.sh` and `run.sh`.

The single configuration keeps the accepted repository URL, `--unattended`, `--ephemeral`, `--disableupdate`, `_work`, exact name and exact custom labels:

```text
cwt-tencent-singapore
cwt-single-use
cwt-job-<nonce>
```

GitHub Runner adds the standard `self-hosted`, `linux` and `x64` labels. No `--replace`, retry or second registration exists.

### 3.2 Secret lifecycle

Shell tracing is disabled before any input is read. `CWT_REGISTRATION_TOKEN` is never declared readonly or exported by the payload. The exported input is removed before `config.sh`; only the ordinary local copy is passed as its `--token` argument. Configuration stdout/stderr is discarded so the token cannot enter retained TAT output through the payload.

After successful configuration and exact `.runner` state presence, the local variable is blanked and unset before launch. The `run.sh` child is additionally created via `/usr/bin/env -u CWT_REGISTRATION_TOKEN`. The payload writes no token, token file, log, credential copy or retained evidence.

### 3.3 One start and fail-closed behavior

One `nohup` launch runs `run.sh` as `ubuntu` with standard input and ordinary output closed. After one bounded second, failure to observe the launched process is terminal. Configuration failure, absent registration state or launch failure emits only a fixed reason code and never retries.

Cloud create/delete, TAT invocation, token acquisition, GitHub API cleanup, workflow dispatch and Runtime validation remain outside the payload.

## 4. Tests and failure matrix

The new test uses only temporary Local/Synthetic runner files and shell function stubs. No real token, GitHub call, TAT operation or Runner process is used.

| Contract | Result |
| --- | --- |
| Valid inputs and registration state | exactly one config and one start; PASS |
| Config failure | no start; fail closed |
| Missing `.runner` state | no start; fail closed |
| Launch failure | exactly one config and one start attempt; fail closed |
| Missing/malformed token, nonce, name or repository | no config and no start; fail closed |
| Exported token during config/start | absent |
| Local token scope during start | absent |
| Token in stdout, stderr, trace or fixture files | absent |
| Readonly-plus-unset causal mutation | rejected |
| Exact name, repository, labels and `--ephemeral` | retained |
| Retry, fallback, second config or second start | absent |
| Operator reconstruction of `config.sh`/`run.sh` | forbidden by tested README contract |

## 5. Verification ledger

| Gate | Result |
| --- | --- |
| `/bin/bash -n` | PASS |
| Focused registration payload tests | PASS; 6/6 |
| `pnpm test:deployment` | PASS; 136/136 |
| Focused ESLint | PASS; zero warnings |
| `pnpm typecheck` | PASS |
| `git diff --check` | PASS |
| Accepted OCI repair five-blob equality | PASS |
| V1.6 evidence four-blob equality and sidecars | PASS |
| Exact three-path implementation scope | PASS |

## 6. Security & Test Simplification Check

- The correction deletes the contradictory readonly/unset lifecycle instead of layering a workaround.
- Token handling uses one ordinary local variable and the existing process environment; no file, vault, encryption, custody or cleanup mechanism was added.
- An initially considered token-content filesystem scan was removed before Candidate freeze because it would expose the token to an extra command and add no authority. Tests instead prove the payload writes no token and that output/files/start scope remain secret-free.
- Tests use the existing Node deployment test framework and Bash stubs; no new harness or mock service was added.
- There is one configuration, one registration-state check and one launch. No retry, fallback, classifier, state machine, service or cloud lifecycle path exists.

Total complexity stays bounded: one version-controlled shell payload replaces ad-hoc operator text, one focused test file covers the causal boundary, and one existing README paragraph now points to the payload.

## 7. External-action and claim ceiling

This task performed **zero token acquisition, zero TAT invocation, zero GitHub Runner registration/deletion, zero VM/Runner/resource creation, zero workflow dispatch/rerun, zero Registry mutation, zero Build Once, zero promotion and zero deployment**. It used only conspicuously Synthetic token data and local temporary fixtures, which were removed by the test harness.

Production, Staging, Lighthouse, COS, DNS, S6-06, S6-07 and Stage 7 were untouched. Product Runtime remains **HOLD** because no external Runner or Runtime execution was authorized or performed.

## 8. Terminal disposition

Implementation status: **COMPLETED**.

Next gate: **one separate independent Reviewer task**. This Implementer does not self-approve and does not authorize another external execution.
