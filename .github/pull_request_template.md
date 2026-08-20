## Scope

- [ ] This PR has one bounded purpose and does not mix unrelated Product or infrastructure work.
- [ ] The latest candidate commit SHA is recorded here: `______________________________`.
- [ ] The base and head refs are correct; no root worktree, accepted tag, or archival ref was rewritten.

## Evidence for the latest commit

- [ ] `Quality + PostgreSQL` PASS.
- [ ] `Build + public bundle` PASS.
- [ ] `Browser` PASS.
- [ ] `Dependency security` PASS, or explicitly confirmed not applicable because neither `package.json` nor `pnpm-lock.yaml` changed.
- [ ] No applicable check is pending, cancelled, indeterminate, unexpectedly skipped, or from an older commit.
- [ ] Fresh independent Codex Review PASS applies to this exact candidate SHA, with no open BLOCKER/HIGH finding.

## Safety and merge decision

- [ ] CI used only disposable test databases/storage and no Production/Staging secrets or real external services.
- [ ] The Coordinator has confirmed the applicable gate evidence.
- [ ] The Owner has authorized this merge after reviewing the latest-commit evidence.
- [ ] Merge method is **Create a merge commit**; squash/rebase/force-push/delete are not used in the normal workflow.
- [ ] Any emergency Owner exception is documented with reason, exact SHA, evidence gap, decision time, recovery action, and follow-up result.

GitHub Free private-repository controls do not platform-enforce every item above. The Owner has accepted that residual risk; this checklist and actual CI/Review evidence are the project governance gate, not a claim of paid-platform enforcement.
