# CWT Stage 4A Phase B — Corrected Exact Design V1.6 V15-M01 Remediation Audit V1.0

- Status: **REMEDIATION CANDIDATE COMPLETE / NOT SELF-APPROVED / IMPLEMENTATION NOT AUTHORIZED**
- Date: `2026-08-11` (Asia/Shanghai)
- Branch: `codex/phase-1b-stage4a-phase-b-corrected-design-v1`
- V1.5 failed-review HEAD: `da2143654a372f70a93ff22f9fcb6e999f1e528e`
- V1.5 direct parent: `9cedefd618a168176f8d70a85e3ec8cb684967a7`
- Byte-identical FAIL import checkpoint: `b55fe1a7bcda91bce685392f2b4092e226bf560f`
- Technical-escalation ancestor: `377181cd76e5427f344ff0c259fc9bd32ec7b670`
- Accepted rollback: `6bc26cf035608a21a057d6f4e87da8d4f7f23d40`
- Contract/profile/verifier checkpoint: `8e24c049fd833e37c4b058230a7a037b45d1db80`
- Exact final Candidate commit/parent: reported from Git after the manifest commit in the Coordinator callback and Fresh Review request; not self-embedded because the commit identity covers this file

## 1. Outcome and authority boundary

This audit closes only Fresh Independent Review finding `V15-M01`. It does not reopen or change the Owner's approvals of `M02-D1-INCLUDE` and `M03-D1-DISCRIMINATED-SEAM`. It creates no implementation attempt, source/config/Schema/Migration/ADR/dependency change, Provider/API/network/credential/spend action, Phase C/D/E work, merge or Push.

The result is a V1.6 corrected Design Candidate. It is not independently approved. The only next gate is a Fresh Independent Corrected Design Review by the original Reviewer against the exact sealed V1.6 HEAD.

## 2. Immutable inputs verified

| Input | Exact SHA-256 | Result |
|---|---|---|
| Corrected Exact Design V1.5 | `22d9820f1faa5b318bb6904adcefbb96ba59559f132c9dcd611e16c574643698` | byte-identical |
| V1.5 derivation report | `481947f06bd51139d081b46bf3ef852f1ce233191428e568b1c970ad36547d65` | byte-identical |
| Owner Selection Record | `21c5db60154374f52546dae730dd2893d1fb53689757cf969106b9f1c7c96fa2` | byte-identical |
| V1.5 22-item manifest | `a98890959e9e24c522367b9e788cdd797cb6e98d5d1d57e35dcbdea01e853d6e` | 22/22 PASS |
| Fresh FAIL report | `723a4d59af63c66117ed2c5a9dcb349a18c970b85b067bba6eda8bcb129e1aa4` | imported byte-identically |
| Fresh FAIL evidence | `3a75df5276e8fd8d34a2d88aa29f038a538870e6e9333b7d006106bb94d1d73a` | imported byte-identically |
| Decisive graph probe | `2eb4720dcb48ffda9d29f679ce192900415a46e5ea982ac1116a4baf04ee36bb` | imported byte-identically |
| Decisive graph output | `71a92f48794310604f125feb489451d743cb28751f85fdd05c25430684cd42d4` | imported byte-identically |
| Fresh FAIL 17-item manifest | `5a8635b95a6b435ff3b5e7111a86d13c0a379ca2f908e434dd899e7118819f01` | 17/17 PASS |
| Accepted V1.4 | `48e6afebfba53f65c03077a1ca27522f0245f17cbd0b3b46ff492929cf1e0c07` | byte-identical |
| Accepted Remediation V1.3 | `6f3868e860a5951951750d7b2e07a4ab7c777b8c9c772db0563348ea0ed7d0a7` | byte-identical |

The frozen annotated tag object/peeled commit remains `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` / `31c0e405acfdd0d05200d0fb2531e897a541a2c4`. Failed implementation refs `755e514...`, `a696325...`, `b1a73bb...`, and `d8a24d...` remain non-ancestors and evidence only.

## 3. Root cause

V1.5 declared a total 12-class graph but expressed intended nesting through prose precedence and incomplete exact/directory matchers. The mandatory graph guarantee and the executable inventory were therefore not generated from one closed causal contract. Three root configuration executables were absent from the finite control registry, and `tests/e2e`/`.spec`/setup-teardown semantics were absent from the test selector. The author verifier checked that 12 classes existed but did not execute them over the actual tree.

This was not a database-seam defect and not a request for six ad hoc exceptions. The causal defect was an incomplete classifier language plus a verifier that never applied that language to the actual repository.

## 4. Bounded correction

V2.1 preserves all 12 V2.0 class IDs. It adds no class and changes neither the Owner-selected seam nor the complete fail-closed guarantee.

The one machine authority now defines:

1. a raw actual-filesystem `lstat` walk independent of Git index/ignore state;
2. exact executable/control/protected-resource candidate predicates;
3. exact physical-root, symlink, hard-link, canonical, generated, tracked/untracked/ignored behavior;
4. one closed selector compiler with only six matcher fields;
5. independently evaluated, explicitly disjoint selectors where priority never resolves overlap;
6. authority ceilings and edge direction for test/root-control classes;
7. design-Candidate versus future implementation-gate composition cardinality; and
8. inventory, content and classification hash domains plus mandatory mutations.

The finite root-control registry contains all nine current control candidates, not a wildcard: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `drizzle.config.ts`, `playwright.config.ts`, and `vitest.config.mts`. A new unknown root executable remains zero-class and fails closed.

Test semantics are path under `src/test/`, `tests/`, or `test-fixtures/`, or a declared `.test.*`, `.integration.test.*`, or `.spec.*` suffix. Synthetic AI fixture subtrees retain their more specific existing class through explicit exclusion from the general test selector. This closes setup/teardown and `.spec` causally without basename exceptions.

## 5. Exact disposition of the six decisive paths

| Path | V2.1 sole class | Stage/bundle authority |
|---|---|---|
| `drizzle.config.ts` | `root-control-file` | build/migration control; never Production closure |
| `playwright.config.ts` | `root-control-file` | isolated-test control; never Production closure |
| `vitest.config.mts` | `root-control-file` | isolated-test control; never Production closure |
| `tests/e2e/global-teardown.ts` | `other-test-fixtures` | test-only |
| `tests/e2e/product-import.spec.ts` | `other-test-fixtures` | test-only |
| `tests/e2e/public.spec.ts` | `other-test-fixtures` | test-only |

`src/test/**` also receives `other-test-fixtures`, correcting the same semantic root rather than retaining accidental Production classification.

Test/control classification grants no AI Provider/adapter, Provider credential/endpoint, external Provider network, public/server entry or Production runtime authority. Existing local migration configuration, loopback browser/database activity and synthetic test credentials remain pre-existing test/build concerns. Test code may exercise Production code under isolation; Production/public/server code may not import or execute test/control nodes.

## 6. Actual-tree proof contract

The V1.6 proof must report:

- every class and all sorted members, including empty classes;
- total candidate and executable counts;
- `zeroClass=[]` and `ambiguous=[]`;
- exact excluded physical-root states;
- tracked, untracked and ignored counts after inclusion;
- protected, test, root-control, Phase B composition, Phase D and adapter status;
- raw inventory SHA-256 over canonical per-node metadata;
- content SHA-256 over path/raw-content-hash records; and
- classification SHA-256 over path/class/stage/bundle records.

Executable/protected-resource verifier/profile/probe files under `docs/review-evidence` are themselves diagnostic candidates and are hashed before capture. `.txt` captures and `SHA256SUMS.txt` are evidence envelopes, avoiding a self-hash exception without narrowing any executable/resource input.

Final sealed proof values:

```text
total candidates       402
total executables      362
inventory SHA-256      79285d21fd75b1a64b5d6bd3f3917bf3a25dd051dea850c6c6f0abd666b19a86
content SHA-256        e0b4f10ee3d21915a3f74b5a4e9280fd36abdb2c5d2b03eb275c1fe694fc052e
classification SHA-256 964fb51dad53c886ead8c5506a78cd59014b38fdb5239e3ab821612e150cda6e
zeroClass              []
ambiguous              []
```

## 7. Mutation audit

The offline verifier must produce exact fail-closed results for:

| Mutation | Required disposition |
|---|---|
| new unknown root executable | `fail_closed_unclassified` |
| one path added to a second class | `fail_closed_ambiguous` |
| remove each of six classifications | six independent `fail_closed_unclassified` results |
| silently exclude `tests/` | missing required actual-tree membership / integrity failure |
| symlink node | `fail_closed_symlink` |
| canonical/hard-link alias | `fail_closed_hard_link_alias` |
| alias import into reserved composition | `fail_closed_capability_ceiling` |
| unmanifested generated resource | `fail_closed_unmanifested_generated_resource` |
| early Phase D root | `fail_closed_future_stage_unauthorized` |
| early Provider adapter | `fail_closed_future_stage_unauthorized` |
| second composition root | `fail_closed_undeclared_composition` |
| altered sealed exclusion table | `profile_integrity_mismatch` |

The final verifier reports `17/17` mutation negatives. A verifier that only checks the six names, only class count, only Git-tracked files, or only a few acquisition spellings is non-conforming.

## 8. Exact V1.5-to-V1.6 change map

| V1.6 location | Change | Preserved authority |
|---|---|---|
| title/status/fixed identity | version V1.6, V1.5 FAIL and remediation lineage | Owner record and rollback unchanged |
| §2.1 | sole V15-M01 correction boundary and byte-identical FAIL authority | M02/M03 selections unchanged |
| §2.3 | V2.1 selector/walk/classification/hash/mutation contract | actual database types and discriminated seam unchanged |
| §19.3–19.5 | future architecture gate consumes actual inventory and disjoint selectors | complete graph/acquisition/bundle guarantee unchanged |
| §20.3 | actual-tree and mutation proof plus non-regressions | later implementation tests unchanged |
| §23 | Fresh Review checklist for V15-M01 | all prior acceptance checks retained |
| §25–26 | root-cause/complexity/next-gate correction | no implementation authority |

Every other complete Design section remains present. V1.6 still contains 26 top-level sections and the exact `ai_model_config` 21/21 plus `ai_runs` 96/96 field order.

## 9. Non-regression

| Boundary | Result |
|---|---|
| M02 selected INCLUDE registry and full Unicode transition challenge | PASS, unchanged |
| fixed Unicode runtime mismatch negative | PASS |
| M03 branch-local PGlite/Postgres positive | TypeScript exit 0 |
| unnarrowed union / cross-driver / destructured-union negatives | each `TS2375` |
| `H-01`, `H-02`, `M-01..M-06`, `L-01`, `N-M01..N-M04` | all 13 retained |
| four Production Draft use cases / human review / no fallback / Phase split | retained |
| `ai_model_config` / `ai_runs` mapping | 21/21 and 96/96 |
| Production Provider registry / Phase D adapter zone | empty / absent |
| failed implementation reuse / implementation attempt 4 | none / none |

## 10. Impact ruling

| Impact | Result |
|---|---|
| Schema / Migration | none |
| ADR / security-exception ADR | none |
| dependency / package / lock | none |
| persistent coordination / Complexity Approval | none |
| SEO / URL / Redirect | none |
| data reconciliation/import | none |
| source/config/test-fixture change | none |
| additional Owner decision | none |

This is a bounded correction because it retains the approved 12-class total graph, strengthens its mechanical realization, and grants no new capability. If a future change proposes another class, weakens total fail-closed behavior, activates Phase D/adapter authority, or changes the selected database seam, that is outside this remediation and requires the applicable Owner/design gate.

## 11. Deliverables and final hashes

| Artifact | SHA-256 |
|---|---|
| Corrected Exact Design V1.6 | `06fb0795cc05e6651f63f46226c67290e108103cb567e5aa5e80a8b09a33eec2` |
| this remediation audit | `self hash is carried by SHA256SUMS; not self-embedded` |
| M03 graph/classification profile V2.1 | `12860f30803c14bda5aac2c40cc0dbbf7176093037180ccb2bb50e26addc6702` |
| offline V1.6 verifier | `e735ef027ec4bc2fd049269d950195dc94123500a9e557da611ff31426ceea46` |
| actual-tree inventory output | `682593fb6075ac17119b71baac3e436391aa4317848afed52c1222d90b202658` |
| verifier capture | `f27e0bfd5c23ed6325a97433aeae0d3ae736698500e9f633fec0b0dca230dc6c` |
| V1.6 SHA256SUMS | `manifest hash is reported outside itself and in callback` |

All paths are under `docs/` or `docs/review-evidence/`. The final worktree must be clean and the V1.6 manifest must verify every V1.6-owned and imported FAIL artifact it declares.

## 12. Gate

Status after sealing: **CORRECTED EXACT DESIGN V1.6 CANDIDATE / NOT SELF-APPROVED / IMPLEMENTATION NOT AUTHORIZED**.

Recommended next gate: the original independent Reviewer performs a Fresh Independent Corrected Design Review against the exact V1.6 HEAD, manifest, actual-tree inventory and captured verifier output. No implementation starts before PASS and a later explicit implementation authorization.
