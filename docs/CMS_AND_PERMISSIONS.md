# CMS and permissions

## Admin modules

Dashboard, Products, Taxonomy, Applications, Fabric Library, Assets, Contents, Authors, Company Facts, SEO Topics/Keyword Mapping, Inquiries, Contacts, lightweight Organizations, Users, Feature Flags, Settings, and Audit Logs.

## Refine boundary

Refine may supply navigation, lists, pagination, sorting, filters, standard detail views, and simple forms. It does not own server authorization, constraints, workflows, publishing/index gates, route transactions, imports, file scanning, relationship integrity, CRM states, public rendering, or future AI review.

Refine is retained only after a written Go/No-Go compatibility test. Failure leads to a custom admin UI without changing domain models.

## Fixed Phase 1A roles

- Admin
- Product Editor
- Content Editor
- Reviewer / Publisher
- Sales
- Analyst

Permissions are enforced server-side. Phase 1A does not include a custom role/permission editor.

## Sensitive actions

Only Admin or Reviewer/Publisher can publish and apply revisions. SEO/Index actions require `seo.manage` and remain subject to server-owned quality gates; Product Editor can manage Product SEO/Index but cannot bypass review, publication, real-product, or intent-ownership rules. Only Admin/Reviewer-Publisher can verify Company Facts or record source-declaration reviews. Sales manages only assigned Inquiries and their activities. Admin is the only role that can list master Contacts/Organizations or reassign an Inquiry. Private inquiry files are record-authorized, not merely role-hidden.

Product operations include Primary/Additional Taxonomy, Applications, Tags, ordered Assets and Hero, Features, FAQs, factual review statuses, display switches, SEO, Index, revisions, publication, archive, and transactional Slug/301 changes. Application, Fabric Library, Content, Company Fact, Author, Taxonomy, Feature Flag, and Audit modules expose the Phase 1A operations required by their frozen workflows; they are not list-only shells.

## Audit scope

Authentication, user state, publish/index, route/redirect, fact verification, source-declaration changes, private-file access, CRM assignment/status, deletion, feature flags, and system settings are audited without storing secrets or unnecessary PII.
