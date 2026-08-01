# Analytics event dictionary

## Public events

| Event | Trigger |
|---|---|
| `product_view` | A product page completes its primary render |
| `quote_cta_click` | A quote CTA is activated |
| `whatsapp_click` | The WhatsApp outbound action is activated |
| `upload_started` | The first inquiry file selection begins |
| `image_upload_completed` | An inquiry image is stored successfully |
| `quote_submit_success` | An inquiry transaction succeeds |

## Server/CRM events

`inquiry_qualified`, `quote_recorded`, `sample_recorded`, `inquiry_won`, and `inquiry_lost` are CRM status/activity/history data only. They never enter `conversion_events` or an analytics adapter. A consented `inquiry_created` aggregate may enter public analytics with only an opaque `CWT-…` reference and no internal Inquiry UUID.

## Allowed context

Event ID, timestamp, public route/entity type, referrer origin, UTM source/medium/campaign, landing page, CTA position, aggregate `file_count`, and a strict non-PII context map. The server may retain its anonymous Consent Session key for enforcement, but the provider payload mapper omits that key and all database entity IDs.

The only event-specific free properties are `placement` for Product/CTA/WhatsApp/submit events and integer `file_count` for upload events. All other event properties are rejected. Entity-linked events require the target entity to be currently Published and Product additionally passes its real-product public boundary. Repeated Event IDs are deduplicated. Unknown, Denied, and Revoked server consent write no event.

## Forbidden context

Name, email, WhatsApp, description, filenames, file URLs, private Asset IDs, UUID-like customer identifiers, file content, secrets, or raw customer attachments. WhatsApp clicks are not treated as sent messages or qualified inquiries.

## Consent and delivery

Consent is persisted server-side with status, monotonically increasing version, Granted time, Revoked time and updated time under an HttpOnly anonymous cookie. Client payloads cannot declare or override consent. The application records first landing/referrer/UTM, last non-direct source/medium/campaign, submit source page, and an explicit attribution-confidence value. It sends only approved events/parameters through the privacy mapper. Disabled adapters are explicit in non-production environments.
