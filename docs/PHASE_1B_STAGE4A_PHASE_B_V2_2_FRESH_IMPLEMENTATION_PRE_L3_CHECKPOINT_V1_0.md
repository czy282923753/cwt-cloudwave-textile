# CWT Stage 4A Phase B — V2.2 Fresh Replacement Implementation Pre-L3 Checkpoint V1.0

Status: **PRE-L3 CHECKPOINT ESTABLISHED / FRESH REPLACEMENT IMPLEMENTATION AUTHORIZED / IMPLEMENTATION NOT YET MUTATED**

Date: `2026-08-11` (`Asia/Shanghai`)

## 1. Purpose and classification

This record establishes the immutable rollback boundary required before the
Fresh Phase B Provider-neutral Foundation replacement implementation under the
accepted V2.2 Design. The work is L3/high-risk because it replaces protected AI
classification, static capability/resource containment, compiled-context
integrity and authorization/source-selection boundaries. The checkpoint is a
rollback boundary, not acceptance, self-review, deployment or authority to
advance into Phase C, D or E.

## 2. Exact authorized start

| Item | Exact value |
| --- | --- |
| accepted completion checkpoint ref | `refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-v2-2-design-accepted-v1` |
| accepted completion commit | `9aa9735f422975780585e62eaec1a4759f9894c9` |
| accepted completion parent | `156cbafc061d36ce2395529a3150b0c974f3c603` |
| accepted completion tree | `33b01e701ac279b9a04868c7b14b068c84cc81b5` |
| Fresh implementation checkpoint ref | `refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v2-2-fresh-implementation-pre-l3-v1` |
| Fresh implementation checkpoint target | `9aa9735f422975780585e62eaec1a4759f9894c9` |
| implementation branch | `refs/heads/codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-v1` |
| worktree | `/Users/calvin/.codex/worktrees/b62f/CWT（CloudWave Textile）项目` |
| start state | clean index and worktree; attached to the implementation branch at the exact accepted completion commit |

The Fresh implementation checkpoint ref was created locally at the exact
accepted completion commit and verified before this record was written. It is
immutable, must never move, and must never be pushed.

## 3. Accepted authority and integrity inputs

| Input | Exact identity |
| --- | --- |
| standalone V2.2 Design | `docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_THREE_STRIKE_REPLACEMENT_CORRECTED_EXACT_DESIGN_V2_2.md`; SHA-256 `acbb32e65483f55b38f90d01e469dc7893a5869c6e60f7a6afaef18b6325967c` |
| canonical authority root | SHA-256 `9e532330f9b2920969a45f7547627bbd581fa573ac74932608dce5c6a249f4ff`; authority JCS SHA-256 `5a8d15eabf057e7e972c00898adff7db2fa80ce6b74b444ca0b2a867dc152edc` |
| current technical profile | SHA-256 `dce9f0c08418c48bceb938415ab10decd22bfb240f2b129dfe54308d51aecf85` |
| replacement proof matrix | SHA-256 `7234c06905fb21cd18689d68f9c424864ca77bd7b7099c13a65b54494fb25ae3` |
| current verifier | SHA-256 `b2672388cb000c80eae293853bc45643bc765251082ac45b64e3ef3c8f884df5` |
| Candidate manifest | SHA-256 `44f9f7bbcd5c9338338ba2bf6265b0044b2b3f7e50061edcd49377a9d09a5986`; `14/14 PASS` |
| independent PASS manifest | SHA-256 `93352c303edc460fdd1545ac4c6fcfa33343052f887d8c144eeaef73adad4e45`; `12/12 PASS` |
| acceptance record | SHA-256 `c0282c79f195e1396af783894f614b78d31309d1e9754fd31397117f7e9d6ed5` |
| completion checkpoint record | commit `1bb23e8d97e49d25ae5446d22a14202a21ed0f4a`, direct child of `9aa9735f...`; tree `959250a524023928eff6465d17c72bb0e873fb45`; record SHA-256 `2a8e073d2ed2bd33176a1bc6ef36a5c65babfd4713d605c8b06f398e450972e5` |

The accepted Design package, independent PASS package, acceptance record and
completion-checkpoint record were rehashed before this checkpoint. All earlier
checkpoint refs named by the accepted authority remained at their recorded
targets. The frozen Stage 3 tag remains object
`1c626f9b788e4c6ed0480a7040aa54ccef3e6c76`, peeled commit
`31c0e405acfdd0d05200d0fb2531e897a541a2c4`.

## 4. Ancestry and failed-code isolation

The starting commit has exactly one parent and matches the accepted completion
tree. Historical failed implementation refs may occur in existing ancestry or
evidence, but they are not implementation proof authority. This implementation
must remain a linear successor of `9aa9735f...` and must use no merge,
cherry-pick, rebase, amend or history rewrite.

Product/source blobs from Attempt 3 commits `629c121c...` and `49ddafc...`, early
failed refs `755e514...`, `a696325...`, `b1a73bb...`, `d8a24d...`, and failed
V2 refs `0d5b067...`, `2e6dc7...`, `b7ad96b...` are prohibited reconstruction
inputs. Required behavior is reconstructed independently from the accepted
V2.2 Design/profile/PASS evidence. Final evidence must prove the new range has
no merge/cherry-pick and must compare replacement/removal behavior without
using forbidden failed source blobs.

## 5. Allowed scope and prohibitions

Mutations are limited to necessary paths under `src/ai/**`, colocated Phase B
tests, existing Phase B composition under `src/server/ai/**`,
`scripts/verify-ai-architecture.ts`, replacement fixtures under
`test-fixtures/ai-architecture/**`, and versioned `docs/**` evidence/report
paths. Any required mutation outside this allowlist is a
`NEEDS_OWNER_DECISION`/`BLOCKED` outcome.

The implementation must not mutate Schema, Migration, snapshot, journal, seed,
package, lock, dependency, TypeScript/Lint/build configuration, Product/public,
SEO/URL/Redirect/font/pagination, Production Prompt prose or any Phase C/D/E
runtime. It must not add a compatibility flag, second classifier/checker/map,
persistent coordination, Provider adapter/SDK/endpoint/credential/network,
fallback, RAG/retrieval/vector/vision/tool/file/customer-support or private
Inquiry/CRM path. It must not merge, push, deploy, publish, index, call a
Provider, use production credentials or perform another irreversible external
action.

## 6. Rollback and next gate

Rollback is to abandon the implementation branch and recreate a clean worktree
from:

`refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v2-2-fresh-implementation-pre-l3-v1`

which must continue to resolve to exact
`9aa9735f422975780585e62eaec1a4759f9894c9`. No reset, ref move or destructive
cleanup is required to preserve the checkpoint.

The authorized terminal deliverable is one clean Fresh implementation Candidate
with exact final-code evidence and a coordinator callback. It is not accepted by
this implementer. The next gate is Fresh Independent Implementation Review,
which must first audit all repaired and preserved-closed findings under
`REMEDIATION_FINDINGS_REVIEW`, then decide `FULL_REVIEW_NECESSITY` with explicit
rationale while always enforcing identity, checkpoint, manifest, clean-state
and frozen-boundary gates.
