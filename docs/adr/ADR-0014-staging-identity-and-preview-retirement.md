# ADR-0014: Staging Identity and Preview Retirement

Status: **Accepted by the project owner for Phase 1B Stage 0 on 2026-08-05. Implementation is not authorized by this ADR.**

## Context

Phase 1A runtime and database vocabulary includes `preview`. The approved Phase 1B topology defines a formal protected `staging` environment with its own database/user, media roots, Secrets, Admins, SMTP app password, noindex policy, recipient override, analytics policy, logs, and hostname.

Treating Preview and Staging as long-lived aliases would make environment safety rules ambiguous. A deployment could satisfy one name while bypassing checks attached to the other, especially cookie security, email override, analytics, media/database isolation, and monitoring labels.

## Decision

`staging` replaces `preview` as the sole non-Production deployment identity. After the approved cutover:

- runtime/environment schemas accept `development`, `test`, `staging`, and `production` as applicable;
- `preview` is rejected as runtime configuration;
- the hostname is `staging.cwtextile.com`;
- Staging is access-protected, globally noindex, excluded from formal analytics, and normally started on demand;
- all To/CC/BCC recipients are replaced server-side with `test@cwtextile.com`;
- Staging uses its own database/user, media roots, Secrets, Admins, SMTP app password, AI environment label, analytics configuration, and logs;
- Staging has no Production database, media, backup, or Secret access.

There is no permanent two-name compatibility alias. A one-time forward transition may rename persisted `preview` enum/config values to `staging`; the database catalog may not remain a second writable semantic authority.

## Alternatives

1. **Keep `preview` and use it to mean Staging.** Rejected because it contradicts the owner-approved name and leaves operational/security documentation ambiguous.
2. **Accept both forever.** Rejected because safety policy could drift by name and tests would need duplicate branches.
3. **Add `staging` while leaving persisted `preview` records untouched indefinitely.** Rejected as long-lived dual semantics.
4. **Drop and recreate all environment records.** Unnecessary and risks losing Audit/history; a forward rename/controlled data transition is sufficient.

## Schema / Migration impact

No Migration is generated or executed in Stage 0.

The reviewed `0018` forward Migration is expected to rename the PostgreSQL environment enum value from `preview` to `staging` when that enum remains part of the accepted Schema. Before implementation, the Migration review must inventory persisted values and all Check Constraints/defaults/functions/snapshots that reference the label. Historical Migrations/Snapshots/Journal `0000`–`0017` are not edited.

If real PostgreSQL compatibility evidence shows a rename cannot safely satisfy the deployment sequence, a bounded expand/migrate/contract plan may be proposed, but it must end with one accepted runtime value and no writable `preview` alias. That change requires review before execution.

## URL / SEO impact

Public Production URLs are unchanged. The protected non-Production hostname is `staging.cwtextile.com`.

Every Staging HTML response is noindex; Staging robots prevents crawling; Staging routes do not enter the Production Sitemap or Canonical authority. Canonical output must not accidentally designate Staging as the public origin. Preview aliases or redirectable public Preview hostnames are not created.

## Security / privacy impact

- Staging access requires Cloudflare Access or equivalent protection.
- Secure cookie behavior applies to Staging and Production as reviewed; cookie names/keys prevent cross-environment reuse.
- Recipient override is a server envelope policy and cannot be bypassed by a template, job payload, UI, CC, or BCC.
- Formal analytics and Production customer data are prohibited.
- Environment-specific Secrets/roots/accounts are validated as nonidentical/nonoverlapping where safely testable.
- Logs, Sentry environment tags, backups, and alerts identify Staging unambiguously without exposing Secrets.

## Compatibility

Production semantics are unchanged. Staging is normally stopped, so the recommended cutover uses a bounded maintenance/deployment sequence rather than permanent application dual-read/dual-write behavior.

Old binaries that know only `preview` are not a valid rollback target after new `staging` writes begin. The rollback image must understand the accepted `staging` label, or rollback must restore the pre-transition database/config backup while Staging remains stopped.

## Rollout

1. Inventory all source/config/database references to `preview` and freeze Staging writes.
2. Add tests for `staging` noindex, cookies, email override, analytics disablement, secrets/media/database isolation, and rejection of `preview`.
3. Review `0018` Fresh and `0017→0018` Upgrade behavior under ADR-0010.
4. Apply the authorized forward transition while Staging Web/Worker are stopped.
5. Deploy one `staging`-aware image and run isolated readiness/recipient/noindex tests.
6. Remove temporary compatibility input, if any, at the approved bounded cutover; do not carry it into ordinary operations.

No Migration or environment configuration is authorized by this ADR alone.

## Rollback

Before database transition, revert documentation/config plans only. During the authorized transition, retain a checksum-verified pre-Migration backup and prior environment config.

If validation fails before any new Staging business write, stop Staging and restore the pre-transition database/config. If new writes occurred, use a reviewed `staging`-aware rollback image rather than reintroducing dual names or rewriting history ad hoc.

## Rejected duplicate-authority designs

- Separate Preview and Staging environments with overlapping purposes.
- Permanent `preview=staging` aliases in runtime schemas.
- Distinct noindex/email/analytics code paths selected by different aliases.
- A second environment table or deployment registry only to translate names.
- UI-only recipient/noindex enforcement without server startup and delivery boundaries.
