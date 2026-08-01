# ADR-0007: Historical Asset rescan and readiness gate

- Status: Accepted for Phase 1A Remediation Round 2
- Date: 2026-08-01

## Context

Migration 0006 introduced `scan_status` and correctly defaulted unknown historical files to `pending`, but it provided neither a file-backed rescan path nor a readiness check. An upgrade could therefore remove published images and private Inquiry access while `db:verify` still reported success. Marking historical rows `passed` would be unsafe because the database does not contain malware-scan evidence.

## Decision

Use a two-phase upgrade.

1. Migration 0007 is the schema/state phase. All non-deleted Assets present during the 0000–0005 upgrade become `rescan_status=required`, `scan_status=pending`, with old scan evidence cleared. Deleted Assets become `manual_review` with `historical_asset_deleted`. No historical row is inferred clean.
2. `assets:rescan-legacy` is the evidence phase. It reads the original object from its recorded Public, Private, or Import partition; validates size, declared MIME, magic bytes and image decoding; invokes the configured scanner; and records provider, reference, completion time, attempts, and outcome. Missing, rejected, invalid, and scanner-error objects stay nonpublic and enter the manual list with a non-PII reason.
3. `db:verify` is the readiness gate. It fails when a Published Product, Fabric Entry, or Content record references an unusable Asset, when a Published Product has no eligible image, or when an Inquiry attachment is not a Passed Private Inquiry Asset. Unreferenced manual-review items are reported but do not falsely make a published route usable.

## Recovery and operator flow

The rescan claim changes `required` to `processing` and increments the attempt count. Batch startup returns a `processing` claim older than 15 minutes to `required` with `historical_rescan_interrupted`, so worker crashes do not create permanent work. A failed attempt becomes `manual_review`; after repairing/restoring the source, an operator may run `pnpm assets:rescan-legacy --retry-manual {assetId}` for one explicit Asset. The job never manufactures a Passed state. Seed and fixture routines do not set scan evidence on migrated rows; the rescan job must run.

## Rollback and forward fix

Do not roll back by removing the new columns after application code begins enforcing them. Before production, restore the pre-upgrade backup if migration or storage mapping is wrong. After production, use a forward migration or corrected rescan mapping, retain the failure evidence, and re-run readiness. Public routes remain fail-closed throughout.

## Validation

The migration integration fixture includes Public, Private Inquiry, Import, missing, and deleted legacy Assets, a Published Product, and an Inquiry. It upgrades 0000–0005, executes byte-backed rescans, validates private access, and proves readiness fails for the remaining broken published linkage. Real PostgreSQL remains **External Validation Required**.
