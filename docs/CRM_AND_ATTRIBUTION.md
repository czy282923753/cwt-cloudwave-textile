# CRM and attribution

## Inquiry contract

Name and email are required. A description or one successfully stored image is required. Country and WhatsApp are optional.

## Relationships

An Organization may have many Contacts. A Contact may have many Inquiries. Each Inquiry has private assets, an owner, priority, qualification state, pipeline status, activities, status history, and attribution snapshot.

Exact normalized email may match an existing Contact. Similar names or organizations never auto-merge.

## Pipeline

New, Reviewing, Qualified, Quoted, Sample, Negotiation, Won, Lost, Spam, Archived.

Qualification: Unassessed, Qualified, Unqualified, Needs Information. A pipeline state of Qualified requires qualification state Qualified.

## Activities

Note, Email, WhatsApp, Quote, Sample, and Status Change. First Response Time counts the first valid outbound interaction, not an internal note.

## Attribution

Store first landing/referrer/UTM, last non-direct source, submit source page, anonymous session ID, and attribution confidence. Search Console queries remain aggregated and are never assigned as certain keywords for an individual inquiry.

## Privacy

Analytics never receives name, email, WhatsApp, description, filenames, or file contents. Spam and internal activity are separated from qualified conversion reporting.
