# Contributing

Read `AGENTS.md` and the frozen documents before changing code.

Use small checkpoint-oriented commits. Schema changes require a reviewed migration and fresh-database integration test. Public-route changes require SEO and redirect review. Business or architecture changes require an approved ADR before implementation.

Before completion, run build, lint, strict typecheck, and relevant automated tests. Never commit secrets, production data, customer files, or unverified business facts.
