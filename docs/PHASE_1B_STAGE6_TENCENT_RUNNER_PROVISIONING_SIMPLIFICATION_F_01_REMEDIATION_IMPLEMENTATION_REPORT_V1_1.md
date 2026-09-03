# CWT Phase 1B Stage 6 — Tencent Runner Provisioning Simplification F-01 Remediation Implementation Report V1.1

Status: **IMPLEMENTATION COMPLETE — remediation Candidate ready for one Fresh Independent Implementation / Operations / Security Review**

Recorded at: `2026-09-03T13:47:18Z`

Evidence manifest: [PHASE_1B_STAGE6_TENCENT_RUNNER_PROVISIONING_SIMPLIFICATION_F_01_REMEDIATION_EVIDENCE_MANIFEST_V1_1.md](./PHASE_1B_STAGE6_TENCENT_RUNNER_PROVISIONING_SIMPLIFICATION_F_01_REMEDIATION_EVIDENCE_MANIFEST_V1_1.md)

This is an append-only V1.1 remediation successor. It does not modify the V1.0 implementation report/manifest, the V1.1–V1.4 Runtime Operator history, or failed Review commit `aba7a1b8c4a60bf0ebba63515d01f2e52dc43503`.

## 1. Authority and Candidate

| Fact | Exact value |
|---|---|
| Remediation base / V1.0 docs closure | `aa1cc95c6f27945ceb65baf241783728e48363f0` |
| Failed Review | `aba7a1b8c4a60bf0ebba63515d01f2e52dc43503`; Review-only and non-ancestor |
| Remediation Candidate | `faab04781d9be67a1bb185e06a2a6cabb19f6e69` |
| Candidate tree | `72e3a6527f5f8d14e28b714556c4e95a3a3a27ef` |
| External action / push | None / none |

The accepted exact package selector, Docker/Compose/Runner versions, Runner archive digest, whole-tree `ubuntu:ubuntu` convergence, `_diag` create/check/remove probe and actual `ubuntu` Docker access probe remain unchanged.

## 2. F-01 root cause and correction

The V1.0 operator contract made the final `CWT_PRE_REGISTRATION_OK` marker mandatory while leaving Tencent TAT at its default 60-second timeout and allowing verbose apt/dpkg/Runner installation output to exceed the retained ordinary-output ceiling before that marker. The intended package phase had independently exceeded both limits.

The V1.1 correction narrows the same single payload and its current operator invocation contract:

1. `deploy/runtime-validation/tencent-tat-provisioning-invocation.v1.json` records the current TAT invocation parameter `timeoutSeconds: 600`; the default `60` is not accepted.
2. Tencent TAT terminal `SUCCESS` plus exact process exit code `0` is the sole completion authority for permitting registration.
3. Timeout, cancellation, terminal failure, missing exit code or any nonzero exit forbids registration. A visible marker cannot override those facts.
4. The final marker remains concise corroboration only. Its absence from retained output does not contradict TAT's independently reported terminal `SUCCESS` and exit `0`.
5. The unchanged script remains the only pre-registration setup payload; no verifier, COS output path, second command, service, retry or classifier was added.

The invocation metadata is a current operator parameter/configuration, not a permanent Provider architecture constant and not cloud provisioning logic.

## 3. Bounded output implementation

After the existing fresh-host gate passes, the payload creates one root-owned ephemeral log under `/tmp` with `umask 077` and explicit mode `0600`, then redirects all verbose Docker package and Runner installation stdout/stderr into it.

| Path | Result |
|---|---|
| Success | Restore TAT stdout/stderr, strictly remove the Runner download workspace and local log, then emit only one concise `CWT_PRE_REGISTRATION_OK ...` marker |
| Verbose-phase failure | Preserve the original nonzero process status, restore TAT stdout/stderr, emit one bounded status line plus at most a sanitized `4096`-byte tail, remove local temporary material, and exit with the original status |
| Cleanup failure on success | Remains nonzero; no success marker is emitted |

The retained ordinary-output ceiling is recorded as `24576` bytes, while the success budget is `1024` bytes and the failure diagnostic tail is `4096` bytes plus a short fixed status line. No command uses `tee` or replays the full log. The setup accepts no credential input, and the operator contract forbids custom environment values, registration tokens, Runtime credentials or other secrets during this phase.

## 4. Scope

| Path | Change |
|---|---|
| `deploy/runtime-validation/provision-ubuntu-amd64-runner.sh` | Adds one ephemeral output envelope and preserves original nonzero exit status |
| `deploy/runtime-validation/tencent-tat-provisioning-invocation.v1.json` | Adds the current exact `600s` TAT parameter, output budgets and terminal completion authority |
| `deploy/scripts/provision-ubuntu-amd64-runner.test.mjs` | Extends the existing deployment test surface with terminal-authority and noisy-output fixtures |
| `deploy/host/README.md` | Replaces mandatory-marker wording with the exact TAT terminal-status/exit-code operator contract |

No workflow, package manifest, product code, Schema, Migration, Provider credential, cloud lifecycle or Runtime validator changed.

## 5. Verification

| Gate | Result |
|---|---|
| Bash syntax | PASS |
| Focused provisioning suite | `10/10 PASS` |
| Full deployment suite | `127/127 PASS` |
| ESLint | PASS; zero warning |
| JSON parsing and invocation contract | PASS |
| `git diff --check` | PASS |
| Prior provisioning V1.0 sidecars | PASS; byte-preserved |
| ShellCheck | Not run; unavailable locally and no dependency was added solely for this task |
| YAML | Not applicable; no YAML changed |
| Live Tencent/Ubuntu execution | Not run; outside authority |

Synthetic noisy success emitted roughly 200 KiB inside the local log but retained only the short corroborating marker, below the `1024`-byte budget. Synthetic noisy failure returned its original exit `73`, retained the final safe reason, and emitted less than the `4096`-byte tail plus fixed header. The matrix proves:

- `600 + SUCCESS + 0` authorizes even when retained output omits the marker;
- default `60` does not authorize;
- marker plus failed/timed-out/cancelled state, nonzero exit or missing exit never authorizes;
- prior SIGPIPE/parser negatives remain PASS;
- mandatory-marker authority and unbounded success replay are absent.

## 6. Security & Test Simplification Check

- Delete/replace: mandatory-marker authority and unbounded verbose output were removed from the one existing path.
- Standard mechanisms: TAT's standard timeout/status/exit metadata, file-descriptor redirection, one mode-`0600` temporary file and an EXIT trap are sufficient.
- No added control plane: no second verifier, wrapper service, COS evidence, daemon, retry, fallback, state machine or new test framework exists.
- Secret boundary: setup contains no token/credential input; custom invocation environment and secrets are forbidden; full logs are never returned to TAT and are deleted.
- Claim ceiling: local tests prove the envelope logic and decision contract, not Tencent TAT transport or real Ubuntu installation behavior.

Total operational complexity remains lower than the ad-hoc path: the one script now owns bounded process output, while TAT's existing terminal metadata owns completion. There is no dual completion authority.

## 7. Open findings and next gate

No known blocking implementation finding remains. Live TAT status/exit reporting, 600-second behavior, real package/Runner installation and log cleanup on the disposable Ubuntu host remain External Validation Required. Exact package disappearance remains fail-closed.

The next and only gate is one Fresh Independent Implementation / Operations / Security Review of Candidate `faab04781d9be67a1bb185e06a2a6cabb19f6e69`. Any non-PASS keeps the work on HOLD. This report grants no push, Tencent VM, live installation, Runner registration, Runtime Validation, rebuild, promotion, deployment, Production/COS/DNS, S6-06/S6-07 or Stage 7 authority.
