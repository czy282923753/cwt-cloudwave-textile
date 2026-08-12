import { readFileSync } from "node:fs";

import {
  canonicalJsonHash,
  canonicalizeJson,
  sha256Hex,
} from "../../../src/ai/canonical-json";
import {
  buildAuthorizedDraftAssociationV1,
  prepareDraftAssociationV1,
} from "../../../src/ai/applications/draft-assistance/association";
import { createDraftContextPolicy } from "../../../src/ai/applications/draft-assistance/context";
import {
  protectedDataClassifierV1,
  selectedProtectedDataRegistryIdentityV1,
} from "../../../src/ai/context/protected-data";
import { aiSuccess } from "../../../src/ai/errors";
import { resolvedConfigHashV1 } from "../../../src/ai/internal/preparation";
import { draftOutputDefinitionV1 } from "../../../src/ai/output/registry";
import { renderPromptV1 } from "../../../src/ai/prompts/renderer";
import { createDraftRequestBinder } from "../../../src/ai/registry/production-use-cases";

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`${label} is missing`);
  return value;
}

function successful<T>(
  result: { readonly ok: true; readonly value: T } | {
    readonly ok: false;
    readonly error?: { readonly code?: string };
  },
  label: string,
): T {
  if (!result.ok) {
    throw new Error(`${label} failed${result.error?.code === undefined ? "" : `: ${result.error.code}`}`);
  }
  return result.value;
}

function invariant(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`invariant failed: ${label}`);
}

invariant(process.versions.node === "24.14.0", "pinned Node 24.14.0 runtime");

const fixtureSpecification = readFileSync(
  "docs/review-evidence/phase-1b-stage4a-phase-d-exact-design-v1-2/CONTROLLED_VALIDATION_FIXTURE_SPEC_V1_2.md",
  "utf8",
);
const fixtureMatch = fixtureSpecification.match(/```json\n([\s\S]*?)\n```/u);
const fixture = JSON.parse(required(fixtureMatch?.[1], "fixture JSON block")) as any;

invariant(
  fixture.fixtureId.startsWith("SYN-AI-"),
  "accepted PD-11 fixture ID prefix",
);
invariant(
  fixture.command.explicitInput.startsWith("SYNTHETIC TEST DATA — NOT A CWT FACT"),
  "explicit-input Synthetic prefix",
);
invariant(
  fixture.promptResource.body.startsWith("SYNTHETIC TEST DATA — NOT A CWT FACT"),
  "Prompt Synthetic prefix",
);
invariant(
  fixture.expectedOutput.summaryProposal.text.startsWith(
    "SYNTHETIC TEST DATA — NOT A CWT FACT",
  ),
  "expected-output Synthetic prefix",
);
invariant(fixture.database.actor.role === "product_editor", "accepted actor role");
invariant(fixture.database.product.status === "draft", "Draft target status");
invariant(fixture.modelConfig.maxAttempts === 1, "one controlled attempt");

const fixtureCanonical = successful(canonicalJsonHash(fixture), "fixture JCS");
const promptCanonical = successful(canonicalizeJson(fixture.promptResource), "Prompt JCS");
const promptBytes = `${promptCanonical}\n`;
const promptHash = sha256Hex(Buffer.from(promptBytes, "utf8"));

const association = successful(
  prepareDraftAssociationV1(fixture.command.target),
  "association preparation",
);
const authorizedAssociation = successful(
  buildAuthorizedDraftAssociationV1(association),
  "association snapshot",
);

const inputContext = {
  version: 1,
  applicationClass: "draft_assistance",
  capability: "text",
  useCase: "product_description_draft",
  locale: "en",
  association: {
    kind: "draft_target.v1",
    targetType: "product_draft",
    targetAlias: "target_01",
    expectedVersion: 1,
    snapshotHash: authorizedAssociation.snapshotHash,
  },
  task: { tone: "concise_professional_b2b" },
  sources: [
    {
      alias: "src_01",
      sourceClass: "explicit_human_input",
      selectedBy: "request_actor",
      fields: [
        {
          field: "text",
          ref: "src_01:text",
          provenance: "provided",
          value: fixture.command.explicitInput,
        },
      ],
    },
  ],
  internalLinkCandidates: [],
  mediaPlacementRefs: [],
};
const inputContextHash = successful(canonicalJsonHash(inputContext), "input context JCS");
const explicitInputHash = successful(
  canonicalJsonHash([fixture.command.explicitInput]),
  "explicit input JCS",
);

const durableAssociationValue = {
  targetType: "product_draft",
  targetProductId: fixture.command.target.productId,
  targetLocale: "en",
  expectedTargetVersion: 1,
};
const independentlyDerivedRequestFingerprint = successful(
  canonicalJsonHash({
    version: 1,
    requested_by_principal_id: fixture.database.actor.id,
    application_class: "draft_assistance",
    capability: "text",
    use_case: "product_description_draft",
    association: durableAssociationValue,
    association_snapshot_hash: authorizedAssociation.snapshotHash,
    context: {
      classifier_registry_id: selectedProtectedDataRegistryIdentityV1.registryId,
      classifier_registry_version: selectedProtectedDataRegistryIdentityV1.registryVersion,
      classifier_registry_hash: selectedProtectedDataRegistryIdentityV1.sha256,
      input_hash: inputContextHash.hash,
      explicit_input_hash: explicitInputHash.hash,
      association_hash: authorizedAssociation.snapshotHash,
      source_refs: ["src_01"],
    },
  }),
  "request fingerprint JCS",
);

const acceptedContextPolicy = createDraftContextPolicy<any>({
  async readSelectedSource() {
    throw new Error("explicit-input-only fixture attempted a prohibited context read");
  },
});
const acceptedRequestBinder = createDraftRequestBinder<any>({
  availabilityAuthorization: {} as any,
  requestAuthorization: {
    associationKind: "draft_target.v1",
    async authorizeAndSnapshotForRequest() {
      return aiSuccess(authorizedAssociation);
    },
  },
  contextPolicy: acceptedContextPolicy,
  featureRepository: {} as any,
  configRepository: {} as any,
});
const boundRequest = successful(acceptedRequestBinder.bindRequest({
  actor: {
    principalId: fixture.database.actor.id,
    roleKey: fixture.database.actor.role,
  },
  command: {
    useCase: fixture.command.useCase,
    actor: {
      userId: fixture.database.actor.id,
      role: fixture.database.actor.role,
    },
    target: fixture.command.target,
    idempotencyKey: fixture.command.idempotencyKey,
    contextSelections: fixture.command.contextSelections,
    explicitInput: fixture.command.explicitInput,
  },
  association,
  scope: { mode: "governed_enqueue_transaction" } as any,
  idempotencyKey: fixture.command.idempotencyKey,
}), "accepted request binder");
const authorizedStage = successful(
  await boundRequest.authorizeAssociation(),
  "accepted request authorization",
);
const acceptedContextStage = successful(
  await authorizedStage.buildContextAndFingerprint(),
  "accepted context classification and fingerprint",
);
invariant(
  acceptedContextStage.requestIdentity.fingerprint === independentlyDerivedRequestFingerprint.hash,
  "binder fingerprint equals independently derived accepted-contract fingerprint",
);

const fixtureInputClassification = protectedDataClassifierV1.classify(
  fixture.command.explicitInput,
);
invariant(fixtureInputClassification.kind === "allow", "classifier-safe explicit input");

const productOutputDefinition = required(
  draftOutputDefinitionV1("product_description_draft"),
  "accepted product output definition",
);
const expectedOutputProtection = successful(
  productOutputDefinition.policy.parseAndProtect({
    rawObject: fixture.expectedOutput,
    context: inputContext as any,
  }),
  "accepted product_description_draft output policy",
);
invariant(
  expectedOutputProtection.dispositionKind === "draft_human_review",
  "protected draft-ready candidate disposition",
);

const immutableAttempt1Specification = readFileSync(
  "docs/review-evidence/phase-1b-stage4a-phase-d-exact-design-v1-1/CONTROLLED_VALIDATION_FIXTURE_SPEC_V1_1.md",
  "utf8",
);
const immutableAttempt1Match = immutableAttempt1Specification.match(/```json\n([\s\S]*?)\n```/u);
const immutableAttempt1Fixture = JSON.parse(
  required(immutableAttempt1Match?.[1], "immutable Attempt 1 fixture JSON block"),
) as any;
const immutableAttempt1Context = {
  ...inputContext,
  sources: [
    {
      ...inputContext.sources[0],
      fields: [
        {
          ...inputContext.sources[0]?.fields[0],
          value: immutableAttempt1Fixture.command.explicitInput,
        },
      ],
    },
  ],
};
const immutableAttempt1Bound = successful(acceptedRequestBinder.bindRequest({
  actor: {
    principalId: immutableAttempt1Fixture.database.actor.id,
    roleKey: immutableAttempt1Fixture.database.actor.role,
  },
  command: {
    useCase: immutableAttempt1Fixture.command.useCase,
    actor: {
      userId: immutableAttempt1Fixture.database.actor.id,
      role: immutableAttempt1Fixture.database.actor.role,
    },
    target: immutableAttempt1Fixture.command.target,
    idempotencyKey: immutableAttempt1Fixture.command.idempotencyKey,
    contextSelections: immutableAttempt1Fixture.command.contextSelections,
    explicitInput: immutableAttempt1Fixture.command.explicitInput,
  },
  association,
  scope: { mode: "governed_enqueue_transaction" } as any,
  idempotencyKey: immutableAttempt1Fixture.command.idempotencyKey,
}), "immutable Attempt 1 request binder");
const immutableAttempt1Authorized = successful(
  await immutableAttempt1Bound.authorizeAssociation(),
  "immutable Attempt 1 request authorization",
);
const immutableAttempt1ContextStage = await immutableAttempt1Authorized.buildContextAndFingerprint();
const immutableAttempt1OutputStage = productOutputDefinition.policy.parseAndProtect({
  rawObject: immutableAttempt1Fixture.expectedOutput,
  context: immutableAttempt1Context as any,
});
invariant(
  !immutableAttempt1ContextStage.ok &&
    immutableAttempt1ContextStage.error.code === "context_prohibited_data",
  "Attempt 1 M-01 input failure reproduced",
);
invariant(
  !immutableAttempt1OutputStage.ok &&
    immutableAttempt1OutputStage.error.code === "output_policy_rejected",
  "Attempt 1 M-01 output failure reproduced",
);

const envelope = successful(
  canonicalJsonHash({
    schema: "cwt.deepseek.text-envelope",
    version: 1,
    provider: "deepseek",
    host: "api.deepseek.com",
    path: "/chat/completions",
    model_alias: "deepseek-v4-flash",
    published_model_version: "DeepSeek-V4-Flash-0731",
    thinking: "disabled",
    stream: false,
    response_format: "json_object",
    max_input_tokens: 16000,
    max_output_tokens: 4000,
    timeout_ms: 120000,
    max_response_bytes: 1048576,
    parameter_allowlist: ["temperature", "top_p"],
  }),
  "Provider envelope JCS",
);

const resolvedConfig = successful(
  resolvedConfigHashV1({
    applicationClass: "draft_assistance",
    capability: "text",
    useCase: "product_description_draft",
    modelConfigId: fixture.modelConfig.id,
    modelConfigVersion: 1,
    requestedProvider: fixture.modelConfig.provider,
    requestedModel: fixture.modelConfig.model,
    parametersSnapshot: fixture.modelConfig.parameters,
    maxInputTokens: fixture.modelConfig.maxInputTokens,
    maxOutputTokens: fixture.modelConfig.maxOutputTokens,
    maxAttempts: fixture.modelConfig.maxAttempts,
    runCostLimitMicrousd: fixture.modelConfig.runCostLimitMicrousd,
    promptId: fixture.modelConfig.promptId,
    promptVersion: fixture.modelConfig.promptVersion,
    promptHash,
    providerEnvelope: { version: 1, hash: envelope.hash },
    inputSchemaVersion: 1,
    outputSchemaVersion: 1,
    policyVersion: fixture.promptResource.policyVersion,
  }),
  "resolved config JCS",
);

const rendered = successful(
  renderPromptV1({
    resource: {
      tuple: {
        promptId: fixture.promptResource.promptId,
        promptVersion: fixture.promptResource.promptVersion,
        promptHash,
      },
      applicationClass: fixture.promptResource.applicationClass,
      capability: "text",
      useCase: fixture.promptResource.useCase,
      locale: "en",
      inputSchemaVersion: fixture.promptResource.inputSchemaVersion,
      outputSchemaVersion: fixture.promptResource.outputSchemaVersion,
      policyVersion: fixture.promptResource.policyVersion,
      variables: fixture.promptResource.variables,
      body: fixture.promptResource.body,
    },
    variables: {
      locale: "en",
      product_context_json: inputContext.sources,
      media_placement_refs_json: [],
      requested_tone: "concise_professional_b2b",
    },
  }),
  "accepted Prompt renderer",
);
const renderedInstructionHash = sha256Hex(Buffer.from(rendered.instructions, "utf8"));

const providerRequestIdentity = successful(
  canonicalJsonHash({
    schema: "cwt.provider-request-identity",
    version: 1,
    application_class: "draft_assistance",
    use_case: "product_description_draft",
    idempotency_key: fixture.command.idempotencyKey,
    request_fingerprint_version: 1,
    request_fingerprint: acceptedContextStage.requestIdentity.fingerprint,
    model_config_id: fixture.modelConfig.id,
    model_config_version: 1,
    resolved_config_hash: resolvedConfig.hash,
    requested_provider: fixture.modelConfig.provider,
    requested_model: fixture.modelConfig.model,
    parameters_snapshot_json: fixture.modelConfig.parameters,
    max_input_tokens: fixture.modelConfig.maxInputTokens,
    max_output_tokens: fixture.modelConfig.maxOutputTokens,
    max_attempts: fixture.modelConfig.maxAttempts,
    prompt_id: fixture.modelConfig.promptId,
    prompt_version: fixture.modelConfig.promptVersion,
    prompt_hash: promptHash,
    provider_envelope_version: 1,
    provider_envelope_hash: envelope.hash,
    input_schema_version: 1,
    output_schema_version: 1,
    policy_version: fixture.promptResource.policyVersion,
    input_hash: inputContextHash.hash,
    controlled_validation_fixture_id: fixture.fixtureId,
    controlled_validation_fixture_hash: fixtureCanonical.hash,
  }),
  "Provider request identity JCS",
);

const expectedOutputCanonical = successful(
  canonicalJsonHash(fixture.expectedOutput),
  "expected output JCS",
);
const oneAttemptUpperCostMicrousd =
  Math.ceil(fixture.modelConfig.maxInputTokens * 140000 / 1_000_000) +
  Math.ceil(fixture.modelConfig.maxOutputTokens * 280000 / 1_000_000);
invariant(oneAttemptUpperCostMicrousd <= fixture.modelConfig.runCostLimitMicrousd, "run cost limit");

console.log(JSON.stringify({
  runtime: {
    node: process.versions.node,
    v8: process.versions.v8,
    icu: process.versions.icu,
    unicode: process.versions.unicode,
    cldr: process.versions.cldr,
    platform: process.platform,
    arch: process.arch,
  },
  findingReproduction: {
    m01Attempt1BinderDisposition: immutableAttempt1ContextStage.ok
      ? "accepted"
      : immutableAttempt1ContextStage.error.code,
    m01Attempt1OutputPolicyDisposition: immutableAttempt1OutputStage.ok
      ? "accepted"
      : immutableAttempt1OutputStage.error.code,
  },
  acceptedContract: {
    fixtureId: fixture.fixtureId,
    fixtureHash: fixtureCanonical.hash,
    fixtureCanonicalBytes: Buffer.byteLength(fixtureCanonical.canonicalJson, "utf8"),
    promptHash,
    promptBytes: Buffer.byteLength(promptBytes, "utf8"),
    targetSnapshotHash: authorizedAssociation.snapshotHash,
    inputHash: inputContextHash.hash,
    inputCanonicalBytes: Buffer.byteLength(inputContextHash.canonicalJson, "utf8"),
    explicitInputHash: explicitInputHash.hash,
    explicitInputUtf8Bytes: Buffer.byteLength(fixture.command.explicitInput, "utf8"),
    classifierDisposition: fixtureInputClassification.kind,
    binderDisposition: "accepted",
    requestFingerprint: acceptedContextStage.requestIdentity.fingerprint,
    outputPolicyDisposition: "accepted",
    protectedDisposition: expectedOutputProtection.dispositionKind,
    expectedOutputHash: expectedOutputCanonical.hash,
    protectedOutputHash: expectedOutputProtection.hash,
    resolvedConfigHash: resolvedConfig.hash,
    envelopeHash: envelope.hash,
    renderedInstructionHash,
    renderedInstructionBytes: Buffer.byteLength(rendered.instructions, "utf8"),
    providerNeutralInputBytes: Buffer.byteLength(rendered.input, "utf8"),
    conservativeAdapterInputEstimate: Buffer.byteLength(rendered.instructions, "utf8") +
      Buffer.byteLength(rendered.input, "utf8") + 512,
    providerRequestIdentityHash: providerRequestIdentity.hash,
    oneAttemptUpperCostMicrousd,
  },
}, null, 2));
