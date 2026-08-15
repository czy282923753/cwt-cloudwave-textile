# CWT Phase 1B Stage 4A Phase D Synthetic-Only Boundary Owner Decision V1.0

Status: **CURRENT OWNER AUTHORITY / ADR-0020 ACCEPTED IN PRINCIPLE / EXACT DESIGN CANDIDATE REQUIRES FRESH INDEPENDENT REVIEW / PHASE D NOT ACCEPTED**

Decision date: `2026-08-15` (`Asia/Shanghai`)

Record version: `1.0`

Immutable source and rollback base:

```text
ref=refs/heads/codex/checkpoint/phase-1b-stage4a-phase-d-pre-formal-proof-replacement-v1
commit=fbe88cdd7639f32f48d92a0627833918b4924458
classification=IMMUTABLE_SOURCE_AND_ROLLBACK_BASE / NOT_CANDIDATE
```

Historical Guardian governance predecessor: `c1f60a91a6f0560560c080a5614a38975770ab57` (direct child of `fbe`)

Architecture record: [ADR-0020](./adr/ADR-0020-phase-d-synthetic-only-bounded-convergence.md)

Exact Design Candidate: [Phase D Synthetic-Only Bounded Convergence Exact Design V1.0](./PHASE_1B_STAGE4A_PHASE_D_SYNTHETIC_ONLY_BOUNDED_CONVERGENCE_EXACT_DESIGN_V1_0.md)

Evidence: [Aggregate Design Verification Result V1.0](./review-evidence/phase-1b-stage4a-phase-d-synthetic-only-boundary-exact-design-v1/DESIGN_VERIFICATION_RESULT_V1_0.json)

Authority: the Project Owner's current synthetic-only Phase D direction and the approved docs-only remediation disposition. This record narrows that authority; it does not broaden it.

## 1. Exact decision

1. Phase C remains accepted and unchanged.
2. The Owner approves in principle the synthetic-only Phase D architecture boundary. This does not accept this Exact Design Candidate, an implementation Candidate or Phase D.
3. Phase D may implement the accepted DeepSeek adapter boundary and validate it only through deterministic synthetic contract/evaluation fixtures, fake-adapter validation, static architecture/security/privacy validation, the existing deterministic `127.0.0.1` transport test and ordinary existing test/build/check gates.
4. The retained local transport test may bind and connect only to exact `127.0.0.1`, use a conspicuously synthetic credential and injected fetch, perform zero DNS and zero external egress, and verify redirect handling, actual Node headers and transport failure. It is local runtime semantics, not Provider/API validation.
5. Real/external Secret or credential ingress, real/external database access, external network egress and DNS, official-source live reads, Provider/API request/response/cache/cost/latency and protected Staging validation are `NOT_RUN / DEFERRED_TO_PHASE_F`. None is PASS.
6. The public Phase D real-validation CLI, controlled real-validation runner, live official-source preflight, direct-TTY Guardian, B01/APFS force-detach proof, V5.1 Guardian gate and every direct or dual real-validation acceptance route are retired.
7. A future Phase F Provider adapter credential reader and runtime composition may remain only default-off and proven unreachable from every Phase D acceptance entry. Phase D may not inspect real credential or protected registration presence.
8. `fbe88cdd7639f32f48d92a0627833918b4924458` remains the immutable source/rollback base and is never a Candidate. Governance and implementation follow the linear ancestry in section 5.
9. Guardian work remains `FORENSIC_WIP / NOT_CANDIDATE / NOT_ACCEPTED / DO_NOT_CHERRY_PICK`. Its diff and source mechanisms are prohibited implementation inputs. Custody proves recoverability, not Product, Design, implementation or Phase D acceptance.
10. The affected validation database credential remains `ROTATION_REQUIRED_BEFORE_ANY_REUSE`. No inspection, reuse, rotation or protected-state access is authorized here.
11. Unresolved supplier assurances remain Owner-accepted residual risk and are never PASS. `C-002` and `C-003` retain their established scope.
12. No Schema, Migration, dependency, package-lock, Product/API contract, URL, Redirect, SEO, publishing or Index change is approved or required. An unavoidable need returns `NEEDS_OWNER_DECISION`.
13. After independent implementation/security review, Fresh Acceptance and the synthetic-only Phase D checkpoint, the project pauses. Phase E/F require a new explicit Owner resume decision; deferral does not authorize Phase F now.
14. Production, Production data, Deploy, Push, public Publish/Index, DNS/CDN, credential rotation and unrelated external actions remain prohibited.

## 2. Supersession table

Historical files retain their original bytes except the minimal permitted ADR-0019 status/reverse-link change. This table supplies current interpretation without rewriting history.

| Historical authority | Current disposition | Preserved non-conflicting authority/evidence |
|---|---|---|
| 2026-08-12 Phase D–G Owner Decision | **Superseded only for Phase D controlled real Provider validation, continuous progression beyond the Phase D checkpoint, and Phase E/F without new explicit Owner resume.** | supplier-risk treatment, frozen data/use-case scope, `C-002`/`C-003`, Production and public-action prohibitions |
| Guardian Owner Decision | **Superseded as current Phase D architecture and implementation authority.** | immutable record of the exact prior decision and evidence-time reasoning; not PASS |
| ADR-0019 | **Superseded by ADR-0020.** | historical TTY/fault-model rationale and conclusions; original manifest remains scoped only to its original commit |
| DeepSeek V1.0/V1.1/V1.2 Designs, implementation report and V5 evidence | **Historical only; no current command, gate or implementation authority.** | immutable evidence-time facts and results; no unexecuted external result becomes PASS |
| Guardian custody WIP | **FORENSIC_WIP / NOT_CANDIDATE / NOT_ACCEPTED / DO_NOT_CHERRY_PICK.** | logical custody/recovery evidence only; no source mechanism authority |

## 3. Custody and controlled-restart evidence

Only logical, non-host-identifying metadata is persisted in Git:

```text
custodyId=phase-d-guardian-forensic-wip-v1/custody-20260815-a1
packageManifestSha256=666bdd7969afef0e1daf35e0395199dd491c2532377c1ae915057df006b92eb2
baseCommit=fbe88cdd7639f32f48d92a0627833918b4924458
recoveryResult=13/13 payload hashes PASS; complete base bundle PASS; exact 6 modified + 4 untracked inventory recovered; 10/10 files byte-identical
classification=HOST_LOCAL_PERSISTENT_OUT_OF_REPO / FORENSIC_WIP / NOT_CANDIDATE / NOT_ACCEPTED / DO_NOT_CHERRY_PICK
```

After the Owner confirmed other host work was saved, one controlled Mac restart occurred. Read-only post-restart observation recorded boot time `2026-08-15 01:58:17 Asia/Shanghai` in the host context; target B01 and legacy CWT APFS attachments and matching mounts were absent; privileged read-only process listing found no residual Guardian/verifier after excluding the query process; the ephemeral WIP repository was absent; and persistent custody remained verified. No detach, deletion, cleanup, test, Provider/database call or project mutation occurred in that post-restart verification.

An unreadable process state would be `UNKNOWN`, never inferred PASS. These facts do not accept the WIP, Design, implementation or Phase D.

## 4. Security, privacy and proof ceiling

Documentation labels alone cannot enforce synthetic-only behavior. The future convergence must remove executable real-validation reachability and prove that Phase D acceptance cannot reach real environment/database/credential or future-runtime authorities.

The proof mechanism is intentionally capped: reuse the existing verifier, one synthetic-only profile, one aggregate reachability/security result and one manifest. Mutation probes cover only the four critical regression classes: old/public real-validation CLI; database/environment import; default credential-reader/default-fetch execution; and future-runtime imports into Phase D acceptance. No new formal executable, Guardian/TTY/APFS mechanism, host-specific proof, duplicate full-tree evidence, compatibility authority or fallback is permitted.

Synthetic fixtures and evidence contain no real/private/customer or secret-derived value. The local transport test's synthetic credential is test data only and must not be persisted into evidence as if it were a Secret.

## 5. Linear ancestry, compatibility and rollback

The required forward line is:

```text
fbe88cdd7639f32f48d92a0627833918b4924458
  -> c1f60a91a6f0560560c080a5614a38975770ab57
  -> G (this docs-only governance/Exact Design Candidate)
  -> C1 bounded source convergence
  -> C2 implementation report/evidence
  -> independent implementation/security review
  -> Fresh Acceptance
  -> synthetic-only Phase D checkpoint
  -> PAUSE
```

C1 may start only after a different fresh independent full Exact Design/security review of exact G returns PASS and the Coordinator formally accepts the Design. C1 must be a direct child of G. Its Product/source diff is nevertheless verified independently against `fbe`, so governance ancestry cannot broaden implementation scope. C2 is a direct child of C1.

The accepted adapter behavior, deterministic local transport coverage, Provider-neutral architecture, Phase C durable boundaries and default-disabled future runtime posture remain compatible. Retiring the Guardian retires Phase D's `x86_64`/Rosetta/macOS `10.15.6` SDK formal-proof prerequisite; broader modernization remains a separate future decision.

Rollback of a future source convergence is a reviewed C2-then-C1 whole-commit revert while preserving G as the current governance record, or a new clean comparison/worktree at immutable `fbe`. The checkpoint ref is never moved by this task.

## 6. Required next gate

This Candidate stops for a **different fresh independent full Exact Design/security review**. Only review PASS plus Coordinator formal Design acceptance may start C1. This recorder does not implement, inspect protected state, self-review, self-accept, rotate credentials, move the checkpoint or begin Phase E/F.
