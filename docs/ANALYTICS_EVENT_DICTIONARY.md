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

`inquiry_created`, `inquiry_qualified`, `quote_recorded`, `sample_recorded`, `inquiry_won`, and `inquiry_lost`.

## Allowed context

Event ID, anonymous session ID, timestamp, route/entity reference, referrer, UTM source/medium/campaign, landing page, CTA position, consent state, aggregate `file_count`, and a strict non-PII context map.

The only event-specific free properties are `placement` for Product/CTA/WhatsApp/submit events and integer `file_count` for upload events. All other event properties are rejected. Entity-linked events require the target entity to be currently Published. Repeated Event IDs are deduplicated. Denied consent writes no event.

## Forbidden context

Name, email, WhatsApp, description, filenames, file URLs, private Asset IDs, UUID-like customer identifiers, file content, secrets, or raw customer attachments. WhatsApp clicks are not treated as sent messages or qualified inquiries.

## Delivery

The application records first landing/referrer/UTM, last non-direct source/medium/campaign, submit source page, and an explicit attribution-confidence value. It sends only approved events/parameters through an analytics adapter. Disabled adapters are explicit in non-production environments.
