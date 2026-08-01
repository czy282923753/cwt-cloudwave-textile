# CRM and attribution

## Inquiry contract

Name and email are required. A description or one successfully stored image is required. Country and WhatsApp are optional.

## Relationships

An Organization may have many Contacts. A Contact may have many Inquiries. Each Inquiry has private assets, an owner, priority, qualification state, pipeline status, activities, status history, and attribution snapshot.

Exact normalized email may match an existing Contact. Similar names or organizations never auto-merge. An unauthenticated submission never overwrites the matched Contact; submitted name/email/country/WhatsApp remain immutable Inquiry snapshots for human comparison.

Every public submission carries a unique Idempotency Key. The database unique constraint and service lookup make network retries return the original Inquiry. Inquiry creation and a notification-outbox row commit together. Notification failure never rolls back a valid Inquiry; the worker retries due rows and eventually records sent or dead status without exposing customer content in logs.

## Pipeline

New, Reviewing, Qualified, Quoted, Sample, Negotiation, Won, Lost, Spam, Archived.

Qualification: Unassessed, Qualified, Unqualified, Needs Information. A pipeline state of Qualified requires qualification state Qualified.

## Activities

Note, Email, WhatsApp, Quote, Sample, and Status Change have Inbound, Outbound, or Internal direction subject to type rules. First Response Time is recalculated from the earliest valid Outbound Email, WhatsApp, Quote, or Sample; Internal Notes never count.

Admin sees all records. Sales is owner-scoped. Owner may only be an active Sales/Admin user. Qualified pipeline status and qualification state must agree, Lost requires a reason, and Spam is excluded from effective-inquiry reporting.

## Attribution

Store first landing/referrer/UTM, last non-direct source, submit source page, anonymous session ID, and attribution confidence. Search Console queries remain aggregated and are never assigned as certain keywords for an individual inquiry.

## Privacy

Analytics never receives name, email, WhatsApp, description, filenames, or file contents. Spam and internal activity are separated from qualified conversion reporting.
