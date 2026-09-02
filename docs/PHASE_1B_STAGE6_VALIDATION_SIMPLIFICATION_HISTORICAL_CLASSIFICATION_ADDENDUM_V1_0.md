# CWT Phase 1B Stage 6 — Validation Simplification Historical Classification Addendum V1.0

Date: **2026-09-02**

Status: **APPEND-ONLY CAUSAL CLASSIFICATION — immutable revocations unchanged**

## 1. Scope

This addendum records the Owner-accepted causal classification required by Validation Simplification V1.1. It does not modify, replace or reinterpret the bytes of any original release, audit, transition, validation or revocation record.

Both historical subjects remain permanently revoked and ineligible:

| Release | OCI index | Immutable disposition |
| --- | --- | --- |
| `fe6e5b057aa7054d42f02f76d31858d3f71be3a9` | `sha256:0a2f4651c569db1eba3eab465c3092122c0d80b8fe7b81166e11be1b4293fc46` | Never restore, reuse, promote or repair-rebuild |
| `e105d68d75032e9ba7eb86f4e8479cc09175c821` | `sha256:57c95535939eef9376563799849ecf27027eea518709faa0705aef0c6a5119ad` | Never restore, reuse, promote or repair-rebuild |

## 2. Required classification for the second subject

The exact accepted classification is:

> pre-container-start Private DIND Harness failure after gateOpen, incorrectly classified as subject failure.

The Docker CLI helper failed while reading `--env-file /etc/cwt/staging/runtime.env`. The CWT container never started. The historical validator had already set `gateOpen`, so its then-current failure logic incorrectly treated the harness failure as Product-subject evidence.

## 3. Prospective boundary

The new supported Linux path must cover the same real `/etc/cwt/staging/runtime.env` and secret/storage mount contract. A future reproduction on that supported path is a new deployment-correctness result bound to that later exact run. It does not automatically rewrite history, restore either subject, classify a Product defect, revoke another digest or authorize retry/remediation.

This addendum adds causal clarity only. The original revocation markers and all original historical evidence remain unchanged.
