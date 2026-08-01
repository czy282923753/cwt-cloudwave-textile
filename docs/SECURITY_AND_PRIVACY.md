# Security and privacy baseline

## Data separation

Public assets, private inquiry files, and internal imports use isolated storage contexts and credentials/policies. Inquiry files have no permanent public URL and cannot automatically become public assets or AI knowledge.

## File controls

Server-side MIME and magic-byte checks, decode validation, random object keys, configurable file size/count limits, rate limits, malware-scan state, quarantine, signed private access, deletion jobs, and access audits apply independently of source declarations.

Production fails closed if scanning, storage policy, authentication, or another required security integration is unavailable.

## Source declaration

Source declaration is OFF by default and adds no upload confirmation. Its fields remain hidden and null until manually enabled per asset or batch. Automated hints are non-blocking and never infer rights or enable declarations. Populated declarations are retained when disabled and all declaration changes are audited.

## Privacy

- Do not commit or log secrets.
- Do not send PII to analytics.
- Do not use real customer data in tests.
- Retention limits are configurable and require project/legal confirmation before production.
- Private downloads use expiring authorization and least privilege.
- Non-production is noindex and isolated from production resources.

## Record authorization

- Admin can access every Inquiry and attachment.
- Sales queries are owner-scoped and may read/manage only records assigned to that user.
- Analyst receives aggregate/de-identified analytics only; no raw Inquiry PII or private file grants.
- Reviewer/Publisher, Product Editor, and Content Editor receive no CRM access through their publishing roles.
- Inquiry attachment authorization validates both the private Asset boundary and record ownership on every request.

## Authentication and analytics

Login uses hashed account/network rate-limit keys and audits success, failure, disabled-user attempts, logout, and session revocation without credentials, tokens, or unnecessary PII. Conversion Events use unique Event IDs, consent state, published-entity validation, per-event property allowlists, server receiving limits, and content-level PII detection. Denied consent is not stored.

## Operational controls

Use environment validation, secure headers, CSRF-aware write operations, output encoding, rate limits, audit trails, database backups, restore tests, error monitoring, and dependency/security update review.
