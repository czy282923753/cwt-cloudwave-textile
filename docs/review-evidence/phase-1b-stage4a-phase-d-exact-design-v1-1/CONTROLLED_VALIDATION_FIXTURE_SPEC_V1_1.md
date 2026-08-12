# Controlled Validation Fixture Specification V1.1

Prepared: `2026-08-12`

Purpose: freeze the sole future PD-11 controlled-validation fixture before Phase D implementation. This is design evidence, not an executable Provider call and not a Production Prompt authority.

## 1. Sole future resource

Authorized implementation path:

```text
test-fixtures/ai/deepseek-controlled-validation.v1.json
```

The implementation resource must strict-parse to exactly the JSON object below. Key order and whitespace are not semantic authority; RFC8785/JCS canonical bytes are. Unknown keys, duplicate JSON keys, BOM, CR, non-fatal UTF-8, trailing JSON, non-LF final line, altered scalar or changed array order fail closed.

```json
{
  "fixtureFormatVersion": 1,
  "fixtureId": "pd11-deepseek-text-adapter-v1",
  "fixtureVersion": 1,
  "classification": "SYNTHETIC TEST DATA — NOT A CWT FACT",
  "database": {
    "actor": {
      "id": "d1111111-1111-4111-8111-111111111111",
      "email": "phase-d-pd11@synthetic.invalid",
      "displayName": "SYNTHETIC PD-11 Actor",
      "role": "product_editor",
      "passwordHash": "test-only-disabled-login"
    },
    "taxonomy": {
      "id": "d2222222-2222-4222-8222-222222222222",
      "internalKey": "synthetic-phase-d-pd11-material",
      "dimension": "material_fiber"
    },
    "product": {
      "id": "d3333333-3333-4333-8333-333333333333",
      "status": "draft",
      "locale": "en",
      "name": "SYNTHETIC PD-11 Product — NOT A CWT FACT",
      "editorDocumentVersion": 1
    },
    "featureFlag": {
      "key": "ai",
      "enabled": true
    }
  },
  "command": {
    "applicationClass": "draft_assistance",
    "capability": "text",
    "useCase": "product_description_draft",
    "idempotencyKey": "d5555555-5555-4555-8555-555555555555",
    "target": {
      "type": "product_draft",
      "productId": "d3333333-3333-4333-8333-333333333333",
      "locale": "en",
      "expectedVersion": 1
    },
    "contextSelections": [
      {
        "sourceClass": "explicit_human_input",
        "origin": "typed_brief"
      }
    ],
    "explicitInput": "SYNTHETIC TEST DATA — NOT A CWT FACT. State only that this is a synthetic textile sample."
  },
  "modelConfig": {
    "id": "d4444444-4444-4444-8444-444444444444",
    "provider": "deepseek",
    "model": "deepseek-v4-flash",
    "parameters": {},
    "maxInputTokens": 2048,
    "maxOutputTokens": 64,
    "maxAttempts": 1,
    "runCostLimitMicrousd": 400,
    "promptId": "pd11-deepseek-product-draft",
    "promptVersion": 1,
    "enabled": true,
    "isDefault": true
  },
  "promptResource": {
    "resourceFormatVersion": 1,
    "promptId": "pd11-deepseek-product-draft",
    "promptVersion": 1,
    "applicationClass": "draft_assistance",
    "capability": "text",
    "useCase": "product_description_draft",
    "locale": "en",
    "inputSchemaVersion": 1,
    "outputSchemaVersion": 1,
    "policyVersion": "draft-product-description-v1",
    "variables": [
      {
        "name": "locale",
        "type": "string",
        "maximumUtf8Bytes": 16
      },
      {
        "name": "product_context_json",
        "type": "json",
        "maximumUtf8Bytes": 49152
      },
      {
        "name": "media_placement_refs_json",
        "type": "json",
        "maximumUtf8Bytes": 8192
      },
      {
        "name": "requested_tone",
        "type": "enum",
        "values": [
          "concise_professional_b2b",
          "neutral_editorial"
        ]
      }
    ],
    "body": "SYNTHETIC TEST DATA — NOT A CWT FACT. Return exactly one JSON object and no other text. The object must equal {\"descriptionBlocks\":[],\"faqProposals\":[],\"featureProposals\":[],\"locale\":\"en\",\"mediaTextProposals\":[],\"schemaVersion\":1,\"summaryProposal\":{\"sourceRefs\":[\"src_01:text\"],\"text\":\"This is a synthetic textile sample.\"},\"useCase\":\"product_description_draft\"}. Do not add facts, numbers, company, customer, facility, certification, tools, URLs, files, retrieval, reasoning, or extra keys. Locale={{locale}} Context={{product_context_json}} Media={{media_placement_refs_json}} Tone={{requested_tone}}"
  },
  "expectedOutput": {
    "schemaVersion": 1,
    "useCase": "product_description_draft",
    "locale": "en",
    "summaryProposal": {
      "text": "This is a synthetic textile sample.",
      "sourceRefs": [
        "src_01:text"
      ]
    },
    "descriptionBlocks": [],
    "featureProposals": [],
    "faqProposals": [],
    "mediaTextProposals": []
  }
}
```

The actor is active; the Product is Draft; the localization is English/version `1`. The seed creates exactly one primary `product_taxonomy_terms` link from the two frozen IDs. `createdByUserId`/`updatedByUserId` use the frozen actor. Defaults must be independently checked to equal the accepted schema; there is no fallback config.

## 2. Canonical hashes and byte facts

All algorithms are the accepted CWT RFC8785/JCS SHA-256 implementation.

| Projection | Exact expected value |
|---|---|
| entire parsed fixture object | `5dca06e49a917c926ccf049e27fd176e8ecf0faccf5680fc74eae4c2140d18db` |
| nested Prompt resource serialized as JCS plus one LF | `4b10f323eff0afd5cc856371f0655eef09c4b2eea86c47d308658950b3f142be` (`1,247` bytes) |
| target snapshot | `36dd336154ebf19626d2b1921506544bb6e8727ddfc916094838eb9321111e3f` |
| full accepted reconstructible input context | `9093011e329e0507eae12d112228f0b807bd4cd6962a36af2e7781993e26b803` |
| explicit-input array | `9ff851b3caf44b2c495f78ff4954acfffab4d7b6ceaaf560f66e6926609489a5` |
| request fingerprint | `f1674771829d9fde16b8727b4043794490d9b93bc0b2a6e92b052745d54e5192` |
| resolved config | `81f5011cd9938cb6d66625c72a3284a4a4893d0d5ade598846a588827a8e20e6` |
| DeepSeek envelope V1 | `28bdd2cedf963e65a817103fc41b5c0e636fff110938c590e6d80aedb6d68a0e` |
| rendered instructions | `b854c7a47a3d383eb0532095e775b9ffc5c6f87688971a8b58ce4cf65b5dc8ef` (`811` bytes) |
| Provider-neutral input | empty string (`0` bytes) |
| conservative adapter input estimate | `1,323` |
| Provider request identity V1 | `17184416d9a4e0ca73b42330fa9931fd3988f4f77a04930d4105e3a5aacbb1ae` |
| one-attempt conservative cost at current rates | `305` microusd |

The request fingerprint includes the accepted protected-data classifier identity:

```text
cwt.phase1b.stage4a.phaseb.m02-grammar-registry.include-deepseek.v2_1
2.1.0
264ca6358dcec00da5bc17e134c89e52d5321c87683212b8c32ba12756700b66
```

If accepted canonicalization, classifier identity, context construction, Prompt rendering, target codec, Provider envelope or config preparation yields a different value, the fixture is not silently updated. Implementation stops for design reconciliation before any credential/API call.

## 3. Request envelope identity

The Provider request identity hash covers only safe stored IDs/hashes and exact fixed limits. It does not hash a secret or persist Prompt/input content. The DeepSeek body still follows Exact Design V1.0 Section 6.2, with this fixture's empty user-content string, fixed system instructions, explicit non-thinking, non-streaming JSON object, model alias and `max_tokens=64`. There are no optional sampling parameters.

The durable cross-check is:

```text
fixture resource JCS hash
  == input_sources_json explicit source attestation hash
request fingerprint/input/config/Prompt/envelope hashes
  == the exact ai_runs columns
safe Provider request identity recomputed from ai_runs
  == attempt_history_json provider_request_identity_hash
strict exported projection hashes
  == both the fixture resource and durable row
```

No raw Prompt, explicit input, selected context or Provider body is copied into attempt history or exported evidence.

## 4. PD-11 and data classification

Every literal is conspicuously Synthetic. The fixture contains no CWT fact, customer, Inquiry, Contact, Organization, email recipient, Product fact, certification, facility, employee, capacity, private Asset, file, URL, credential, formal data or Production data. The output remains a protected Draft candidate requiring human review and cannot Publish or enable Index.
