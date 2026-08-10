import { createTestDatabase } from "@/test/database";
import {
  buildAuthorizedDraftAssociationV1,
  prepareDraftAssociationV1,
} from "@/ai/applications/draft-assistance/association";
import { createDraftContextPolicy } from "@/ai/applications/draft-assistance/context";
import { withReadOnlyDraftAvailabilityScope } from "@/ai/applications/draft-assistance/read-scopes";
import { draftOutputDefinitionV1 } from "@/ai/output/registry";
import { protectedDataClassifierV1 } from "@/ai/context/protected-data";

const database = await createTestDatabase();
const association = prepareDraftAssociationV1({
  type: "product_draft",
  productId: "11111111-1111-4111-8111-111111111111",
  locale: "en",
  expectedVersion: 7,
});
if (!association.ok) throw new Error("association fixture failed");
const authorized = buildAuthorizedDraftAssociationV1(association.value);
if (!authorized.ok) throw new Error("authorized fixture failed");

const actor = {
  principalId: "99999999-9999-4999-8999-999999999999",
  roleKey: "admin",
};
const commandBase = {
  useCase: "product_description_draft" as const,
  actor: {
    userId: "99999999-9999-4999-8999-999999999999",
    role: "admin" as const,
  },
  target: {
    type: "product_draft" as const,
    productId: "11111111-1111-4111-8111-111111111111",
    locale: "en" as const,
    expectedVersion: 7,
  },
  idempotencyKey: "88888888-8888-4888-8888-888888888888",
};

async function buildProduct(
  field: string,
  provenance: "structural" | "provided" | "verified",
  value: unknown,
) {
  const policy = createDraftContextPolicy({
    async readSelectedSource() {
      return {
        ok: true as const,
        value: {
          sourceClass: "product_structured" as const,
          sourceIdentity: {
            productId: "11111111-1111-4111-8111-111111111111",
            recordVersion: 7,
          },
          fields: [{ field, provenance, value }],
        },
      };
    },
  });
  const result = await withReadOnlyDraftAvailabilityScope(database.db, (scope) =>
    policy.buildReconstructibleContext({
      actor,
      command: {
        ...commandBase,
        contextSelections: [{
          sourceClass: "product_structured" as const,
          sourceId: "11111111-1111-4111-8111-111111111111",
          fields: [field],
        }],
      },
      association: authorized.value,
      scope,
    }),
  );
  return { policy, result };
}

const invalidWeight = await buildProduct("weightGsm", "verified", "-5");
const invalidMoq = await buildProduct("moqPair", "verified", {
  moqValue: "500",
  moqUnit: null,
});
const structuralComposition = await buildProduct(
  "composition",
  "structural",
  "100% TEST fiber",
);
const validProduct = await buildProduct("fabricStyle", "provided", "plain weave");
if (!validProduct.result.ok) throw new Error("valid product fixture failed");
const encoded = validProduct.policy.encodePreparedContext(validProduct.result.value);
const variables = validProduct.policy.buildPromptVariables(validProduct.result.value);
if (!encoded.ok || !variables.ok) throw new Error("encoding fixture failed");

async function buildMany(
  sourceClass: "fabric_knowledge" | "public_company_fact",
  count: number,
) {
  const policy = createDraftContextPolicy({
    async readSelectedSource(input) {
      return {
        ok: true as const,
        value: sourceClass === "fabric_knowledge"
          ? {
              sourceClass,
              sourceIdentity: { contentId: input.selector.sourceId, revision: 1 },
              fields: [{
                field: "title",
                provenance: "verified" as const,
                value: "TEST fabric note",
              }],
            }
          : {
              sourceClass,
              sourceIdentity: { factId: input.selector.sourceId, version: 1 },
              fields: [{
                field: "statement",
                provenance: "verified" as const,
                value: "TEST public fact",
              }],
            },
      };
    },
  });
  const useCase = sourceClass === "fabric_knowledge"
    ? "product_description_draft" as const
    : "seo_content_draft" as const;
  return withReadOnlyDraftAvailabilityScope(database.db, (scope) =>
    policy.buildReconstructibleContext({
      actor,
      command: {
        ...commandBase,
        useCase,
        contextSelections: Array.from({ length: count }, (_, index) => ({
          sourceClass,
          sourceId: `${String(index + 1).padStart(8, "0")}-1111-4111-8111-111111111111`,
          fields: sourceClass === "fabric_knowledge" ? ["title"] : ["statement"],
        })),
      },
      association: authorized.value,
      scope,
    }),
  );
}

const nineFabricSources = await buildMany("fabric_knowledge", 9);
const twentyOneCompanyFacts = await buildMany("public_company_fact", 21);

const policy = createDraftContextPolicy({
  async readSelectedSource() {
    throw new Error("not reached");
  },
});
const crossUseCaseContext = {
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
    snapshotHash: authorized.value.snapshotHash,
  },
  task: { tone: "concise_professional_b2b" },
  sources: [{
    alias: "src_01",
    sourceClass: "public_company_fact",
    selectedBy: "request_actor",
    fields: [{
      field: "statement",
      ref: "src_01:statement",
      provenance: "verified",
      value: "TEST verified public company statement",
    }],
  }],
  internalLinkCandidates: [],
  mediaPlacementRefs: [],
};
const crossUseCaseDecode = policy.parseDurableContext(crossUseCaseContext);
const output = draftOutputDefinitionV1("product_description_draft");
if (output === undefined) throw new Error("output fixture missing");
const crossUseCaseOutput = crossUseCaseDecode.ok
  ? output.policy.parseAndProtect({
      context: crossUseCaseDecode.value,
      rawObject: {
        schemaVersion: 1,
        useCase: "product_description_draft",
        locale: "en",
        summaryProposal: {
          text: "A conservative TEST narrative.",
          sourceRefs: ["src_01:statement"],
        },
        descriptionBlocks: [],
        featureProposals: [],
        faqProposals: [],
        mediaTextProposals: [],
      },
    })
  : crossUseCaseDecode;

const repeatedOutput = output.policy.parseAndProtect({
  context: validProduct.result.value,
  rawObject: {
    schemaVersion: 1,
    useCase: "product_description_draft",
    locale: "en",
    summaryProposal: {
      text: "A conservative TEST narrative.",
      sourceRefs: ["src_01:fabricStyle"],
    },
    descriptionBlocks: Array.from({ length: 30 }, () => ({
      type: "paragraph",
      text: {
        text: "Repeated plain weave narrative.",
        sourceRefs: ["src_01:fabricStyle"],
      },
    })),
    featureProposals: [],
    faqProposals: [],
    mediaTextProposals: [],
  },
});

const m02Cases = Object.fromEntries([
  ["deepseek_diacritic", "deep\u034Fseek"],
  ["deepseek_default_ignorable", "deep\u2060seek-v4-flash"],
  ["deepseek_combining_circle", "deep\u20DDseek"],
  ["deepseek_lf", "deep\nseek"],
  ["visible_hyphen_tradeoff", "deep-seek"],
  ["visible_em_dash_tradeoff", "deep—seek"],
  ["ordinary_space_tradeoff", "deep seek"],
  ["safe_persian_zwnj", "می\u200Cرود"],
  ["safe_emoji_zwj", "Textile 👩‍💻 overview"],
  ["safe_accented_cjk", "café 面料 résumé"],
].map(([name, value]) => [name, protectedDataClassifierV1.classify(value)]));
const gapFour = `d${"\u034F".repeat(4)}e${"\u2060".repeat(4)}epseek`;
const gapFive = `d${"\u034F".repeat(5)}eepseek`;
const longSkeleton = Array.from("environment variable");
const totalBoundary = (extra: boolean) => longSkeleton.map((character, index) => {
  if (index < 16) return `${character}${"\u2060".repeat(4)}`;
  if (index === 16 && extra) return `${character}\u20DD`;
  return character;
}).join("");

process.stdout.write(`${JSON.stringify({
  invalidProductValuesAccepted: {
    negativeWeight: invalidWeight.result.ok,
    halfMoqPair: invalidMoq.result.ok,
    structuralComposition: structuralComposition.result.ok,
  },
  aggregateLimitsAccepted: {
    nineFabricSources: nineFabricSources.ok,
    twentyOneCompanyFacts: twentyOneCompanyFacts.ok,
  },
  provenanceIdentity: encoded.value.inputSources[0]?.sourceIdentity,
  promptVariables: {
    keys: Object.keys(variables.value).sort(),
    inputHashMatchesPrepared: variables.value.input_hash === encoded.value.inputHash,
  },
  claimedCrossUseCase: {
    durableContextAccepted: crossUseCaseDecode.ok,
    productOutputAcceptedWithCompanyFactRef: crossUseCaseOutput.ok,
  },
  repeatedSpamAccepted: repeatedOutput.ok,
  m02Cases,
  m02Boundaries: {
    perGapFour: protectedDataClassifierV1.classify(gapFour),
    perGapFive: protectedDataClassifierV1.classify(gapFive),
    total64: protectedDataClassifierV1.classify(totalBoundary(false)),
    total65: protectedDataClassifierV1.classify(totalBoundary(true)),
  },
}, null, 2)}\n`);
await database.close();
