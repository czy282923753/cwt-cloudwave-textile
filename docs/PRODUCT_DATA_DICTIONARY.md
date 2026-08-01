# Product data dictionary — frozen V1.1

| Field | Draft rule | Public rule | AI rule |
|---|---|---|---|
| Product Name | Required | Shown | Draft suggestion allowed |
| Primary Category | Required | Breadcrumb/default grouping | Recommendation only |
| Product Image | At least one required | Shown when public-safe | No generated fabric image |
| Slug | System generated | URL | Suggestion only; no silent published change |
| Product Code | Optional, unique when present | Hidden | Never infer |
| Supplier Type | Optional | Hidden | Never infer |
| Short/Full Description | Optional | Show when approved and non-empty | Draft allowed |
| Composition | Optional fact | Show only when verified | Never infer |
| Weight | Optional fact with raw/range/unit | Show only when verified | Never infer |
| Width | Optional fact with raw/range/unit | Show only when verified | Never infer |
| Fabric Style | Optional fact | Template-controlled | Never infer |
| Color Options | Optional fact | Product-level display override | Never infer facts |
| MOQ Note | Optional | Hidden by default | Never infer |
| Custom Available | Unknown/Yes/No | Product-level display override | Never infer |
| Sample Available | Unknown/Yes/No | Product-level display override | Never infer |
| Features | Optional ordered items | Show after review | Draft allowed |
| Tags | Optional | Internal | Suggestion allowed |
| Applications | Optional relation | Show after review | Recommendation only |
| FAQ | Optional ordered items | Show after review | Draft allowed |
| SEO Title/Description | Optional before review | Metadata | Draft allowed |
| Focus Keyword | Optional internal field | Hidden | Suggestion allowed |
| Publish Status | System/editorial workflow | Controls visibility | AI cannot change |
| Index Status | Separate Index/Noindex | Controls discovery | AI cannot change |
| Canonical | Defaults to self | Metadata | Suggestion only |

## Verification

Factual values use Empty, Provided, Verified, or Rejected review states. Only authorized humans can set Verified. Empty values render no empty heading, table, block, or placeholder.

## Display overrides

Optional public fields use Inherit, Show, or Hide. Product Code, Supplier Type, internal tags/notes, and fixed price remain internal in Phase 1A.

## Related asset fields

Product images reference Asset records; they do not duplicate files or rights metadata. `Enable Source Declaration` is OFF for a new ordinary upload, so all source, rights, relationship, permission, reviewer, expiry, and facility-ownership fields begin as null and are hidden. Enabling the declaration exposes optional fields. Disabling it later preserves previously recorded values and Audit Log history. This behavior never changes the Product draft requirement or the independent upload security pipeline.
