# Independent review policy

This policy governs independent code review and Phase acceptance. Reviewers also follow the frozen CWT V1.1 baseline, root `AGENTS.md`, applicable domain specifications and `docs/ENGINEERING_GOVERNANCE.md`.

## 1. Review objective

Review determines whether the current Phase is acceptably safe, private, data-correct, publicly correct, operationally usable and maintainable. It does not maximize finding count or attempt to disprove every theoretical failure combination.

## 2. Severity

### Blocker

A deterministic issue on a currently supported path that causes or imminently permits severe security/privacy impact, unrecoverable data corruption, failure of a core system capability, or an inability to continue acceptance safely.

### High

A reproducible, material issue on a currently supported path involving authorization bypass, incorrect public exposure, important data inconsistency, or core publishing/recovery risk.

### Medium

A Medium finding must satisfy all of these conditions:

- It is on a real execution path supported by the current Phase.
- It has a deterministic reproduction or sufficient code evidence.
- It causes a material error, unexplained durable state or clear operational impact.
- It is not only a provider-semantics hypothesis.
- It is not reachable only by manually bypassing the application to corrupt the database, except for the cases defined in Section 3.
- Existing durable retry or reasonable operator recovery does not adequately handle it.
- The expected benefit of correction exceeds the added complexity.

Authorization, privacy, accidental publication, data loss and disagreement between user-visible results and durable facts are rated by actual impact and are not automatically downgraded because they are unlikely.

### Low

Low covers local maintainability or experience issues, unlikely edges, extra defensive constraints and non-blocking technical debt. Record the impact and a recommended phase or trigger, but a Low does not normally block Phase closure by itself.

Multiple Low findings may be combined and escalated only when together they form one deterministic, real and reproducible systemic risk.

## 3. Direct database pollution

An abnormal state created only by manually bypassing the application is not normally a Medium finding. It may qualify when a normal application path can create it, a low-complexity database constraint should prevent it, or it leads to authorization, privacy, incorrect publication or data-corruption impact.

## 4. External Validation

The following belong to External Validation when the selected real environment or provider is outside the authorized review:

- PostgreSQL row locking, deadlocks, isolation and query plans;
- R2/S3 `HEAD`, delete, post-write exception and consistency behavior;
- SMTP provider deduplication;
- behavior of rate limiting across multiple application instances;
- Production deployment, cache, DNS and real traffic;
- formal Product data and authorized media.

Local contract tests and code reasoning remain useful, but local theory must neither be presented as provider proof nor block acceptance indefinitely.

## 5. Reviewer conduct

Reviewers must:

- consolidate findings by root cause rather than split one defect to increase count;
- avoid re-reporting an issue that cannot be reproduced at the current HEAD;
- verify that a correction addresses the root cause instead of adding another layer;
- identify old/new dual paths, unused state and removable legacy logic;
- evaluate operator and maintenance cost;
- compare correction benefit with complexity cost;
- preserve security, privacy, authorization, data and publication invariants while assessing simplification.

## 6. Review scope

Prioritize the current Git diff, direct upstream and downstream behavior, affected critical invariants, and necessary regression checks. Do not expand indefinitely into unrelated accepted modules unless evidence indicates security, privacy, data loss, accidental publication or authorization risk.

## 7. Exit conditions

End the local acceptance loop when:

- Blocker is zero;
- High is zero;
- no Medium meeting this policy remains blocking;
- proportionate full quality gates pass;
- External Validation items are explicit;
- remaining Low items are recorded;
- no material complexity regression remains.

Do not extend a Phase indefinitely only to discover more Low findings or theoretical provider boundaries.

## 8. Balance

This policy does not make review permissive. Deterministic security, privacy, authorization, data and public-state defects retain their appropriate severity. Low findings remain tracked, and External Validation must actually occur before the corresponding production claim is made.
