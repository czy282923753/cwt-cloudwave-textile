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

describe("Phase E E4 static AI boundaries", () => {
  it("has exactly one new runtime importer of the byte-unchanged server AI composition", () => {
    const runtimeImporters = filesBelow(sourceRoot)
      .filter((path) => /\.(?:ts|tsx)$/.test(path) && !/\.(?:test|spec)\./.test(path))
      .filter((path) => readFileSync(path, "utf8").includes("phase-d-provider-composition"))
      .map((path) => path.slice(sourceRoot.length + 1));
    expect(runtimeImporters).toEqual(["admin/ai-actions.ts"]);
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

  it("keeps the one existing lifecycle/Apply Action authority thin and E5 absent", () => {
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

    const applicationSources = filesBelow(resolve(sourceRoot, "app"))
      .filter((path) => /\.(?:ts|tsx)$/.test(path))
      .map((path) => readFileSync(path, "utf8").toLowerCase())
      .join("\n");
    expect(applicationSources).not.toContain("ai-draft-assistance-panel");
    expect(applicationSources).not.toContain("enqueueaidraftassistanceaction");
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
