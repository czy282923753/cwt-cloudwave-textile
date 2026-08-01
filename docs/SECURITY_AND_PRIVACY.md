# Security and privacy baseline

## Remediation Round 2 controls

- Analytics remains disabled for `unknown` and `denied`; only `granted` events are stored or sent. Consent UI supports allow, decline, withdraw and modify.
- Event replay must match the original event, and every attribution string is format/length/PII validated. Internal Inquiry UUIDs stay in the server-side FK; clients receive a random `CWT-…` reference. Public entity tracking submits a governed route path and resolves its internal ID only on the server.
- Upload size and rate controls run before body parsing. `Content-Length` is mandatory for file transfer and small Inquiry/Intent JSON, and the binary length/MIME must match its Intent before the body is read. Trusted client IP headers require explicit Cloudflare or Vercel mode; arbitrary `x-forwarded-for` is ignored.
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

Login uses hashed account/network rate-limit keys and audits success, failure, disabled-user attempts, logout, and session revocation without credentials, tokens, or unnecessary PII. Conversion Events use unique Event IDs, consent state, published-entity validation, per-event property allowlists, server receiving limits, and content-level PII detection. Denied consent is not stored.

## Operational controls

Use environment validation, secure headers, CSRF-aware write operations, output encoding, rate limits, audit trails, database backups, restore tests, error monitoring, and dependency/security update review.
