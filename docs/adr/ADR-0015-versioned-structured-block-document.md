# ADR-0015: Versioned Structured Block Document

Status: **Accepted by the project owner for Phase 1B Stage 0 on 2026-08-05. Implementation is not authorized by this ADR.**

## Context

Phase 1A stores Product and article narrative in legacy text/list fields and protects published changes with the existing Editorial Revision authority. Phase 1B requires one safe Product/article Block Editor with ordered typed Blocks, Preview, autosave, Undo/Redo, related entities, media placement, AI Block Diff/accept/reject/lock, and compatibility across future document versions.

Layering a Block editor on top of continuing legacy writers would create two content authorities. Storing arbitrary HTML or one database row per Block would add security, compatibility, and coordination costs without improving the approved modular-monolith boundary.

## Decision

Product and Content localizations own one bounded, versioned structured Block document. The document is validated by one shared allowlisted schema/registry and rendered by controlled server/application components.

Version 1 supports only the frozen Block set: Heading, Paragraph, Image, Gallery, Specification Table, Comparison Table, Feature List, Bullet List, Callout, Quote, FAQ, Related Products, Related Articles, CTA, and Divider. Entity contexts may narrow this set but cannot introduce unknown components.

The Block document is the sole narrative writer after cutover. Existing Editorial Revisions remain the Draft/review/apply/public-live authority; the Block system does not create another Revision table or publish mechanism. Factual Product fields remain relational authorities and are referenced or rendered without being duplicated as AI-editable Block facts.

Legacy conversion is deterministic:

- each non-empty approved legacy text value converts to a version-1 Paragraph Block in defined source order;
- empty legacy text converts to an empty document;
- no heading, fact, link, image, formatting, or copy is inferred;
- conversion is idempotent and render parity is tested.

At the controlled writer cutover, legacy fields become read-only evidence. They are not dual-written. They remain until Production launch, successful full restore drill, and 30 consecutive stable Production days; deletion requires a separately authorized forward Migration.

## Alternatives

1. **Keep plain text and add editor-only formatting metadata.** Cannot safely support the approved Block set, AI Diff/locks, or versioned compatibility.
2. **Store Raw HTML.** Rejected because it permits unsafe markup/styles/scripts and has weak structural compatibility.
3. **One row per Block.** Adds high-churn ordering/locking tables and transaction complexity disproportionate to bounded editorial documents.
4. **Separate Product and article Block formats.** Creates duplicate schema/renderer/editor authorities and divergent compatibility behavior.
5. **Dual-write legacy text and Blocks indefinitely.** Creates two conflicting writers and makes rollback/public rendering ambiguous.

## Schema / Migration impact

The reviewed `0018` forward Migration is expected to add nullable structured document JSON, document schema version, and an optimistic editor version/token to the existing Product and Content localization owners. It may add approved placement metadata to existing media relations as planned, but no Block-per-row table or second Revision table.

The Migration performs or enables a deterministic legacy backfill under a reviewed cutover procedure. It does not delete legacy fields. Historical Migrations/Snapshots/Journal `0000`–`0017` are immutable. Removal after the exit conditions requires a later separately approved forward Migration.

No Migration is generated or executed by Stage 0.

## URL / SEO impact

Product/Content paths, route ownership, Canonical, Redirect, Sitemap, and Index controls remain unchanged. The server renderer must preserve visible legacy text and semantic order through backfill.

Heading hierarchy, internal links, related entities, metadata source, and public Asset references are validated. Unknown document versions fail closed rather than producing partial/spam content. Draft Preview is authenticated/noindex and never enters the Sitemap.

## Security / privacy impact

- Raw HTML, JavaScript, event handlers, arbitrary CSS/fonts/colors, remote includes, and unknown Blocks are rejected.
- Text and URLs are validated/escaped; internal entity references resolve through governed Routes and public eligibility.
- Image/Gallery Blocks reference existing Asset relationships/IDs and recheck scan, rights, processing, deletion, revision, and public eligibility.
- Private Inquiry/Import Assets cannot be referenced publicly or selected through the editorial boundary.
- Autosave, Preview, Revision apply, and Block relation changes recheck record permission and required Audit policy.
- AI proposals cannot edit relational facts, locked Blocks, Publish, Index, or routes.

## Compatibility

The document carries an explicit integer schema version. Readers support only reviewed versions and fail closed on unknown future versions. Compatibility transforms are deterministic, one-way inputs to the current writer, and separately tested.

There is one writer at a time. The cutover uses a bounded editorial-write maintenance window or equivalent transactionally safe sequence: final legacy state is captured/backfilled, the structured writer becomes authoritative, and legacy write paths are disabled. No ongoing dual-write reconciliation is permitted.

After new structured writes begin, rollback requires a prior Stage 1-compatible image that reads the accepted document version. A Phase 1A binary that reads only stale legacy fields is not a safe ordinary rollback target.

## Rollout

1. Freeze the exact V1 Block schemas, size/depth/reference limits, and renderer snapshots.
2. Add `0018` fields and deterministic backfill with Fresh/Upgrade/repeat and render-parity tests.
3. Validate public server rendering before enabling structured writes.
4. During the approved cutover, pause editorial writes, capture/backfill final legacy values, switch to one structured writer, and statically remove/disable legacy write calls.
5. Enable Preview/editor/autosave/Undo/Redo and later AI integration against the same document authority.
6. Retain legacy fields read-only through launch, restore rehearsal, and 30 stable days.
7. Propose a separate forward field-removal Migration only after owner authorization.

## Rollback

Before writer cutover, disable the feature and retain legacy authority. If Migration/backfill parity fails, restore the pre-Migration backup or correct a new forward Migration before enabling writes; never edit `0018` after acceptance.

After structured writes begin, stop editorial mutation and deploy the previous compatible structured-document image. If no compatible image exists, restore the controlled pre-cutover backup rather than treating stale legacy fields as current. Public approved Revisions remain authoritative throughout.

## Rejected duplicate-authority designs

- A second Revision/history table for Blocks.
- Separate Product and article Block stores/renderers.
- Block rows plus a JSON document as equal writers.
- Long-term dual write to legacy and structured fields.
- An AI-only document format that later converts to editorial Blocks.
- Raw HTML or arbitrary component/style escape hatches.
- Client autosave as authoritative state without Domain Service/version conflict checks.
