# CWT Phase 1B Stage 6 — Private GHCR / New Build Once / Tencent Runtime Operator Report V1.0

Status: **BLOCKED / HOLD — stopped at GHCR containment checker compatibility**

Recorded at: `2026-09-02T16:04:41Z`

Evidence manifest: [PHASE_1B_STAGE6_PRIVATE_GHCR_NEW_BUILD_TENCENT_RUNTIME_OPERATOR_EVIDENCE_MANIFEST_V1_0.md](./PHASE_1B_STAGE6_PRIVATE_GHCR_NEW_BUILD_TENCENT_RUNTIME_OPERATOR_EVIDENCE_MANIFEST_V1_0.md)

## 1. Authorized sequence and stop boundary

The authorized chain was:

`private-GHCR containment -> exact source fast-forward -> one Build Once -> one disposable Tencent Runtime Validation -> teardown`

The chain stopped during the first containment stage. No source fast-forward, workflow dispatch, Runner provisioning or Tencent resource creation was permitted after the accepted checker failed to recognize the live private-GHCR denial.

## 2. GHCR containment result

The Owner changed package `cwt-cloudwave-textile` from Public to Private through the standard GitHub package setting. A fresh signed-in settings-page observation then showed:

- `This package is currently private.`
- exactly one Actions repository: `czy282923753/cwt-cloudwave-textile`;
- Actions role: `Admin`;
- inherited access from the linked source repository remained enabled.

The source repository remained public. No package version, digest, tag or repository content was deleted, rebuilt, retagged, repaired or restored.

A credential-free complete anonymous observation of the old exact subject returned:

| Boundary | Result |
|---|---|
| Registry manifest challenge | HTTP `401`; Bearer challenge parsed |
| Anonymous token request | HTTP `401` |
| Token response shape | `unauthorized: authentication required` |
| Anonymous token issued | No |
| Exact manifest fetch with anonymous token | Not possible / not attempted |
| Exact subject returned anonymously | No |

This establishes current containment as a read-only observation. It is not a second release authority.

## 3. First failed boundary

The exact hash-pinned ORAS binary required by the accepted workflow was then executed credential-free with an empty `{"auths":{}}` registry config and `manifest fetch --descriptor` against the old exact digest. ORAS identity was:

- Version `1.3.3`
- Commit `210747c29c1d38732b3194878dfd8b5a6b9ad7eb`
- Git tree state `clean`
- `darwin/arm64`

It exited `1`, emitted zero stdout bytes and returned exactly:

`Error response from registry: unauthorized: authentication required`

The reviewed checker at Candidate `00b1a508fc067aff8076825ce4c4685879bde230` accepts only its canonical GHCR token-endpoint `403: Forbidden` form. A direct call with the live ORAS result returned `acceptedByCorrectedChecker=false`.

Therefore the equivalent anonymous HTTP observation cannot produce the accepted private-proof verdict and cannot override the workflow checker as a manual second authority. Dispatching the sole authorized Build Once would be a deterministic failure at its corrected private-proof gate. Under the terminal rules, the chain stopped **before** source publication and Build dispatch.

## 4. Old subject permanent disposition

The historical subject remains:

`ghcr.io/czy282923753/cwt-cloudwave-textile@sha256:3a9e4f5783e4051d88acc10287219776d354c234fb8827012a9018a1ee5e9cbb`

It is permanently unpromotable because it was previously anonymously readable, its workflow failed, it has no accepted detached evidence, and it was never Runtime-validated or promoted. Making the package private does not rehabilitate that subject. It must never be reused for Runtime Validation or Production.

The digest was preserved as audit history and was not deleted, rebuilt, retagged, repaired, restored or otherwise mutated.

## 5. Source and GitHub execution disposition

| Fact | Terminal value |
|---|---|
| Local authorized release Candidate | `00b1a508fc067aff8076825ce4c4685879bde230` |
| Candidate tree | `91416f3ef6685143d3aaa13fc04b808e78e7c33b` |
| Remote `main` | unchanged at `eb18aa94e1bd11d1e5b61714533fbde643d5c5ce` |
| Review-only commit in release ancestry | No |
| New-release workflow dispatches | `0` |
| New Build Once run/job/digest/artifact | None |
| Final repository Runner inventory | `0` |

No merge, rebase, force-push, ordinary push, Build Runner registration, Environment approval or workflow run occurred.

## 6. Tencent and Production disposition

The Tencent stage was never entered. No pay-as-you-go VM, disk, IP, security group or Runtime Runner was created. Consequently there is no Runtime run/job, runtime verdict or teardown target; billing for a disposable validation VM never started.

Future Production Lighthouse `lhins-3c2vknjb` / `cwt-production-sg` was not used, reconfigured, restarted, attached, mounted or logged into. The COS 100 GB package was untouched.

The temporary local ORAS probe directory and credential-free config were removed. No transient Runner process, registration or credential was left behind.

## 7. Complexity and next gate

No code, workflow, package, dependency, schema, Migration, Compose file, runtime validator, infrastructure definition or accepted report was changed. Only this append-only Operator closure was added. Complexity stayed level.

The terminal result is **BLOCKED / HOLD**. A separately authorized remediation must decide whether the strict classifier should also accept the exact pinned ORAS structured token denial `unauthorized: authentication required`, while continuing to reject a bare Registry first-hop 401 and all ambiguous failures. This execution authority does not authorize that remediation, a new Review, source fast-forward, retry, rerun, Build Once, Tencent provisioning, Runtime Validation, promotion or deployment.
