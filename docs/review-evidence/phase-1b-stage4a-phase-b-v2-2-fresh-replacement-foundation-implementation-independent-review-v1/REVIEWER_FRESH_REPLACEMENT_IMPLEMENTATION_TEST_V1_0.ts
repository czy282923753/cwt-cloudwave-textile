// Reviewer-only evidence. This file was executed only in a disposable exact-Candidate snapshot.
// It is not Candidate code and was removed before final clean-state verification.

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPhaseBAvailabilityServiceV1 } from "@/ai/applications/draft-assistance/composition";
import type { ReconstructibleDraftContextV1 } from "@/ai/applications/draft-assistance/context";
import type { ReadonlyJsonObject } from "@/ai/canonical-json";
import { draftOutputDefinitionV1 } from "@/ai/output/registry";
import { editorialRevisions } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

function context(): ReconstructibleDraftContextV1 {
  return {
    version: 1,
    applicationClass: "draft_assistance",
    capability: "text",
    useCase: "product_description_draft",
    locale: "en",
    association: {
      kind: "draft_target.v1",
      targetType: "product_draft",
      targetAlias: "target_01",
      expectedVersion: 7,
      snapshotHash: "a".repeat(64),
    },
    task: { tone: "concise_professional_b2b" },
    sources: [{
      alias: "src_01",
      sourceClass: "product_structured",
      selectedBy: "request_actor",
      fields: [{
        field: "fabricStyle",
        ref: "src_01:fabricStyle",
        provenance: "provided",
        value: "plain weave",
      }],
    }],
    internalLinkCandidates: [],
    mediaPlacementRefs: [],
  };
}

function candidate(paragraphs: readonly string[]): ReadonlyJsonObject {
  return {
    schemaVersion: 1,
    useCase: "product_description_draft",
    locale: "en",
    summaryProposal: {
      text: "A conservative textile narrative.",
      sourceRefs: ["src_01:fabricStyle"],
    },
    descriptionBlocks: paragraphs.map((text) => ({
      type: "paragraph",
      text: { text, sourceRefs: ["src_01:fabricStyle"] },
    })),
    featureProposals: [],
    faqProposals: [],
    mediaTextProposals: [],
  };
}

describe("Reviewer Fresh replacement implementation challenges", () => {
  it("rejects a Fresh position-independent multiset family but preserves three-member and diverse positives", () => {
    const output = draftOutputDefinitionV1("product_description_draft");
    if (output === undefined) throw new Error("Missing test output definition.");
    const shared = "coated textile sourcing specification delivery";
    const family = [
      `${shared} alpha planning detail`,
      `beta commercial note ${shared}`,
      `gamma ${shared} logistics note`,
      `delta procurement ${shared} review`,
    ];
    expect(output.policy.parseAndProtect({
      rawObject: candidate(family.slice(0, 3)),
      context: context(),
    }).ok).toBe(true);
    expect(output.policy.parseAndProtect({
      rawObject: candidate(family),
      context: context(),
    })).toMatchObject({ ok: false, error: { code: "output_policy_rejected" } });

    const positives = [
      "Confirm the authorized brief before preparing a commercial draft.",
      "Review sample timing with the assigned sourcing contact.",
      "Keep unknown technical values empty for human verification.",
      "Separate packaging discussion from material performance notes.",
      "Record delivery assumptions as revision comments for review.",
      "Use approved fabric knowledge only when its source is selected.",
      "Present the candidate as a draft and require human approval.",
      "Escalate unsupported claims instead of inventing specifications.",
    ];
    expect(output.policy.parseAndProtect({
      rawObject: candidate(positives),
      context: context(),
    }).ok).toBe(true);
  });

  it("keeps malformed authoritative Revision rows indistinguishable from missing rows for an unrelated actor", async () => {
    const database = await createTestDatabase();
    try {
      const malformedId = "99999999-1111-4111-8111-111111111111";
      const missingId = "99999999-2222-4222-8222-222222222222";
      await database.db.insert(editorialRevisions).values({
        id: malformedId,
        entityType: "unexpected_entity_type",
        entityId: "99999999-3333-4333-8333-333333333333",
        locale: "en",
        versionNumber: 1,
        status: "draft",
        snapshot: { synthetic: true },
      });

      const service = createPhaseBAvailabilityServiceV1({
        database: database.db,
        trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
      });
      const inspect = (revisionId: string) => service.inspectDraftAssistanceAvailability({
        useCase: "product_description_draft",
        actor: {
          userId: "99999999-4444-4444-8444-444444444444",
          role: "content_editor",
        },
        target: { type: "editorial_revision", revisionId, expectedVersion: 1 },
        contextSelections: [],
      });

      expect(await inspect(malformedId)).toEqual(await inspect(missingId));
    } finally {
      await database.close();
    }
  });
});
