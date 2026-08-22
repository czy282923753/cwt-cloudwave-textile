import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("AI candidate diff browser closure", () => {
  it("accepts only the safe projection and has no server capability or raw Candidate parser", () => {
    const source = readFileSync(resolve(process.cwd(), "src/editorial/ai-candidate-diff.ts"), "utf8");
    expect(source).toContain("AiDraftReviewProjectionV1");
    expect(source).not.toMatch(/@\/(?:db|server|catalog|content|ai\/runs|ai\/output|ai\/prompts)\//);
    expect(source).not.toMatch(/(?:server-only|node:crypto|Buffer|fetch\(|WebSocket|localStorage|sessionStorage|indexedDB)/);
    expect(source).not.toMatch(/(?:candidateJson|rawObject|ProtectedDraftCandidate|autosave|onChangeTarget)/i);
    expect(source).toContain("buildApplyAiDraftCandidateV1");
    expect(source).not.toMatch(/applyAiDraftAssistanceCandidateAction|product-service|content-service/);
  });
});
