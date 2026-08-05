# CWT Product Import Template V1

Status: **Approved contract for Phase 1B Stage 3; implementation not started**

Owner decision: [Phase 1B Stage 0 owner decisions](./PHASE_1B_OWNER_DECISIONS.md#7-product-import-template-v1-limits-and-modes)

Architecture decision: [ADR-0016 — Product Import durable authority](./adr/ADR-0016-product-import-durable-authority.md)

## 1. Scope and authority

Template V1 defines first-time Product creation and separately authorized bulk Draft updates from one Excel workbook plus optional image ZIP/folder input. It is not a general spreadsheet execution engine, synchronization system, page publisher, or Asset uploader.

The Product Import Batch owns row interpretation, status, errors, and idempotent apply evidence. Existing Product, Taxonomy, Application, Tag, Route, Editorial Revision, Asset relation, Upload Intent/Batch, scan, Finalize, Manifest, Recovery, and Cleanup services remain business authorities.

Every import uses Synthetic/Test data until formal Product/media import is separately authorized.

## 2. Template identity

- Workbook contract name: `CWT Product Import Template V1`.
- The workbook carries an exact template version of `1`; missing, unknown, or future versions fail closed before row apply.
- One batch contains one workbook and zero or one image package/folder selection.
- Create and Update are separate immutable batch modes selected before validation. A workbook cannot mix modes.
- Formula/macro execution is prohibited. Values are read as bounded cell data only.

## 3. Approved columns

Header names are exact, case-sensitive Template V1 identifiers. Unknown columns are reported and rejected unless a later template version explicitly adds them.

| Column | Type | Create | Update | Rule |
| --- | --- | --- | --- | --- |
| `Name` | text | Required | Optional | English Product name; blank Update means no change, not deletion. |
| `Product Code` | text | Optional | Required | Existing code or `CWT-[TYPE]-NNN`; Update exact-match authority. |
| `Primary Category` | managed name or approved ID | Required | Optional | Exactly one; may resolve only an authorized managed Category. |
| `Additional Categories` | semicolon-separated managed names/IDs | Optional | Optional | Must not duplicate Primary; no free-text Product Type. |
| `Applications` | semicolon-separated managed names/IDs | Optional | Optional | Managed Application records only. |
| `Tags` | semicolon-separated text | Optional | Optional | Normalized free-text Tags; no automatic public pages. |
| `Composition` | text | Optional | Optional | Canonical factual string; ratios are never inferred or changed. |
| `GSM` | positive number | Optional | Optional | Number only; display unit is `g/m²`. |
| `Width` | positive number | Optional | Optional | Number only; display unit is `cm`. |
| `MOQ Value` | positive number | Optional | Optional | Requires `MOQ Unit` when present. |
| `MOQ Unit` | enum | Optional | Optional | One of `m`, `kg`, `roll`, `yd`; requires value when present. |
| `MOQ Note` | text | Optional | Optional | Note only; never automatically split into facts. |
| `Slug` | text | Optional | Optional | Governed Slug candidate; unresolved collision blocks the row. |
| `Summary` | text | Optional | Optional | Draft editorial copy, never a factual-field override. |
| `Description` | text | Optional | Optional | Draft editorial copy converted to approved Blocks by the governed editor contract. |
| `Image Files` | semicolon-separated relative filenames | Optional | Optional | Explicit matching tier; paths must exist safely inside the supplied package. |
| `Primary Image Alt` | text | Optional | Optional | Placement candidate for the matched Primary image; human review required. |
| `Primary Image Caption` | text | Optional | Optional | Placement candidate; sanitized and revision-controlled. |

An empty optional cell means “not supplied.” In Create it remains unknown/empty. In Update it means “leave unchanged,” not “clear.” Clearing an existing value requires an explicit future Template version or an interactive governed command; V1 does not overload blank cells as destructive instructions.

Category/Application quick creation is not implicit during batch apply. If the approved Stage 3 UI permits it, an authorized operator must explicitly resolve/create the managed record before applying affected rows; the importer never silently creates taxonomy from misspelled cells.

## 4. Create mode

A Create row requires all of:

1. non-empty `Name`;
2. exactly one resolved `Primary Category`;
3. at least one eligible, scanned, deterministically matched image after Finalize.

`Product Code` behavior:

- an approved existing external/internal code is retained if unique and valid;
- otherwise the service may generate `CWT-[TYPE]-NNN` only when the resolved Primary Category has a managed 3–8 uppercase-letter prefix;
- a missing category prefix produces a Row Error and no automatic code;
- a duplicate Product Code blocks only that row;
- a generated or supplied code is never reused after Product discontinuation.

Each successful row creates a Draft/noindex Product through the existing Product Domain Service. It cannot call Publish, enable Index, or bypass real-Product and factual-review gates.

## 5. Update mode

- `Product Code` is required and must match one complete normalized existing Product Code exactly.
- Name, Slug, Category, specifications, filename, image hash/similarity, and partial codes are not update identity.
- Zero matches is a Row Error. More than one match is a fail-closed integrity error even though the existing unique constraint should prevent it.
- A Published Product update creates a pending Editorial Revision; public reads remain on the approved revision.
- Product Code itself is not ordinarily changed by Update. The dedicated Admin correction command and required reason/Audit remain separate.
- Slug change uses the existing governed Route/Redirect transaction; collision, loop, chain, or missing destination blocks the row.
- V1 never deletes a Product, Asset, relationship, or factual value implicitly.

## 6. Image naming, matching, and roles

Matching priority is exact and stops at the first unambiguous tier:

1. folder name exactly equals the complete Product Code;
2. `Image Files` explicitly lists the relative filename;
3. filename begins with the complete Product Code;
4. otherwise the file is placed in `Unmatched Images`.

Fuzzy matching, substring guessing, name/specification similarity, random association, and automatic cross-row reassignment are prohibited.

Approved filename-role examples:

```text
CWT-MESH-001/
├─ CWT-MESH-001-01.jpg
├─ CWT-MESH-001-02.jpg
├─ CWT-MESH-001-03.jpg
├─ CWT-MESH-001-detail-01.jpg
└─ CWT-MESH-001-application-01.jpg
```

Role rules:

- `-01` or `-main`: Primary;
- later ordered numeric images such as `-02`, `-03`: Gallery;
- `-detail-NN`: Detail;
- `-application-NN`: Application;
- if no explicit suffix supplies Primary, the first deterministically ordered eligible image is proposed as Primary;
- ambiguous duplicate Primary candidates are a Row Error until an operator resolves them.

All files must use the existing Upload/scan/Finalize/Manifest pipeline before an Asset or Product relation is eligible. Filename/extension never overrides streamed bytes, signature, image decode, malware, rights, or storage-context checks.

## 7. Capacity limits

| Limit | Maximum |
| --- | ---: |
| Product rows per batch | 100 |
| Excel actual bytes | 10 MB |
| Images per batch | 500 |
| One image actual streamed bytes | 20 MB |
| Compressed archive actual bytes | 500 MB |
| Total expanded archive actual bytes | 2 GB |

Limits are measured server-side from actual bytes. Declared length, compressed metadata, browser MIME, extension, and archive directory entries are not authority. A batch exceeding a package-level limit is rejected before business apply; an oversized individual image becomes a safe file/row error as defined by the reviewed Stage 3 transaction design.

## 8. Validation and duplicate policy

Blocking row errors include:

- missing Create minimum data;
- invalid/duplicate Product Code;
- missing Category prefix when generation is required;
- unresolved Primary Category/Application identifier;
- invalid Composition/GSM/Width/MOQ value or unit;
- unsafe or missing explicit image path;
- no eligible matched image for Create;
- ambiguous Product/image match or multiple Primary images;
- unresolved Slug collision;
- rights/scan/decode/Finalize failure.

Nonblocking warnings include bounded, explainable signals for:

- highly similar name;
- similar Category/Composition/GSM/Width combination;
- duplicate Asset SHA-256 or visually similar image when an approved deterministic comparison exists;
- near-identical specifications.

Warnings never auto-merge, overwrite, delete, publish, or relate Products/Assets.

## 9. Partial success and Row Errors

- Each valid row applies in its own governed transaction with required Audit.
- Failure of one row does not roll back unrelated successful rows.
- Required Audit failure rolls back that row and reports failure; it never reports false success.
- Batch counts are derived from durable item states and remain explainable after restart.
- A Row Error includes batch/item identity, Excel row number, column where applicable, stable error code, safe operator message, retryability, and timestamp.
- Errors never include credentials, raw Object Keys, absolute host paths, private URLs, customer data, stack traces, or full unsafe archive paths.
- Successful rows retain target Product/Asset IDs as internal evidence and are not replayed by a retry of failed items.

## 10. Retry idempotency and recovery

- A durable batch fingerprint covers Template version, mode, normalized workbook identity, and approved image-package manifest identity.
- Each row/file has a stable source key and stores its applied target IDs/outcome.
- Retrying the same Batch/item after timeout, response loss, Worker restart, or process crash does not duplicate Product, Product Code, Asset, Finalize result, image variant, or Product-Asset relation.
- Only rejected/retryable items may be retried. Completed items return their durable result.
- Create and Update batch identities cannot be interchanged.
- Existing Upload Recovery and Cleanup remain responsible for pre-put, partial-finalize, abandoned, and orphaned object convergence.
- AI is an optional post-commit handoff. AI failure or retry cannot reverse or duplicate the imported Draft and images.

## 11. Archive and folder safety

The ingestion boundary rejects:

- absolute paths, drive letters, `..` traversal, path normalization escape, NUL/control characters, and duplicate normalized paths;
- symbolic links, hard links, device nodes, named pipes, sockets, executable/script payloads, and unsupported archive entry types;
- encrypted/password-protected archives;
- nested archives unless a future version explicitly permits and bounds them;
- decompression bombs, false expanded-size metadata, excessive entry count, excessive path depth/length, or limits exceeded while streaming;
- unsupported file signatures, MIME/signature mismatch, undecodable images, and malware-positive files;
- case-collision or Unicode-normalization-collision filenames that make matching ambiguous.

Extraction occurs only inside the isolated Import context. Archive paths never become public routes or raw storage contracts. Temporary/extracted data is covered by existing recovery/cleanup rules and excluded from long-term backup unless it has become an approved original Asset.

## 12. Publish, Index, and formal-data boundary

- Import creates Drafts or pending Revisions only.
- It has no Publish, Index, route-approval, rights-approval, or factual-review capability.
- New Categories/Applications do not automatically receive public routes or Index.
- AI output remains Draft and cannot make an imported Product real, verified, Published, or indexable.
- Synthetic/Test batches are conspicuously synthetic and noindex.
- Formal import remains blocked as **Waiting for Real Product Data Validation** until separately authorized Product facts and media rights pass acceptance.

## 13. Acceptance summary

Stage 3 cannot exit until unit, integration, real PostgreSQL, archive threat, partial-success, duplicate/retry, image matching, Upload/Finalize, Revision, permission/privacy, mobile/accessibility, and no-Publish/noindex tests in [Phase 1B Acceptance Matrix](./PHASE_1B_ACCEPTANCE_MATRIX.md) pass.
