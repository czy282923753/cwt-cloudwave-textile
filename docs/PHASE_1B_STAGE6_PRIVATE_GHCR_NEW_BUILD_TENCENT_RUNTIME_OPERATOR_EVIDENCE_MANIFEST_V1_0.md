# CWT Phase 1B Stage 6 — Private GHCR / New Build Once / Tencent Runtime Operator Evidence Manifest V1.0

Status: **COMPLETE EVIDENCE FOR BLOCKED / HOLD OUTCOME**

Principal report: [PHASE_1B_STAGE6_PRIVATE_GHCR_NEW_BUILD_TENCENT_RUNTIME_OPERATOR_REPORT_V1_0.md](./PHASE_1B_STAGE6_PRIVATE_GHCR_NEW_BUILD_TENCENT_RUNTIME_OPERATOR_REPORT_V1_0.md)

## 1. Candidate and ancestry

| Fact | Exact value |
|---|---|
| Authorized local release Candidate | `00b1a508fc067aff8076825ce4c4685879bde230` |
| Candidate tree | `91416f3ef6685143d3aaa13fc04b808e78e7c33b` |
| Checker implementation | `9eb6d1d8fff385a61eb7d6c07f64de5bb4b16e8f` |
| Fresh Review-only commit | `0fb5561e2aed132673b003dad4df60514da627a3` |
| Review-only commit in Candidate ancestry | No (`git merge-base --is-ancestor` exit `1`) |
| Remote `main` after stop | `eb18aa94e1bd11d1e5b61714533fbde643d5c5ce` |

## 2. Package containment observation

Observed at `2026-09-03` Asia/Shanghai through the signed-in GitHub package settings page:

| Check | Result |
|---|---|
| Package | `czy282923753/cwt-cloudwave-textile` |
| Visibility after Owner action | Private |
| Source repository visibility mutation | None |
| Linked Actions repository count | `1` |
| Linked Actions repository | `czy282923753/cwt-cloudwave-textile` |
| Actions role | `Admin` |
| Inherit access from source repository | Enabled |

## 3. Credential-free anonymous evidence

The request used no GitHub, GHCR or registry credential.

| Observation | Exact result |
|---|---|
| Old exact digest | `sha256:3a9e4f5783e4051d88acc10287219776d354c234fb8827012a9018a1ee5e9cbb` |
| Initial exact-manifest response | HTTP `401` |
| Bearer challenge | Parsed |
| Anonymous token response | HTTP `401`, JSON error `UNAUTHORIZED` / `authentication required` |
| Token response body length | `73` bytes |
| Anonymous exact manifest response | Not attempted because no token was issued |
| Exact subject returned | `false` |

The follow-up ORAS descriptor observation used the exact accepted archive URL and verified archive SHA-256 `f33fc12753c54172b0d0d19eaa0318d3f90fe9b094d96e8b259c881713c92e1c` before execution.

| ORAS observation | Exact result |
|---|---|
| Version / commit / tree | `1.3.3` / `210747c29c1d38732b3194878dfd8b5a6b9ad7eb` / `clean` |
| Platform | `darwin/arm64` |
| Registry config | newly created mode-`0600` file containing only `{"auths":{}}` |
| Command authority | exact old digest; `manifest fetch --descriptor` |
| Exit / signal / spawn error | `1` / `null` / `false` |
| stdout bytes | `0` |
| stderr bytes | `68` |
| stderr SHA-256 | `5d6686e20f5726d3ec038e6f4e3bfd917c1de44a231f88346a34e1a2838a2cc0` |
| stderr | `Error response from registry: unauthorized: authentication required` |
| Accepted by reviewed checker | `false` |

This live structured token denial is distinct from a bare Registry manifest first-hop 401. The current checker nevertheless rejects it, so no authoritative private-proof PASS exists.

## 4. External execution and cleanup inventory

| Check | Terminal result |
|---|---|
| Workflow runs for head `00b1a508...` | `0` |
| Build Once run/job | None |
| Detached evidence artifact | None |
| New OCI digest | None |
| Repository Runner count | `0` |
| Disposable Tencent VM | Not created |
| Runtime workflow run/job/verdict | None |
| Disposable disks/IP/security-group residue | None created |
| Temporary ORAS probe directory | Removed |
| Production Lighthouse `lhins-3c2vknjb` | Untouched |
| COS 100 GB | Untouched |
| Push performed | No |

## 5. Permanent old-subject classification

The old digest is append-only classified as permanently unpromotable. Its prior anonymous readability, failed Build workflow, missing detached evidence and missing Runtime validation cannot be repaired by later package containment. No prior report was mutated.

## 6. Closure assertion

This manifest supports only **BLOCKED / HOLD** at the GHCR containment checker-compatibility boundary. It proves neither a new Build Once nor Runtime Validation. No continuation, repair, retry, rerun, promotion, Production deployment or additional Review is authorized.
