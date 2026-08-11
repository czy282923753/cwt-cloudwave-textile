# CWT Stage 4A Phase B — IMP2-NM01 Owner Decision Record V1.0

Status: **OWNER DIRECTION RECORDED / CORRECTED DESIGN AUTHORING ONLY / IMPLEMENTATION NOT AUTHORIZED**

Decision received: 2026-08-11 (Asia/Shanghai)

## 1. Approved direction

The Owner explicitly approved the coordinator-recommended IMP2-NM01 direction:

1. Keep the selected M02 32-rule registry byte-identical and preserve it as the single protected-data classifier authority.
2. Continue classifying all human-entered text, business-source values and labels, and Provider-bound evidence text.
3. Treat application-generated association metadata—including `kind`, `targetType`, `targetAlias`, `expectedVersion`, and `snapshotHash`—through exact structural and integrity validation, not natural-language protected-data classification.
4. Require `snapshotHash` to be recomputed from the authorized RFC 8785/JCS canonical target snapshot with SHA-256 and matched as exactly 64 lowercase hexadecimal characters. Association kind/type/version/alias and target identity must remain strict; tamper, wrong target/version/algorithm, malformed hash, or replay mismatch fails closed.
5. Create one application-owned, closed typed context-domain traversal. Every strict context field must belong to exactly one validation domain; zero or multiple domains fail closed. No second scanner, path exception list, compatibility traversal, or consumer-local bypass is allowed.
6. Keep `input_context_json` shape and accepted bytes, `input_sources_json` purpose, full-context JCS and `input_hash`, Schema/Migration, and Provider-neutral architecture unchanged.
7. Require Corrected Exact Design V1.8 and a Fresh Independent Design PASS before any implementation correction.

This is an architecture/security proof-boundary clarification. It does not change the Owner-selected `M02-D1-INCLUDE` or `M03-D1-DISCRIMINATED-SEAM` decisions.

## 2. Security meaning

The choice distinguishes data by authority and purpose, not by a consumer exception:

- Machine-controlled association metadata is accepted only when its closed grammar and recomputed integrity tuple match the authorized target snapshot and durable projection. Arbitrary text cannot enter these fields.
- Human/business/Provider-evidence fields still invoke the exact selected M02 classifier identity. Invalid control, unsupported traversal/value, or any of its 32 protected matches rejects before Provider resolution.
- A valid lowercase SHA-256 string may contain phone-like digit runs. That is not a human-language value and is not classified as one; it remains protected by recomputation, tuple comparison, full-context JCS, and `input_hash`.
- Prompt variables remain a pure application projection and do not expose association metadata. The complete unchanged context remains persisted and hash-covered for replay.

Expected false-positive consequence: valid association hashes no longer fail merely because hexadecimal output contains a phone-like decimal run. Expected false-negative consequence: none is accepted for human/business/Provider evidence because those domains keep the same M02 identity and closed grammar. The machine domain is deliberately narrow; any unclassified field or malformed machine token fails closed.

## 3. Scope and non-authority

This record authorizes only the V1.8 design, profile, offline consistency proof, imported immutable review evidence, and SHA-256 manifest. It does not approve the Candidate, grant implementation authority, consume the remaining IMP2-M01/M02/M04 correction attempts, or reopen frozen closed findings.

It does not authorize product-source, test-fixture, Schema/Migration, snapshot/journal/seed, dependency/lockfile, Prompt-runtime, Provider, or business-page changes. It also does not authorize Provider/API/credential/network/spend, Staging/Production, Deploy, Publish, Index, formal import, Phase C/D/E, merge, or Push.

## 4. Fixed review disposition

- `IMP2-NH01`: CLOSED.
- `IMP2-M01`, `IMP2-M02`, `IMP2-M04`: OPEN after correction attempt 2; each retains exactly one final ordinary correction attempt. No attempt occurs here.
- `IMP2-NM01`: OPEN at task entry, no correction attempt; V1.8 may correct only its design proof boundary.
- `IMP2-M03`, `IMP2-M05`, `IMP2-L01`, `IMP2-L02`: frozen CLOSED and subject to non-regression only.

## 5. Next gate

Only the original independent Design Reviewer may conduct a Fresh Independent Corrected Design V1.8 Review against the exact committed Candidate. Until PASS, implementation and the remaining ordinary correction attempts remain prohibited.
