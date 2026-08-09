# CWT Stage 4A DeepSeek Enterprise Evidence Questionnaire

Status: **OWNER-AUTHORIZED FOR SUBMISSION / PROVIDER RESPONSE PENDING**  
Questionnaire version: `1.0`  
Owner authorization date: `2026-08-10` (Asia/Shanghai)  
Intended recipient: DeepSeek Open Platform / API enterprise, privacy, security, or support team  
Product under evaluation: `https://api.deepseek.com` / `deepseek-v4-flash`

## Purpose and boundary

CloudWave Textile is evaluating the DeepSeek API for a possible future non-Production Stage 4A Staging integration providing text-only AI Draft assistance.

This request is limited to supplier capability, security, data-processing, service-term, and suitability assessment. It does not indicate approval for API integration, credentials, a real API call, Production use, formal business-data transfer, private/customer-data transfer, development authorization, deployment, Publish, or Index.

No CWT customer data, private Inquiry data, formal Product data, credentials, logs, files, or other business payload is included with this questionnaire.

Please provide written answers and supporting documents that apply specifically to the DeepSeek Open Platform API, `https://api.deepseek.com`, `deepseek-v4-flash`, and the applicable account/contract effective on the response date.

## 1. API data use and model training

1. Are API Inputs, Outputs, system Prompts, feedback, request metadata, safety-review copies, application logs, or cache used for model pre-training, fine-tuning, optimization, evaluation, human review, abuse monitoring, or service improvement?
2. State the default behavior for API customers and every applicable exception.
3. If an opt-out or zero-data-training mode exists, confirm its exact scope, account/project applicability, activation method, verification evidence, and whether it covers historical and future data.
4. Identify any data that remains reviewable or retained after opt-out for security, legal, abuse-prevention, or support purposes.

## 2. Processing and storage regions

1. Identify the countries/regions used for API inference, transient processing, disk/context cache, application logs, safety/abuse review, backups, disaster recovery, technical support access, and subprocessors.
2. Confirm whether region selection or regional routing is available and contractually enforced.
3. Identify all expected cross-border transfers for a customer application hosted in Singapore, including any transfer to the People's Republic of China.
4. Identify the responsible DeepSeek legal entity and each relevant data processor/subprocessor role.

## 3. Data retention and deletion

1. State the maximum retention period for API Inputs, Outputs, request metadata, logs, safety-review copies, cache, backups, and support records.
2. Explain deletion timing, backup expiry, legal-hold exceptions, and behavior after account closure or contract termination.
3. Confirm whether customer-initiated deletion or return of API content is available, its scope, and the verification evidence provided.

## 4. Context caching

1. Confirm whether disk context caching is enabled by default for this API/model.
2. Can cache construction be disabled or bypassed per account, project, request, or contract?
3. State the contractual maximum cache lifetime, deletion behavior, encryption at rest, key-management boundary, storage region, and support/subprocessor access.
4. Explain isolation between users, API keys, projects, organizations, and separate customer accounts. Clarify the exact protection provided by `user_id` and any limitation of that control.

## 5. Enterprise security and privacy assurance

Please provide or identify:

1. the applicable API DPA, confidentiality terms, and controller/processor roles;
2. the current API subprocessor list and change-notification process;
3. security certifications or independent assurance reports in scope for the API;
4. transport and at-rest encryption, key custody, privileged-access control, employee/support access, audit logging, vulnerability management, and secure-development controls;
5. fixed incident-response and customer-notification commitments;
6. API content/log/cache/backup retention and deletion commitments; and
7. material security, privacy, service-term, or model-change notification terms.

## 6. Service stability and support

1. Is an enterprise SLA available for the API? Provide availability, latency/support-response commitments, exclusions, credits, and termination/remedy terms.
2. Describe maintenance notification, outage communication, incident postmortem availability, and support/escalation channels.
3. State the current `deepseek-v4-flash` concurrency, timeout/keep-alive, capacity-expansion, and quota behavior, and whether dedicated or reserved capacity is available.
4. Explain how model deprecation, material behavior changes, endpoint changes, and price changes are notified.

## 7. Account, model, quota, and cost controls

1. Describe organization/project/member separation, role-based access, API-key scopes, key creation/rotation/revocation, and audit/usage export.
2. Confirm how Staging and Production can be isolated at account/project/key and billing levels.
3. Confirm `deepseek-v4-flash` entitlement and whether the requested and returned model/version/system fingerprint can be verified for every request.
4. Describe account and project quotas, concurrency limits, balance controls, hard spending caps, budget alerts, and whether limits apply independently across projects/API keys.
5. Identify available enterprise onboarding, security-review, support, and capacity-expansion processes.

## 8. Applicability confirmation

Please confirm that the response:

- applies to the official DeepSeek Open Platform API at `https://api.deepseek.com`;
- applies to `deepseek-v4-flash` and identifies any model-specific exception;
- identifies the governing legal entity, terms, policy versions, and effective date;
- distinguishes public-product policy from API-specific enterprise commitments; and
- identifies any answer that requires a paid enterprise agreement or account setting rather than the public standard terms.

## Requested response package

Where available, please include the relevant DPA, security/assurance summary, subprocessor list, retention/deletion schedule, region/data-flow statement, cache-control statement, SLA/support terms, account-isolation description, and instructions for verifying all applicable account settings.

The CWT project will independently review the response before any later development or integration decision. Silence, marketing language, or a general consumer policy will not be treated as an API-specific enterprise commitment.
