# CWT Stage 4A Phase B — Design Gate Acceptance and Fresh Implementation Authorization V2.0

Status: **DESIGN PASS ACCEPTED / FRESH PHASE B IMPLEMENTATION CANDIDATE AUTHORIZED / IMPLEMENTATION NOT ACCEPTED**

Recorded: 2026-08-11 Asia/Shanghai

## 1. Accepted design gate

The Project Owner's controlling instruction is:

> “接受 V1.7 Corrected Design Gate，并授权创建全新 Phase B Implementation Candidate；禁止复用或 cherry-pick 失败实现，完成后必须独立审查。”

The accepted design object is:

- branch: `codex/phase-1b-stage4a-phase-b-corrected-design-v1`;
- exact commit: `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6`;
- Corrected Exact Design V1.7 SHA-256: `e432fbd96029c423e5f206cbd17c5abfc48518ce4254b36095a26537afd2c834`;
- Fresh Independent Review V1.2 conclusion: `PASS`;
- review report SHA-256: `4ac82227aa361174640fbacb99a77976fdacf25848d6bb374fe9cbf0753382d5`;
- review evidence SHA-256: `55b68e863d26121207d27ae4bc556b5f11ee2e53c791fe5890112d94003154c0`;
- official Next lifecycle proof SHA-256: `28095a4bc5cf3a7bf0ce6f1072054e2cb4fd1e1d0fd344c2aba0883c0e27683a`;
- reviewer challenge SHA-256: `e0ea4247fcb9a74c360f869fab33ee3bc33f1c479849ee54a42935d89123a980`;
- challenge output SHA-256: `b9755dd1445bb72d24c916f15af996da45b0517aaae4cff2252de7f1177069ba`;
- review manifest SHA-256: `8b4a3418064f26980c4bff890e81fbba3b5591cc8b639083147be913c334a62e`.

The six review artifacts are imported byte-for-byte at their repository-relative paths. The manifest verifies its five protected entries exactly.

## 2. Fresh implementation authority

This record authorizes one fresh implementation Candidate on:

- branch: `codex/phase-1b-stage4a-phase-b-foundation-implementation-v2`;
- exact start and accepted rollback checkpoint: `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6`;
- sole implementation contract: `docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_7.md`.

The implementation is limited to the V1.7 Phase B Provider-neutral foundation. It may add the approved source, test, test-fixture, proof-tooling, Prompt-authority and package-script wiring required by V1.7. It may not modify the accepted `0020` Schema, Migration, snapshot or Journal, and it may not add dependencies or change lockfile/package dependency identities.

## 3. Failed-implementation isolation

The following failed implementation commits are negative review evidence only and are prohibited as implementation sources:

- `755e514540351ed53ee96bedd5ea12f3e934387e`;
- `a696325fa2608c77e526bb7403bb911d34200064`;
- `b1a73bb8aae87f7c862117b32ce5c2a051f21b84`;
- `d8a24d48592a8c5e112d20edd24505e9e34d83c9`.

No source, test or fixture may be cherry-picked, merged, copied or mechanically replayed from those commits. The fresh Candidate must retain evidence that each failed commit is a non-ancestor and that the implementation was authored from the accepted V1.7 contract and accepted repository baseline.

## 4. Authority explicitly not granted

This acceptance and authorization does not authorize:

- acceptance or self-approval of the implementation Candidate;
- a real Provider adapter or Provider registry entry;
- DeepSeek or any other Provider API, credential, endpoint, network call or spend;
- Production Prompt prose;
- `ai_runs` durable repository, enqueue, Worker, claim, lease, retry, cancellation, scheduler, dispatch or outbox;
- Phase C, Phase D or Phase E;
- Product/Content business integration, business page, Server Action or Admin UI;
- Schema, Migration, ADR, dependency or Owner-material change;
- Staging or Production access;
- Deploy, Publish, Index, formal data import, merge or Push.

Production Provider registry and Production Prompt manifest remain exactly empty in Phase B. AI remains Draft-only and human-review-required, with Publish and Index under their existing independent authorities.

## 5. Required next gate

Completion of the fresh implementation Candidate is not acceptance. The only next gate is a Fresh Independent Phase B Implementation Review of the exact Candidate branch and commit by the original independent Reviewer. Phase C/D/E may not begin before that review returns PASS and a later explicit authorization opens the next phase.
