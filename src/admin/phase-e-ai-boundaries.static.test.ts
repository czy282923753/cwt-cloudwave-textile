import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sourceRoot = resolve(process.cwd(), "src");

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? filesBelow(path) : [path];
  });
}

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Phase E E5 static AI boundaries", () => {
  it("has exactly one admin runtime importer and one marker-authority invariant in the server AI composition", () => {
    const runtimeImporters = filesBelow(sourceRoot)
      .filter((path) => /\.(?:ts|tsx)$/.test(path) && !/\.(?:test|spec)\./.test(path))
      .filter((path) => readFileSync(path, "utf8").includes("phase-d-provider-composition"))
      .map((path) => path.slice(sourceRoot.length + 1));
    expect(runtimeImporters).toEqual(["admin/ai-actions.ts"]);

    const composition = source("src/server/ai/phase-d-provider-composition.ts");
    expect(composition).toContain(
      'import { CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A } from "@/ai/server-bundle-marker";',
    );
    expect(composition).toContain(
      'import { CWT_PRODUCTION_PROMPT_BUNDLE_MARKER } from "@/ai/prompts/generated/production-prompt-bundle.generated";',
    );
    expect(composition).not.toMatch(/["']CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A["']/);
    expect(composition).not.toMatch(/["']CWT_SERVER_AI_PROMPT_BUNDLE_V1_91B6E4A3["']/);
    expect([...composition.matchAll(/function assertServerAiBoundaryMarkersV1\(\): void/g)])
      .toHaveLength(1);
    expect([...composition.matchAll(/^assertServerAiBoundaryMarkersV1\(\);$/gm)]).toHaveLength(1);
    const invariant = composition.slice(
      composition.indexOf("const serverAiBoundaryMarkersV1"),
      composition.indexOf("const trustedEnvironment"),
    );
    expect(invariant).toContain("new Set(serverAiBoundaryMarkersV1).size !== 2");
    expect(invariant).not.toMatch(/(?:fetch\(|database|providerRegistry|createAiRunWorker|env\.)/i);
  });

  it("permits exactly the approved browser-safe editorial helper seam", () => {
    const panel = source("src/admin/components/ai-draft-assistance-panel.tsx");
    expect(panel).toContain('"use client"');
    const editorialImports = [...panel.matchAll(/from\s+"(@\/editorial\/[^"]+)"/g)]
      .map((match) => match[1]);
    expect(editorialImports).toEqual(["@/editorial/ai-candidate-diff"]);
    expect(panel).not.toMatch(/@\/(?:db|server\/ai|integrations\/ai|ai\/prompts|catalog|content|crm|uploads)\//);
    expect(panel).not.toMatch(/(?:database|schema|provider|prompt|objectKey|privateAsset)/i);
    expect(panel).not.toMatch(/\b(?:WebSocket|localStorage|sessionStorage|indexedDB|setInterval)\b/);
    expect(panel).not.toMatch(/\b(?:onApply|onChangeTarget|autosave|revalidatePath|router\.refresh)\b/i);
    expect(panel).not.toMatch(/@\/(?:catalog|content)\/(?:product|content)-service/);
    expect(panel).toContain("Undo local review");
    expect(panel).toContain("Accept locally");
    expect(panel).toContain("Apply reviewed candidate");
    expect(panel).toContain("applyAiDraftAssistanceCandidateAction");

    const props = panel.slice(
      panel.indexOf("export interface AiDraftAssistancePanelPropsV1"),
      panel.indexOf("export function AiDraftAssistancePanel"),
    );
    expect([...props.matchAll(/readonly\s+([A-Za-z0-9_]+)\??:/g)].map((match) => match[1]))
      .toEqual(["requestIdentity", "request", "pollIntervalMs", "pollingBudget"]);
    expect(props).not.toMatch(/(?:safeBefore|candidate|targetSnapshot|onApply|onChangeTarget)/i);
  });

  it("keeps the one existing lifecycle/Apply Action authority thin and integrates E5 only on the two detail pages", () => {
    const actions = source("src/admin/ai-actions.ts");
    expect(actions).toContain('"use server"');
    expect(actions).toContain("phase-d-provider-composition");
    expect(actions).not.toMatch(/@\/(?:db|catalog|content|crm|uploads)\//);
    expect(actions).not.toMatch(/(?:revalidatePath|redirect\(|fetch\(|WebSocket|providerRegistry|promptLoader)/);
    expect([...actions.matchAll(/export async function ([A-Za-z0-9_]+)\(/g)].map((match) => match[1]))
      .toEqual([
        "inspectAiDraftAssistanceAvailabilityAction",
        "enqueueAiDraftAssistanceAction",
        "readAiDraftAssistanceRunAction",
        "cancelAiDraftAssistanceRunAction",
        "retryAiDraftAssistanceRunAction",
        "rejectAiDraftAssistanceCandidateAction",
        "applyAiDraftAssistanceCandidateAction",
      ]);
    expect(actions).not.toMatch(/\bcandidate:\s*(?:ready\s*\?|row\.)/);

    const panelImporters = filesBelow(resolve(sourceRoot, "app"))
      .filter((path) => /\.(?:ts|tsx)$/.test(path))
      .filter((path) => readFileSync(path, "utf8").includes(
        'from "@/admin/components/ai-draft-assistance-panel"',
      ))
      .map((path) => path.slice(sourceRoot.length + 1));
    expect(panelImporters).toEqual([
      "app/admin/contents/[id]/page.tsx",
      "app/admin/products/[id]/page.tsx",
    ]);

    const productPage = source("src/app/admin/products/[id]/page.tsx");
    const contentPage = source("src/app/admin/contents/[id]/page.tsx");
    const pageSources = `${productPage}\n${contentPage}`;
    expect(pageSources).not.toMatch(/@\/admin\/ai-actions|(?:enqueue|apply)AiDraftAssistance/);
    expect(pageSources).not.toMatch(/explicitInput|\bactor\s*:|\brole\s*:/);
    expect(pageSources).not.toMatch(/@\/(?:db|server\/ai|integrations\/ai|ai\/prompts|catalog\/product-service|content\/content-service)/);

    expect(productPage).toContain('useCase: "product_description_draft" as const');
    expect(productPage).toContain('useCase: "seo_content_draft" as const');
    expect(productPage).toContain('tone: "concise_professional_b2b" as const');
    expect(productPage).toContain("selectedMediaPlacementIds: []");
    expect(productPage).toContain("selectedInternalLinkIds: []");
    expect(productPage).toContain("pageIntent: editorTitle");
    expect(productPage).not.toContain("primaryPhrase:");

    expect(contentPage).toContain('useCase: "seo_content_draft" as const');
    expect(contentPage).toContain('content.channel !== "fabric_knowledge"');
    expect(contentPage).toContain('useCase: "fabric_knowledge_draft" as const');
    expect(contentPage).toContain('tone: "neutral_editorial" as const');
    expect(contentPage).toContain("topic: editorTitle");
    expect(contentPage).toContain('content.channel !== "china_sourcing_guide"');
    expect(contentPage).toContain('useCase: "sourcing_guide_draft" as const');
    expect(contentPage).toContain("guideIntent: editorTitle");
    expect(contentPage).not.toContain('content.channel === "china_textile_guide"');

    for (const page of [productPage, contentPage]) {
      expect(page).toContain("contextSelections: []");
      expect(page).toContain("requestIdentity={JSON.stringify(");
      expect(page).toContain("Number.isInteger(draftSnapshot.draftVersion)");
      expect(page).toContain("aiRevisionDraftVersion !== null");
      expect(page).toContain("Ordinary manual editing remains available.");
    }

    const publicApplicationSources = filesBelow(resolve(sourceRoot, "app"))
      .filter((path) => /\.(?:ts|tsx)$/.test(path) && !path.includes("/app/admin/"))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    expect(publicApplicationSources).not.toContain("ai-draft-assistance-panel");
    expect(publicApplicationSources).not.toContain("AiDraftAssistancePanel");
  });

  it("keeps the approved helper browser-only and free of business capability", () => {
    const helper = source("src/editorial/ai-candidate-diff.ts");
    expect(helper).not.toMatch(/@\/(?:db|server|catalog|content|ai\/runs|ai\/output|ai\/prompts)\//);
    expect(helper).not.toMatch(/(?:server-only|node:crypto|Buffer|fetch\(|WebSocket)/);
    expect(helper).not.toMatch(/(?:onApply|onChangeTarget|autosave|revalidatePath|router\.refresh)/i);
    expect(helper).toContain("MAX_UNDO");
    expect(helper).toContain("MAX_EDIT_SCALARS");
    expect(helper).toContain("buildApplyAiDraftCandidateV1");
    expect(helper).not.toMatch(/applyAiDraftAssistanceCandidateAction|@\/(?:catalog|content)\/.*service/);
  });
});
