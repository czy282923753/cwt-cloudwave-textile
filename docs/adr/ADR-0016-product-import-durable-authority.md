# ADR-0016: Product Import Durable Authority

Status: **Accepted by the project owner for Phase 1B Stage 0 on 2026-08-05. Implementation is not authorized by this ADR.**

## Context

Phase 1B Product import must accept a bounded Excel workbook and image ZIP/folder, validate rows/files, match images deterministically by Product Code, report partial success and Row Errors, separate Create from Update, recover from interruption, and retry without duplicating Products or images.

Phase 1A already has durable Upload Intent/Batch, scan, Asset Finalize, Manifest, Recovery, Cleanup, Product/Taxonomy/Application/Tag services, Product-Asset relations, Editorial Revisions, Route/Redirect safeguards, and required Audit. Asset Upload Batch owns byte ingestion, but it cannot truthfully represent Excel row interpretation, partial Product apply results, or create/update identity.

## Decision

Introduce one Product Import durable authority consisting of:

- `product_import_batches`: one immutable template version, Create/Update mode, source fingerprint, actor, lifecycle, safe summary, and timestamps;
- `product_import_items`: row/file source identity, normalized allowlisted data, validation/warning/error evidence, proposed media role/order, apply attempt, and resulting Product/Asset IDs.

The Product Import authority owns parsing and orchestration evidence only. It calls existing Domain Services for every business mutation.

Import package bytes **must reuse the existing Upload Intent/Batch, streamed-byte validation, signature/decode, malware scan, Asset Finalize, Manifest, Recovery, and Cleanup mechanisms in the isolated Import context**. Product media uses the existing Asset and Product-Asset relationship authorities. Published Product changes use the existing Editorial Revision. Routes/redirects use the existing governed transaction.

Create and Update are separate immutable batch modes. Update identity is the complete normalized Product Code only. Partial success uses item-level governed transactions; batch summary is derived from durable item results. Same-batch/item retry returns or advances the existing result and never duplicates a Product, Product Code, Asset, Finalize result, or Product-Asset relation.

The complete field and safety contract is [Product Import Template V1](../PRODUCT_IMPORT_TEMPLATE_V1.md).

## Alternatives

1. **Use Asset Upload Batch as the Product import batch.** Rejected because byte lifecycle cannot represent row validation, Product apply, Create/Update mode, or row-level retry truthfully.
2. **Keep import state only in browser memory.** Cannot recover after response loss, Worker/process restart, or long validation/finalize operations.
3. **Create one generic workflow/task platform.** Disproportionate and a second coordination mechanism for a bounded domain saga.
4. **Make the whole workbook one transaction.** Violates required partial success and makes one bad row roll back valid independent Products.
5. **Let Excel/filename directly write Product/Asset tables.** Bypasses authorization, invariants, Revision, Audit, scan, and route protection.

## Schema / Migration impact

The reviewed `0019` forward Migration is expected to create exactly the two Product Import tables, restrictive foreign keys, idempotency/source uniqueness, item/batch indexes, and bounded status Check Constraints. It may extend existing Upload metadata only where necessary to bind an Import package to its owning Product Import Batch; it does not create another Upload Batch or Finalize table.

Existing data is not backfilled or guessed as historical imports. Historical Migrations/Snapshots/Journal `0000`–`0017` are immutable. No Migration is generated or executed in Stage 0.

## URL / SEO impact

Import routes are authenticated Admin surfaces and noindex. Successful Create rows produce Draft/noindex Products only. Update of a Published Product creates a pending Revision and has no public effect until authorized apply.

Product Code collision and unresolved Slug/Route collision block the item. A Slug change uses existing audited 301 behavior in the same approved transaction; import never silently overwrites a Route or creates redirect chains.

Import/package paths and filenames never become public URLs. Public media continues to use controlled Asset-ID delivery.

## Security / privacy impact

- Import permission, actor/session binding, Domain Service authorization, and required Audit are mandatory.
- Files stay in the Import storage context until existing scan/Finalize and an authorized relationship complete.
- ZIP traversal, links, devices, encrypted/nested archives, decompression bombs, entry/path limits, MIME/signature/decode, malware, and actual byte limits fail closed.
- Private Inquiry files cannot be selected, copied, matched, or promoted through Product Import.
- Row errors/logs omit credentials, absolute paths, Object Keys, private URLs, stack traces, and customer data.
- Create/Update, retry, takeover, cancel, and error-export actions are authorization-checked and observable.
- Import has no Publish, Index, rights-approval, factual-review, or AI factual-field capability.

## Compatibility

The importer is additive and defaults off. Existing Product/Asset records do not require backfill. Applied rows become ordinary governed Drafts/Assets/Revisions; their business identity does not depend on keeping the feature enabled.

The existing unique Product Code, Asset SHA-256/provider identity, Upload/Finalize idempotency, Product-Asset primary key, Route constraints, and Audit transaction remain final safeguards. Product Import source keys add orchestration idempotency without replacing those authorities.

The unused direct `uploadAsset(...purpose=import)` path must be converged into or removed in favor of the durable existing Admin Upload Saga; it cannot remain a second Import finalize path.

## Rollout

1. Freeze Template V1 and batch/item state/identity semantics.
2. Review `0019` with Fresh/Upgrade/repeat, constraints, indexes, contention, and interruption cases.
3. Implement the parser/matcher as bounded pure validation before business apply.
4. Bind package bytes to existing Import Upload/Finalize/Recovery/cleanup.
5. Enable Create with Synthetic data and prove partial success/idempotent retry.
6. Enable Update separately and prove exact Product Code identity and Published Revision behavior.
7. Run archive threats, crash points, response loss, concurrent retry, mobile/accessibility, privacy, and no-public-change acceptance.
8. Formal Product/media import remains a separately authorized Stage 8 action.

## Rollback

Feature flags default off. Before apply, a failed/incomplete Batch can be disabled and its bytes handled by existing recovery/cleanup. After successful rows apply, Products/Assets/Revisions remain normal records and are not deleted by rollback.

Rollback deploys a previous Schema-compatible image and stops new Import claims. Durable batch/item evidence remains for diagnosis. No rollback replays completed items, deletes Products automatically, or edits accepted Migrations.

## Rejected duplicate-authority designs

- A second Asset/Import file table that owns the same bytes as Upload/Asset.
- A second Upload Intent, Finalize, Recovery, or Cleanup pipeline for ZIP imports.
- A generic task queue plus separate import batch lifecycle for the same work.
- A second Product/Taxonomy/Route write service used only by Excel.
- A second Product Revision or Publish pathway.
- Filename/image similarity as an automatic Product identity authority.
- Client-only successful-row memory as retry authority.
