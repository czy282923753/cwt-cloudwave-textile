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

## Operational controls

Use environment validation, secure headers, CSRF-aware write operations, output encoding, rate limits, audit trails, database backups, restore tests, error monitoring, and dependency/security update review.
