# CWT Email Template Contract

Status: **Approved contract for Phase 1B Stage 5; implementation not started**

Owner decision: [Phase 1B Stage 0 owner decisions](./PHASE_1B_OWNER_DECISIONS.md#8-approved-email-template-variables)

## 1. Authority and scope

PostgreSQL Inquiry/CRM records remain authoritative. Email is a notification channel only. SMTP success or failure never creates, edits, qualifies, closes, or reverses an Inquiry.

Phase 1B extends the existing `notification_outbox`; it does not create a second email queue. Template Draft/Active/history/rollback reuse `system_settings`, the existing Editorial Revision authority, Domain Service authorization, and atomic required Audit rather than a second revision mechanism or email-template business table.

This contract covers exactly two transactional notification jobs, two template kinds, test send, and environment envelope safety. It does not implement mailbox synchronization, automatic sales replies, chat, SMS, customer accounts, or marketing automation.

## 2. Two independent Outbox jobs

Every newly committed Inquiry creates two distinct jobs in the existing Outbox transaction:

| Job kind | Purpose | Recipient authority |
| --- | --- | --- |
| `inquiry_notification` | Internal CWT notification; retains the existing kind for compatibility | Environment-approved internal address |
| `inquiry_customer_confirmation` | Customer acknowledgement | Immutable submitted customer email snapshot, subject to environment override |

Each kind has a distinct stable delivery/idempotency key and independent status, lease, retry, backoff, provider result, and terminal-dead behavior. One job failing does not prevent or duplicate the other. Sending occurs after the Inquiry transaction; provider failure never rolls back the committed Inquiry.

## 3. Production sender and recipient boundary

Production SMTP contract:

```text
SMTP account: sales@cwtextile.com
From: CloudWave Textile Sales <sales@cwtextile.com>
Reply-To: info@cwtextile.com
Internal notification To: info@cwtextile.com
Customer confirmation To: Inquiry submitted-email snapshot
```

- Production and Staging use separate Zoho application-specific passwords.
- From and Reply-To are centralized environment policy, not editable template variables.
- Templates cannot add arbitrary From, Sender, Reply-To, Return-Path, To, CC, or BCC values.
- Header values reject CR/LF and other injection characters.
- Customer confirmation is sent only when the submitted email passed Inquiry validation and the Inquiry transaction committed.

## 4. Staging sender and forced-recipient boundary

Staging contract:

```text
SMTP account: sales@cwtextile.com
Zoho app password name: CWT Staging SMTP
Forced recipient: test@cwtextile.com
Subject prefix: [STAGING]
Reply-To: info@cwtextile.com
```

After template rendering and logical recipient resolution, but before the SMTP/provider call, the server replaces the complete envelope:

```text
To  → exactly test@cwtextile.com
CC  → exactly test@cwtextile.com when logical CC was non-empty; otherwise empty
BCC → exactly test@cwtextile.com when logical BCC was non-empty; otherwise empty
```

No original customer/internal recipient may remain anywhere in the Staging provider envelope. Staging startup fails closed unless the override is exactly configured and global noindex/formal-analytics-disabled rules are active. The subject receives exactly one `[STAGING]` prefix.

Development/test adapters capture redacted results locally and do not call Zoho or any real SMTP service.

## 5. Customer confirmation variable allowlist

Only these exact variables are accepted:

| Variable | Source | Empty behavior |
| --- | --- | --- |
| `customer_name` | Immutable Inquiry submitted-name snapshot | Required for a sent customer template |
| `inquiry_reference` | Public Inquiry reference, not internal UUID | Required |
| `submitted_at` | Server Inquiry creation time, formatted by fixed locale policy | Required |
| `company_name` | Fixed verified brand value `CloudWave Textile` | Required |
| `reply_to_email` | Environment policy `info@cwtextile.com` | Required |

Customer templates cannot access customer email, WhatsApp, message/description, attachments, attribution, internal IDs/status, Admin URLs, private Assets, or arbitrary Contact/Organization fields.

## 6. Internal notification variable allowlist

Only these exact variables are accepted:

| Variable | Source and rule |
| --- | --- |
| `inquiry_reference` | Public Inquiry reference; internal UUID is not templated. |
| `submitted_at` | Server Inquiry creation time. |
| `customer_name` | Immutable submitted-name snapshot. |
| `customer_email` | Immutable submitted-email snapshot. |
| `country_code` | Immutable submitted-country snapshot; omit line when absent. |
| `whatsapp` | Immutable submitted-WhatsApp snapshot; omit line when absent. |
| `inquiry_description` | Immutable Inquiry description; escaped/bounded as untrusted text. |
| `attachment_count` | Count only; never a file/object reference. |
| `source_page_path` | Governed normalized submit-source path. |
| `landing_page_path` | Immutable normalized landing path when available. |
| `referrer` | Validated/bounded attribution snapshot when available. |
| `utm_source` | Validated/bounded attribution snapshot. |
| `utm_medium` | Validated/bounded attribution snapshot. |
| `utm_campaign` | Validated/bounded attribution snapshot. |
| `last_non_direct_source` | Validated/bounded attribution snapshot. |
| `last_non_direct_medium` | Validated/bounded attribution snapshot. |
| `last_non_direct_campaign` | Validated/bounded attribution snapshot. |
| `source_entity_type` | Server-resolved Product/Application/Content type when available. |
| `source_entity_label` | Server-resolved safe label from the approved entity revision. |
| `operations_url` | Canonical authenticated Admin record page; never a private-media URL. |

The engine rejects unknown variables, nested property traversal, expressions, functions, loops, includes, arbitrary URL fetches, and secret/environment access. Optional missing values are omitted or render the approved neutral English fallback; templates cannot infer a value.

## 7. Template lifecycle

There are exactly two template kinds: internal notification and customer confirmation. Each supports:

1. **Draft** — editable only by an authorized role and never used by ordinary Outbox delivery;
2. **Preview** — renders synthetic or explicitly selected authorized record data without sending;
3. **Test send** — uses the Draft/selected revision but always sends to `test@cwtextile.com` with a test prefix, including in Production administration;
4. **Active** — one approved revision per kind used by new delivery claims;
5. **Revision history** — existing Editorial Revision snapshots retain subject, safe body, template version, variable contract version, actor, timestamps, and required Audit;
6. **Rollback** — an authorized human activates a previous compatible revision through the same apply/Audit boundary.

Activation and rollback do not mutate already committed Outbox payload identity or falsely report an already sent job. The implementation plan must explicitly choose and test whether a pending job renders the template snapshot captured at enqueue or the Active version identified at enqueue; it must not silently switch semantics during retry. Recommended behavior is to store the template revision ID/version in the Outbox payload and render that immutable approved revision on every attempt.

Templates permit escaped plain text and a strictly sanitized approved email-markup subset only. Raw JavaScript, event handlers, external scripts, arbitrary CSS, forms, tracking pixels, and remote includes are prohibited.

## 8. Default English fallbacks

Code-owned versioned English fallbacks remain available when no compatible Active custom template exists. An invalid Active template fails safe to the approved fallback and emits an operational error; it does not send partially rendered or invented content.

### Customer confirmation fallback

Subject:

```text
We received your CloudWave Textile inquiry {{inquiry_reference}}
```

Body contract:

```text
Hello {{customer_name}},

Thank you for contacting CloudWave Textile. We received your inquiry
{{inquiry_reference}} on {{submitted_at}}. Our team will review it and
reply from our business email.

If you need to add context, reply to {{reply_to_email}} and include your
inquiry reference.

CloudWave Textile
```

This is an acknowledgement, not a quote, availability promise, lead-time promise, MOQ confirmation, certification statement, or automated sales response.

### Internal notification fallback

Subject:

```text
New CWT inquiry {{inquiry_reference}}
```

Body contract:

```text
New CWT inquiry

Reference: {{inquiry_reference}}
Submitted: {{submitted_at}}
Name: {{customer_name}}
Email: {{customer_email}}
Country: {{country_code}}
WhatsApp: {{whatsapp}}
Description: {{inquiry_description}}
Private attachment count: {{attachment_count}}
Source page: {{source_page_path}}
Landing page: {{landing_page_path}}
Referrer: {{referrer}}
UTM: {{utm_source}} / {{utm_medium}} / {{utm_campaign}}
Last non-direct: {{last_non_direct_source}} / {{last_non_direct_medium}} /
{{last_non_direct_campaign}}
Source entity: {{source_entity_type}} — {{source_entity_label}}

Open CWT Operations: {{operations_url}}
Review private files only through authenticated record-scoped access.
```

Lines with an absent optional value are omitted as complete lines. The fallback includes attachment count only and does not attach or inline customer files.

## 9. Private files, links, and privacy

- Private Inquiry images/files are never email attachments, inline images, public Assets, Content-ID parts, or AI context.
- Templates and payloads never contain raw Object Keys, absolute host paths, permanent bucket URLs, signed private-file URLs, or direct filesystem links.
- Internal mail may contain only the authenticated `operations_url`; the Operations application rechecks record-scoped authorization before any private-file access.
- Public marketing media is not embedded from a raw provider URL; any approved branding image must use an approved stable application-controlled public contract suitable for email, or be omitted initially.
- Logs and monitoring contain job ID/kind, attempt, redacted provider result, and error code only—not rendered bodies, recipient lists, credentials, customer message, or private file metadata.
- Template preview/test send requires record authorization and must not expose one customer's data to an unrelated role.

## 10. Failure, retry, and provider evidence

- SMTP timeout, authentication failure, quota, rejection, and uncertain response map to typed Outbox outcomes.
- Retry/backoff is bounded and idempotent. Provider Message-ID/delivery key behavior is validated externally before Production readiness.
- A terminal-dead job remains visible and alertable; it is never marked successful by a template activation or manual UI acknowledgement.
- Outbox failure/backlog alerts use an independent Tencent/Sentry or approved non-Zoho path so the failing SMTP channel is not the only alert.
- Provider, timestamp, safe response classification, template revision, and delivery key evidence are retained without credentials or full PII.

## 11. Acceptance gate

Stage 5 cannot exit until template validation, authorization/Audit, Draft/Active/Revision/Rollback, fallback, two-job transaction/idempotency, Staging To/CC/BCC override, test send, header injection, SMTP-down, private-file exclusion, log redaction, and real PostgreSQL Outbox concurrency checks in [Phase 1B Acceptance Matrix](./PHASE_1B_ACCEPTANCE_MATRIX.md) pass.

Zoho authentication and real delivery remain Stage 7 External Validation and Production-readiness blockers.
