# Controlled Validation Fixture Specification V1.2

Prepared: `2026-08-13`

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
  "fixtureId": "SYN-AI-PRODUCT-BASE-01-PHASE-D-CONTROLLED-01",
  "fixtureVersion": 1,
  "classification": "SYNTHETIC TEST DATA — NOT A CWT FACT",
  "database": {
    "actor": {
      "id": "d1111111-1111-4111-8111-111111111111",
      "email": "phase-d-pd11@synthetic.invalid",
      "displayName": "SYNTHETIC TEST DATA — NOT A CWT FACT Evaluation Actor",
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
      "name": "SYNTHETIC TEST DATA — NOT A CWT FACT Synthetic Test Product One",
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
    "explicitInput": "SYNTHETIC TEST DATA — NOT A CWT FACT\nSYN-AI-PRODUCT-BASE-01\nSYN-PROD-001\nSynthetic Test Product One\nSynthetic Test Category\nTest blue\nMatte test finish\nSynthetic Sample Application"
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
    "body": "SYNTHETIC TEST DATA — NOT A CWT FACT\nReturn exactly one JSON object and no other text\nThe object must equal {\"descriptionBlocks\":[],\"faqProposals\":[],\"featureProposals\":[],\"locale\":\"en\",\"mediaTextProposals\":[],\"schemaVersion\":1,\"summaryProposal\":{\"sourceRefs\":[\"src_01:text\"],\"text\":\"SYNTHETIC TEST DATA — NOT A CWT FACT Synthetic Test Product One in test blue with a matte test finish for a synthetic sample application\"},\"useCase\":\"product_description_draft\"}\nDo not add any other key or text\nLocale={{locale}}\nContext={{product_context_json}}\nMedia={{media_placement_refs_json}}\nTone={{requested_tone}}"
  },
  "expectedOutput": {
    "schemaVersion": 1,
    "useCase": "product_description_draft",
    "locale": "en",
    "summaryProposal": {
      "text": "SYNTHETIC TEST DATA — NOT A CWT FACT Synthetic Test Product One in test blue with a matte test finish for a synthetic sample application",
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

The actor is active and has the accepted `product_editor` role; the Product is Draft; the localization is English/version `1`. The seed creates exactly one primary `product_taxonomy_terms` link from the two frozen IDs. `createdByUserId`/`updatedByUserId` use the frozen actor. Defaults must be independently checked to equal the accepted schema; there is no fallback config.

## 2. Derived canonical facts

All algorithms are the accepted Phase C RFC8785/JCS SHA-256 implementation executed under the pinned runtime. No authored or V1.1 value is authority for V1.2.

| Projection | Exact derived value |
|---|---|
| entire parsed fixture object | `6ee8e7504844d0a63aca49590c0d790e22cf911bea58b2d377bf23cf30bbe24a` (`3,299` JCS UTF-8 bytes) |
| nested Prompt resource serialized as JCS plus one LF | `1edce2035e15e32a4e4fd4bca04f4a9f6d4c3796c86b63cdb9a28e4810f4c522` (`1,259` bytes) |
| target snapshot | `36dd336154ebf19626d2b1921506544bb6e8727ddfc916094838eb9321111e3f` |
| full accepted reconstructible input context | `f6da8cb61c760f6ddb92da64a0495beff690287417d83271b3954e41c5cffeb8` (`785` JCS UTF-8 bytes) |
| literal explicit input | `182` UTF-8 bytes |
| explicit-input array | `a5d32996087908d35645955d54a7bb419e247fd9e2f275f6527ca1a962f163c9` |
| accepted request fingerprint | `023fa10bb4fa8451cd2b8306e9f6f2794f90190ac5af231d0e6e9626cd026813` |
| expected Provider output object | `0c02a4bd2e5965a396b7eda1e816eacf989d074d48334e947f9ec5b4e2c812fc` |
| accepted protected output envelope | `3efbc524f3df75c73e97ef9e414a47fb531d544bc650c66b4df38fdc7e63506f` |
| resolved config | `9b312bfeadaf10af5daeb1e67ccc5deef267dff42da720a10cd863332b73a49d` |
| DeepSeek envelope V1 | `28bdd2cedf963e65a817103fc41b5c0e636fff110938c590e6d80aedb6d68a0e` |
| rendered instructions | `4aeaa1ba6f799a32f821fb007caecf8625dfbd1503b2f7123c31d6e9288a789e` (`914` bytes) |
| Provider-neutral input | empty string (`0` bytes) |
| conservative adapter input estimate | `1,426` bytes |
| Provider request identity V1 | `afba78fff0b7aff8660bfe0b6db0b15ae7cdb3b5edb628cb7722226d4d78b3ef` |
| one-attempt conservative cost at current rates | `305` microusd |

The accepted protected-data classifier identity remains:

```text
cwt.phase1b.stage4a.phaseb.m02-grammar-registry.include-deepseek.v2_1
2.1.0
264ca6358dcec00da5bc17e134c89e52d5321c87683212b8c32ba12756700b66
```

The executable proof ran Node `24.14.0` and imported the accepted Phase C classifier, context policy, association codec, request binder, Prompt renderer, output schema/policy, config preparation and canonicalization implementations directly. It produced `allow`, accepted binder/fingerprint, accepted `product_description_draft` output policy and protected `draft_human_review`. Any later drift in a derived value stops before credential/API access and requires reviewed reconciliation.

## 3. Request-envelope identity

The Provider request identity covers only safe stored IDs/hashes and exact fixed limits. It does not hash a secret or persist Prompt/input content. The DeepSeek body follows Exact Design V1.2 with this fixture's empty Provider-neutral user-content string, fixed system instructions, explicit non-thinking, non-streaming JSON object, model alias and `max_tokens=64`. There are no optional sampling parameters.

The durable cross-check is:

```text
fixture resource JCS hash
  == controlled_validation_fixture_hash value in input_sources_json source attestation
request fingerprint/input/config/Prompt/envelope hashes
  == the exact ai_runs columns
safe Provider request identity recomputed from ai_runs
  == attempt_history_json provider_request_identity_hash
strict exported projection hashes
  == both the fixture resource and durable row
```

No raw Prompt, explicit input, selected context, Provider body, header, secret or credential derivative is copied into attempt history or exported evidence.

## 4. PD-11 and data classification

The Provider-bound literals are conspicuously Synthetic and use the accepted `SYN-AI-PRODUCT-BASE-01` semantics. The fixture contains no CWT fact, customer, Inquiry, Contact, Organization, recipient, Product fact, certification, facility, employee, capacity, private Asset, file, URL, credential, formal data or Production data. The output remains a protected Draft candidate requiring human review and cannot Publish or enable Index.
