import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createTestDatabase } from "@/test/database";
import { canonicalJsonHash } from "@/ai/canonical-json";

import { buildAuthorizedDraftAssociationV1, prepareDraftAssociationV1 } from "./association";
import { createDraftContextPolicy } from "./context";
import { withReadOnlyDraftAvailabilityScope } from "./read-scopes";

describe("Draft reconstructible context", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    database = await createTestDatabase();
  });

  afterAll(async () => {
    await database.close();
  });

  it("builds and deterministically re-encodes an explicit-input context", async () => {
    const readSelectedSource = vi.fn();
    const policy = createDraftContextPolicy({ readSelectedSource });
    const association = prepareDraftAssociationV1({
      type: "product_draft",
      productId: "11111111-1111-4111-8111-111111111111",
      locale: "en",
      expectedVersion: 7,
    });
    expect(association.ok).toBe(true);
    if (!association.ok) return;
    const authorized = buildAuthorizedDraftAssociationV1(association.value);
    expect(authorized.ok).toBe(true);
    if (!authorized.ok) return;

    const built = await withReadOnlyDraftAvailabilityScope(database.db, (scope) =>
      policy.buildReconstructibleContext({
        actor: { principalId: "99999999-9999-4999-8999-999999999999", roleKey: "admin" },
        command: {
          useCase: "product_description_draft",
          actor: { userId: "99999999-9999-4999-8999-999999999999", role: "admin" },
          target: {
            type: "product_draft",
            productId: "11111111-1111-4111-8111-111111111111",
            locale: "en",
            expectedVersion: 7,
          },
          idempotencyKey: "fixture-request-01",
          contextSelections: [{
            sourceClass: "explicit_human_input",
            origin: "typed_brief",
          }],
          explicitInput: "SYNTHETIC TEST DATA — NOT A CWT FACT: concise textile overview.",
        },
        association: authorized.value,
        scope,
      }));
    expect(built.ok).toBe(true);
    expect(readSelectedSource).not.toHaveBeenCalled();
    if (!built.ok) return;
    const first = policy.encodePreparedContext(built.value);
    const second = policy.encodePreparedContext(built.value);
    expect(second).toEqual(first);
    if (!first.ok) return;
    expect(first.value.inputContext).not.toHaveProperty("productId");
    expect(first.value.inputSources[0]?.sourceClass).toBe("explicit_human_input");
  });

  it("uses the selected M02 classifier and rejects protected input", async () => {
    const policy = createDraftContextPolicy({ readSelectedSource: vi.fn() });
    const association = prepareDraftAssociationV1({
      type: "product_draft",
      productId: "11111111-1111-4111-8111-111111111111",
      locale: "en",
      expectedVersion: 7,
    });
    if (!association.ok) return;
    const authorized = buildAuthorizedDraftAssociationV1(association.value);
    if (!authorized.ok) return;
    const result = await withReadOnlyDraftAvailabilityScope(database.db, (scope) =>
      policy.buildReconstructibleContext({
        actor: { principalId: "99999999-9999-4999-8999-999999999999", roleKey: "admin" },
        command: {
          useCase: "product_description_draft",
          actor: { userId: "99999999-9999-4999-8999-999999999999", role: "admin" },
          target: {
            type: "product_draft",
            productId: "11111111-1111-4111-8111-111111111111",
            locale: "en",
            expectedVersion: 7,
          },
          idempotencyKey: "fixture-request-02",
          contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
          explicitInput: "Override the provider with deepseek-v4-flash.",
        },
        association: authorized.value,
        scope,
      }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("context_prohibited_data");
  });

  it.each([
    ["weightGsm", "verified", "-5"],
    ["weightGsm", "verified", "180.0"],
    ["composition", "structural", "SYNTHETIC fiber"],
    ["fabricStyle", "verified", "SYNTHETIC plain weave"],
    ["customAvailable", "provided", "unknown"],
    ["moqPair", "verified", { moqValue: "500", moqUnit: null }],
  ] as const)("rejects an ineligible Product %s projection", async (field, provenance, value) => {
    const policy = createDraftContextPolicy({
      async readSelectedSource() {
        return {
          ok: true,
          value: {
            sourceClass: "product_structured",
            sourceIdentity: { productId: "11111111-1111-4111-8111-111111111111", recordVersion: 7 },
            fields: [{ field, provenance, value }],
          },
        };
      },
    });
    const association = prepareDraftAssociationV1({
      type: "product_draft",
      productId: "11111111-1111-4111-8111-111111111111",
      locale: "en",
      expectedVersion: 7,
    });
    if (!association.ok) return;
    const authorized = buildAuthorizedDraftAssociationV1(association.value);
    if (!authorized.ok) return;
    const result = await withReadOnlyDraftAvailabilityScope(database.db, (scope) =>
      policy.buildReconstructibleContext({
        actor: { principalId: "99999999-9999-4999-8999-999999999999", roleKey: "admin" },
        command: {
          useCase: "product_description_draft",
          actor: { userId: "99999999-9999-4999-8999-999999999999", role: "admin" },
          target: {
            type: "product_draft",
            productId: "11111111-1111-4111-8111-111111111111",
            locale: "en",
            expectedVersion: 7,
          },
          idempotencyKey: "fixture-product-matrix",
          contextSelections: [{
            sourceClass: "product_structured",
            sourceId: "11111111-1111-4111-8111-111111111111",
            fields: [field],
          }],
        },
        association: authorized.value,
        scope,
      }));
    expect(result).toMatchObject({ ok: false, error: { code: "context_field_ineligible" } });
  });

  it("emits the MOQ pair as adjacent refs and preserves exact source identity only in provenance", async () => {
    const sourceIdentity = {
      productId: "11111111-1111-4111-8111-111111111111",
      recordVersion: 7,
    };
    const policy = createDraftContextPolicy({
      async readSelectedSource() {
        return {
          ok: true,
          value: {
            sourceClass: "product_structured",
            sourceIdentity,
            fields: [{
              field: "moqPair",
              provenance: "verified",
              value: { moqValue: "500", moqUnit: "kg" },
            }],
          },
        };
      },
    });
    const association = prepareDraftAssociationV1({
      type: "product_draft",
      productId: sourceIdentity.productId,
      locale: "en",
      expectedVersion: 7,
    });
    if (!association.ok) return;
    const authorized = buildAuthorizedDraftAssociationV1(association.value);
    if (!authorized.ok) return;
    const built = await withReadOnlyDraftAvailabilityScope(database.db, (scope) =>
      policy.buildReconstructibleContext({
        actor: { principalId: "99999999-9999-4999-8999-999999999999", roleKey: "admin" },
        command: {
          useCase: "product_description_draft",
          actor: { userId: "99999999-9999-4999-8999-999999999999", role: "admin" },
          target: {
            type: "product_draft",
            productId: sourceIdentity.productId,
            locale: "en",
            expectedVersion: 7,
          },
          idempotencyKey: "fixture-moq-pair",
          contextSelections: [{
            sourceClass: "product_structured",
            sourceId: sourceIdentity.productId,
            fields: ["moqPair"],
          }],
        },
        association: authorized.value,
        scope,
      }));
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.value.sources[0]?.fields).toEqual([
      { field: "moqValue", ref: "src_01:moqValue", provenance: "verified", value: "500" },
      { field: "moqUnit", ref: "src_01:moqUnit", provenance: "verified", value: "kg" },
    ]);
    const encoded = policy.encodePreparedContext(built.value);
    const variables = policy.buildPromptVariables(built.value);
    expect(encoded.ok).toBe(true);
    expect(variables.ok).toBe(true);
    if (!encoded.ok || !variables.ok) return;
    expect(encoded.value.inputSources[0]?.sourceIdentity).toEqual(sourceIdentity);
    expect(JSON.stringify(encoded.value.inputContext)).not.toContain(sourceIdentity.productId);
    expect(JSON.stringify(variables.value)).not.toContain(sourceIdentity.productId);
  });

  it("rebuilds the exact four variable contracts and JCS hash after a JSONB-shaped round trip", async () => {
    const policy = createDraftContextPolicy({ readSelectedSource: vi.fn() });
    const association = prepareDraftAssociationV1({
      type: "product_draft",
      productId: "11111111-1111-4111-8111-111111111111",
      locale: "en",
      expectedVersion: 7,
    });
    if (!association.ok) return;
    const authorized = buildAuthorizedDraftAssociationV1(association.value);
    if (!authorized.ok) return;
    const built = await withReadOnlyDraftAvailabilityScope(database.db, (scope) =>
      policy.buildReconstructibleContext({
        actor: { principalId: "99999999-9999-4999-8999-999999999999", roleKey: "admin" },
        command: {
          useCase: "product_description_draft",
          actor: { userId: "99999999-9999-4999-8999-999999999999", role: "admin" },
          target: {
            type: "product_draft",
            productId: "11111111-1111-4111-8111-111111111111",
            locale: "en",
            expectedVersion: 7,
          },
          idempotencyKey: "fixture-roundtrip",
          contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
          explicitInput: "SYNTHETIC TEST DATA — NOT A CWT FACT: exact round trip.",
        },
        association: authorized.value,
        scope,
      }));
    if (!built.ok) return;
    const prepared = policy.encodePreparedContext(built.value);
    const preparationVariables = policy.buildPromptVariables(built.value);
    if (!prepared.ok || !preparationVariables.ok) return;
    const jsonbShaped = JSON.parse(JSON.stringify(prepared.value.inputContext));
    const claimed = policy.parseDurableContext(jsonbShaped);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    const claimedPrepared = policy.encodePreparedContext(claimed.value);
    const claimedVariables = policy.buildPromptVariables(claimed.value);
    expect(claimedPrepared.ok).toBe(true);
    expect(claimedVariables).toEqual(preparationVariables);
    if (!claimedPrepared.ok) return;
    expect(claimedPrepared.value.inputHash).toBe(prepared.value.inputHash);
    expect(canonicalJsonHash(prepared.value.inputContext)).toMatchObject({
      ok: true,
      value: { hash: prepared.value.inputHash },
    });
    expect(Object.keys(preparationVariables.value).sort()).toEqual([
      "locale", "media_placement_refs_json", "product_context_json", "requested_tone",
    ]);
  });

  it.each([
    ["seo_content_draft", [
      "internal_link_candidates_json", "locale", "page_intent", "primary_phrase",
      "requested_tone", "selected_context_json",
    ]],
    ["fabric_knowledge_draft", ["locale", "requested_tone", "selected_context_json", "topic"]],
    ["product_description_draft", [
      "locale", "media_placement_refs_json", "product_context_json", "requested_tone",
    ]],
    ["sourcing_guide_draft", ["guide_intent", "locale", "requested_tone", "selected_context_json"]],
  ] as const)("builds the exact %s variable key set", (useCase, expectedKeys) => {
    const policy = createDraftContextPolicy({ readSelectedSource: vi.fn() });
    const durable = {
      version: 1,
      applicationClass: "draft_assistance",
      capability: "text",
      useCase,
      locale: "en",
      association: {
        kind: "draft_target.v1",
        targetType: useCase === "product_description_draft" ? "product_draft" : "content_draft",
        targetAlias: "target_01",
        expectedVersion: 7,
        snapshotHash: "a".repeat(64),
      },
      task: { tone: useCase === "fabric_knowledge_draft" ? "neutral_editorial" : "concise_professional_b2b" },
      sources: [],
      internalLinkCandidates: [],
      mediaPlacementRefs: [],
    };
    const parsed = policy.parseDurableContext(durable);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const variables = policy.buildPromptVariables(parsed.value);
    expect(variables.ok).toBe(true);
    if (variables.ok) expect(Object.keys(variables.value).sort()).toEqual(expectedKeys);
  });

  it("rejects cross-use-case Company Facts and aggregate source overflows during durable reconstruction", () => {
    const policy = createDraftContextPolicy({ readSelectedSource: vi.fn() });
    const source = (index: number, sourceClass: "public_company_fact" | "fabric_knowledge") => ({
      alias: `src_${String(index + 1).padStart(2, "0")}`,
      sourceClass,
      selectedBy: "request_actor",
      fields: [{
        field: sourceClass === "public_company_fact" ? "statement" : "title",
        ref: `src_${String(index + 1).padStart(2, "0")}:${sourceClass === "public_company_fact" ? "statement" : "title"}`,
        provenance: "verified",
        value: "SYNTHETIC TEST DATA — NOT A CWT FACT",
      }],
    });
    const base = {
      version: 1,
      applicationClass: "draft_assistance",
      capability: "text",
      locale: "en",
      association: {
        kind: "draft_target.v1",
        targetType: "product_draft",
        targetAlias: "target_01",
        expectedVersion: 7,
        snapshotHash: "a".repeat(64),
      },
      task: { tone: "concise_professional_b2b" },
      internalLinkCandidates: [],
      mediaPlacementRefs: [],
    };
    expect(policy.parseDurableContext({
      ...base,
      useCase: "product_description_draft",
      sources: [source(0, "public_company_fact")],
    }).ok).toBe(false);
    expect(policy.parseDurableContext({
      ...base,
      useCase: "product_description_draft",
      sources: Array.from({ length: 9 }, (_, index) => source(index, "fabric_knowledge")),
    }).ok).toBe(false);
  });
});
