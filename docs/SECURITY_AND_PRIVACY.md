# Security and privacy baseline

## Remediation Round 3 controls

- Public analytics consent is stored server-side under an HttpOnly anonymous Consent Session cookie with optimistic versioning. Unknown, Denied, and Revoked reject writes even if a stale client claims Granted.
- Public `conversion_events` has no Inquiry, Contact, or private Asset foreign key. CRM outcomes remain in Inquiry Status History and Customer Activities and are never mapped to an analytics provider payload.
- Binary uploads are read incrementally and aborted at the server-side actual-byte limit; Content-Length is only an early check and may be absent.
- Effective Rights Decision is enforced independently from the declaration UI switch. Not Allowed, Revoked, Expired, Pending Review, and disallowed Restricted use fail closed.

## Remediation Round 2 controls

- Analytics remains disabled for `unknown` and `denied`; only `granted` events are stored or sent. Consent UI supports allow, decline, withdraw and modify.
- Event replay must match the original event, and every attribution string is format/length/PII validated. Conversion Events have no Inquiry foreign key; clients and analytics receive only a random `CWT-…` reference. Public entity tracking submits a governed route path and resolves its internal ID only for server validation.
- Upload intent, MIME and rate controls run before binary parsing. If supplied, `Content-Length` must be within the configured maximum and match the Intent; a missing header is handled by the same streaming actual-byte hard limit. Trusted client IP headers require explicit Cloudflare or Vercel mode; arbitrary `x-forwarded-for` is ignored.
- Notification jobs use leases, finite exponential retry, Dead state and a unique Delivery Key. SMTP receives a deterministic Message-ID; provider duplicate suppression after send-success/database-failure remains external validation.

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

Login uses hashed account/network rate-limit keys and audits success, failure, disabled-user attempts, logout, and session revocation without credentials, tokens, or unnecessary PII. Conversion Events use unique Event IDs, server-persisted consent, published-entity validation, per-event property allowlists, server receiving limits, and content-level PII detection. Unknown, Denied and Revoked consent write no event.

## Operational controls

Use environment validation, secure headers, CSRF-aware write operations, output encoding, rate limits, audit trails, database backups, restore tests, error monitoring, and dependency/security update review.
