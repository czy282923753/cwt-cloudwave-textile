# Engineering governance

This document governs CWT development, maintenance, bug-fix and refactoring work. Reviewers also use it to identify unnecessary complexity. It complements the frozen CWT V1.1 baseline and root `AGENTS.md`; it does not replace product or domain specifications.

## 1. Engineering goals

CWT is an enterprise B2B SEO acquisition platform. Engineering decisions balance:

- functional correctness;
- security and privacy;
- data correctness;
- stable SEO behavior;
- operator usability;
- proportionate performance;
- clear code and ownership boundaries;
- long-term maintainability;
- delivery efficiency and business value.

The number of states, tables, workers, tests or lines of code is not a quality metric by itself.

## 2. Deep reasoning, proportional implementation

> Think deeply, implement proportionally.

High reasoning effort is used to understand call chains, find root causes, compare solutions, and identify real security, data and concurrency risk. It is not permission to expand scope automatically, add a mechanism for every theoretical failure, turn low-risk maintenance into a distributed coordination system, wrap an incorrect design in more layers, or treat mechanism count as evidence of completion.

## 3. Root Cause First

Before a complex change, identify:

- the immediate and root causes;
- the misplaced responsibility;
- the transaction, exception and state boundaries;
- the single source of truth;
- old logic that should be deleted, moved, merged or replaced.

A symptom-level patch is acceptable only when it is the narrowest complete correction and does not preserve a known conflicting path.

## 4. Simplification First

Use this default order:

1. Delete incorrect logic.
2. Move logic to the correct boundary.
3. Narrow `try/catch`, transaction and service responsibilities.
4. Merge duplicate implementations.
5. Reduce states and branches.
6. Reuse an existing mechanism.
7. Add a mechanism only when the earlier options cannot satisfy the invariant.

Simplification must never weaken authorization, privacy, security or data correctness.

## 5. Replace, Not Layer

Do not preserve long-term:

- parallel old and new entry points;
- dual-written states;
- multiple authoritative recovery paths;
- obsolete compensation branches;
- unreachable code;
- duplicate validation;
- multiple sources of truth;
- a new wrapper around a known-invalid old implementation.

A new mechanism must replace, converge or explicitly retire the old one. Any temporary compatibility path needs an owner, removal condition and bounded lifetime.

## 6. Proportional Quality

### Highest assurance

Use the strongest applicable design and verification for:

- authentication and authorization;
- privacy and customer attachments;
- data loss or incorrect mutation;
- accidental public exposure;
- Migrations;
- Product public eligibility;
- disagreement between a user-visible result and durable state.

### High assurance

Use comprehensive, risk-focused verification for:

- SEO URLs, Canonical and Sitemap behavior;
- Product and Content publishing;
- core CRM state;
- file size, type and scan enforcement;
- core admin operating flows.

### Practical assurance

Keep these understandable and recoverable without defaulting to complex coordination:

- non-critical caches;
- post-commit maintenance notifications;
- delayed temporary-file cleanup;
- non-critical operator hints;
- internal maintenance failures that already have durable retry or a reasonable operator recovery path.

### External Validation

Local proof does not replace validation of:

- real PostgreSQL locking and isolation;
- R2/S3 provider semantics;
- SMTP provider behavior;
- multi-instance rate limiting;
- real deployment and traffic behavior.

Record these as External Validation Required when the needed environment is outside the authorized task.

## 7. Complexity Approval

A formal complexity explanation is required before adding persistent coordination or cross-process state, including a new table, state-machine lifecycle, Worker, Lease, Recovery type, queue, scheduled task, Outbox or parallel processing path. Ordinary fields, page components and simple CRUD do not trigger this gate.

The explanation must state:

- why the existing mechanism is insufficient;
- why deletion, relocation or consolidation cannot solve the issue;
- which old mechanism the new design replaces;
- which old code will be removed;
- the new states and failure modes;
- performance, operational and maintenance cost;
- why the benefit exceeds the complexity.

This is controlled permission, not an absolute ban. Security and data correctness remain the floor.

## 8. Complex Task Analysis Gate

Analyze before coding when work involves concurrency, cross-transaction behavior, Migrations, authorization, file security, multiple Domain Services, repeated same-level findings in one module, or proposed persistent coordination.

Copy changes, styling, local UI work, simple CRUD and clearly bounded small fixes use the fast path and do not require a separate analysis phase.

## 9. Business Invariants First

Tests should first prove that:

- user feedback matches durable state;
- authorization cannot be bypassed;
- private data is not exposed;
- failure does not create a false public state;
- success is not reported as failure;
- core workflows are retryable or recoverable where required;
- SEO and publishing eligibility are correct.

Do not make the principal assertion merely that a new table, state, worker or other mechanism exists.

## 10. Operational Simplicity

Admin workflows must keep steps concise, feedback accurate and retries safe. They must not encourage duplicate uploads or submissions, expose internal Lease, Recovery or Manifest concepts, leave long operations without useful feedback, or make the durable result unclear after refresh.

## 11. Complexity Report

Reports for substantial development or remediation must include:

- the root cause and corrected responsibility boundary;
- deleted old logic and merged duplicate logic;
- any added table, state, Worker, Lease or Recovery type;
- the old mechanism replaced and whether a dual path remains;
- changes to branches and state transitions;
- whether total complexity fell, stayed level or increased;
- why any increase was necessary.

## 12. Stop and Reassess

When the same business invariant receives a Medium-or-higher finding in two consecutive rounds, stop adding patches. Reassess the state machine and source of truth, identify duplicate state, responsibility and failure paths, then choose either a genuinely narrow fix or a local convergence refactor.

The goal is lower state, branch and comprehension cost—not a broader rewrite.

## 13. Quality gates

Run the checks proportionate to the changed risk and fresh enough to support the completion claim. Never delete or skip a critical test to manufacture a pass, use `any` or suppression directives to hide type failures, lower TypeScript strictness, silence Lint failures, swallow exceptions, conceal a failed check, or report incomplete work as complete.

Documentation-only and similarly bounded tasks do not require unrelated Build, unit or browser suites when targeted structural checks provide the relevant evidence.

## 14. Balance

These rules do not prohibit new tables, states or Workers, require every task to have two phases, forbid fixing Low findings, or require every change to reduce line count. Complexity must match real risk; justified additions are allowed when they converge the design. Governance itself must remain proportionate.
