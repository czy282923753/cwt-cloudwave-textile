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

Only Admin or Reviewer/Publisher can publish, set Index, manage cross-page canonical values, verify Company Facts, or approve redirects. Sales manages assigned inquiries and customer activities. Private inquiry files are restricted to authorized CRM roles.

## Audit scope

Authentication, user state, publish/index, route/redirect, fact verification, source-declaration changes, private-file access, CRM assignment/status, deletion, feature flags, and system settings are audited without storing secrets or unnecessary PII.
