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

Event ID, anonymous session ID, timestamp, route/entity reference, referrer, UTM source/medium/campaign, landing page, CTA position, consent state, and a strict non-PII context map.

## Forbidden context

Name, email, WhatsApp, description, filenames, file content, secrets, or raw customer attachments. WhatsApp clicks are not treated as sent messages or qualified inquiries.

## Delivery

The application records first-party events and sends only approved events/parameters through an analytics adapter. Disabled adapters are explicit in non-production environments.
