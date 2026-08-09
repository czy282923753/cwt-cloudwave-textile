# CWT Stage 4A Phase A Independent Completion Review Evidence V1.0

- Evidence version: `1.0`
- Captured: `2026-08-10` (Asia/Shanghai)
- Reviewer worktree: `/Users/calvin/.codex/worktrees/02d9/CWT（CloudWave Textile）项目`
- Audited Integration HEAD: `717cbac284350ec23f786ee239a354085ee0d827`
- Evidence type: read-only command/result summary plus fresh local gate results

## 1. Identity gate

```text
HEAD=717cbac284350ec23f786ee239a354085ee0d827
HEAD^=46733d25cbd14f5450ed6c251a8e1b2b72b8b027
integration_branch_ref=717cbac284350ec23f786ee239a354085ee0d827
merge=46733d25cbd14f5450ed6c251a8e1b2b72b8b027
merge_parent_1=0964caa45167eee4f66212570955edb3b3e80b40
merge_parent_2=15bc6462d2e314f50ff238af70ad31fc6502c40f
candidate_ancestor=true
governance_ancestor=true
frozen_tag_type=tag
frozen_tag_object=1c626f9b788e4c6ed0480a7040aa54ccef3e6c76
frozen_tag_peeled_commit=31c0e405acfdd0d05200d0fb2531e897a541a2c4
reviewer_checkout=detached
reviewer_worktree_before_deliverables=clean
integration_branch_worktree=clean
git_lock_files=0
active_git_pnpm_vitest_writers=0
```

The `project-owner-handoff` baseline collector independently reported exact HEAD match, clean entry state, no upstream, no configured remote, no submodules, and matching key evidence hashes. The frozen tag was verified separately because it intentionally peels to the Stage 3 frozen commit rather than the post-freeze Integration HEAD.

## 2. Exact Candidate blob cross-check

```text
MATCH 5a1d2e3b768cd9968eb0ff9c7b7e1791eb29152a db6ae44d3548e2c0c23ab2b95ee3550fefedb93224f878f5a9ab3070898b60a8 docs/PHASE_1B_STAGE4A_PHASE_A_0020_AI_FOUNDATION_SCHEMA_DESIGN_V1_0.md
MATCH 951df74ebab313eeb1f6f3393a58e5bf58c0e760 a7e2192b1dd60f41b66b1f19db1a44e2a35c01d246ae97787ef9aaaec60cac3c drizzle/0020_phase1b_ai_foundation.sql
MATCH 9f0f3cb5cda9bb8bb6a48a50b70f846c57347120 274ad623210843981a27d262df2057213230f3943c3faafa16a2f15397792321 drizzle/meta/0020_snapshot.json
MATCH b4f899456030b4316de6fdf00b6535b53795d9a6 bea61c8329c1dd78d6a1620e8357dfc153e05af46beb47629b4510c9f831eef7 drizzle/meta/_journal.json
MATCH bd5001f02ae758af157ce84b7e905dc9efc6b07d 3f288f10bbb11e9a657e038af198bb31f0a471ecacb4f7d9e9ae6848ac241ed4 package.json
MATCH fe9639730c165ef390a3cc21e91bc10462e1da78 bb5d7f945bd17903b6ff492d5a1927528cc6d1a00aa7bcc8274e0abafdc16be1 scripts/verify-ai-foundation-candidate.ts
MATCH 279c914bfc3136babb06b2eb6cb335e8edf4116c f87d5765c19cd8ac5f0c3be042f2128578dfd9e1fb61eec18600560d77b572b4 src/db/schema/ai.integration.test.ts
MATCH 2da1de28d33c03924f3e8e2aea87584115f55aaf 9f09c3a2e4532556384c8527886ec235a8ff9d9f390eb91d09e29712f5287449 src/db/schema/ai.ts
MATCH 5aea0db76d6bd8563116a973b39339bd2917f42e 09badb6cbc33665d85918f1244a140409908518696a49a690c7df7bddc931070 src/db/schema/index.ts
```

For every row the Candidate-commit and Integration-HEAD blob OIDs were equal before the SHA-256 was computed from the Integration Git object.

## 3. Migration history and Journal

```text
historical_sql_count=20
historical_snapshot_count=20
historical_artifact_total=40
baseline_vs_integration_git_object_diff=empty
baseline_journal_entries=20
integration_journal_entries=21
journal_prefix_0_19_structural_diff=empty
0020_phase1b_ai_foundation_count=1
0020_index=20
0020_when=1786311287317
```

## 4. Fixed evidence identity

```text
db6ae44d3548e2c0c23ab2b95ee3550fefedb93224f878f5a9ab3070898b60a8  docs/PHASE_1B_STAGE4A_PHASE_A_0020_AI_FOUNDATION_SCHEMA_DESIGN_V1_0.md
fe17a42990f1b55fca89e1f038cede9c09aff3c418379ff8d4c54d882ff3e6b2  docs/PHASE_1B_STAGE4A_PHASE_A_0020_INDEPENDENT_MIGRATION_REVIEW_V1_0.md
898c8917ed0f982b843eb70269a9ca76073f1a0b72b0a66c731ba1c31f80b0ef  docs/PHASE_1B_STAGE4A_PHASE_A_0020_INDEPENDENT_CANDIDATE_REVIEW_V1_0.md
57d89f5f11a92444de62dfd894d3582b3718533a490b43831767eae8fc2bcbaf  docs/review-evidence/phase-1b-stage4a-0020-candidate-v1/SHA256SUMS.txt
dd80c891fc6c35186870609aa467e316b967513065b29069517f1499aa36cbed  docs/PHASE_1B_STAGE4A_PHASE_A_COMPLETION_INTEGRATION_REPORT_V1_0.md
0415ec62fbc24faf63c61ff7b98cfb9a22321851f7c1539b90f36c2185dcae08  docs/PHASE_1B_STAGE4A_PHASE_A_ACCEPTANCE_ORACLE_ERRATUM_V1_0.md
300019a7f80b521f24bb1c9efaf902c0aa30a4501fb273ec73bee99b5e0429c5  docs/PHASE_1B_STAGE4A_OWNER_DEVELOPMENT_AUTHORIZATION_V1_0.md
manifest_payload_count=19
manifest_payloads_verified=19
manifest_failures=0
```

The manifest must be checked from the repository root because every entry is repository-relative. A diagnostic invocation from inside the evidence subdirectory failed to resolve those paths; the corrected root invocation verified all 19 payloads. No payload was missing or changed.

## 5. PostgreSQL evidence audit

```text
postgresql_version=PostgreSQL 18.4 (Debian 18.4-1.pgdg13+1)
server_version_num=180004
image_digest=sha256:3a82e1f56c8f0f5616a11103ac3d47e632c3938698946a7ad26da0df1334744a
network_binding=127.0.0.1 only
storage=2GiB tmpfs, no mounts
container_after_review=absent
image_after_review=present, arm64/linux
fresh_journal=21
fresh_second_run_journal=21
upgrade_journal_before=20
upgrade_journal_after=21
fresh_upgrade_catalog_signature=d3ec059c98bb6e66df952bd4e692329788d0921e9ee3d7da5acdd7d015285d87
forced_failure_sqlstate=42P07
forced_failure_rolled_back_ddl=true
interruption_child_exit=86
interruption_next_invocation_noop=true
check_negative_cases=40, all 23514
legal_run_states=30
uniqueness_cases=3, all 23505 with expected identity
restrict_delete_cases=4, all 23001 with expected named FK
contention_lock_health=0 idle-in-transaction, 0 advisory, 0 tuple
scale_fixture=10000 configurations, 100000 runs, 365 days, 24 months
planner_enable_seqscan=on
query_plan_expectations=13/13 intended indexes
```

The archived `expectError` helper asserts both `error.code` and `constraint_name`, and fails if the operation succeeds. The four L-01 cases therefore prove rejection, SQLSTATE, and intended FK identity rather than merely copying a reported code.

## 6. Fresh Integration gates

```text
pnpm db:verify:ai-foundation-candidate
exit=0
result=PASS: approved design identity, 40 historical artifacts, journal append, exact columns/defaults/nullability/types, constraints, indexes, and scope

pnpm lint
exit=0
result=PASS: eslint . --max-warnings=0

pnpm typecheck
exit=0
result=PASS: tsc --noEmit

pnpm exec vitest run src/db/schema/ai.integration.test.ts
exit=0
result=1 test file passed; 1 test passed; duration 2.36s

pnpm test:run
exit=0
result=98 test files passed; 417 tests passed; duration 250.14s
```

The full-suite inquiry-error lines were expected sanitized test-path output; the suite exited zero with every test passing.

## 7. Documentation and scope checks

```text
changed_markdown_files=17
local_markdown_links=95
missing_local_links=0
post_merge_non_document_changes=0
phase_b_src_ai_tree=absent
provider_network_call=absent
provider_credential_lookup=absent
rag_vector_embedding_dependency=absent
customer_support_implementation=absent
extra_schema_or_migration=absent
```

Status-text review confirmed:

- current P1-02A development is authorized;
- Phase A remains an Integration Candidate until this independent decision is accepted;
- Phase B has not started;
- PD-04–PD-07 evidence gaps remain unresolved non-blocking reference risk;
- the accepted risk does not extend to customer/Inquiry/CRM/private/sensitive/unreviewed data; and
- Provider/API, credentials, Staging/Production, Deploy, Publish, Index, and formal import remain unauthorized.

## 8. Whitespace diagnostics

`git diff --check 46733d25cbd14f5450ed6c251a8e1b2b72b8b027 717cbac284350ec23f786ee239a354085ee0d827` reports:

- five Markdown lines ending in two spaces, each used as a CommonMark hard break in metadata/status presentation;
- three progress lines in `build-with-isolated-postgres.log` with captured line-ending whitespace; and
- one final blank-line diagnostic each for `build-with-isolated-postgres.log`, `full-test.log`, and `targeted-test.log`.

The Markdown formatting is intentional and the three logs are manifest-covered immutable evidence. No source, Schema, Migration, test, report-accuracy, or reproducibility defect results.

## 9. Prohibited-action evidence

```text
candidate_files_modified_by_reviewer=0
audited_existing_files_modified_by_reviewer=0
integration_branch_commits_created=0
phase_b_started=false
provider_calls=0
credentials_used=0
staging_or_production_actions=0
deploy_publish_index_formal_import=0
push=0
```
