import { describe, expect, it } from "vitest";

import type { AiDraftReviewProjectionV1 } from "@/ai/applications/draft-assistance/contracts";

import {
  createAiCandidateDiffV1,
  createCandidateReviewStateV1,
  reduceCandidateReviewStateV1,
} from "./ai-candidate-diff";

const candidateHash = "a".repeat(64);
const firstId = `ai_${"1".repeat(60)}`;
const secondId = `ai_${"2".repeat(60)}`;

function projection(overrides: Partial<AiDraftReviewProjectionV1> = {}): AiDraftReviewProjectionV1 {
  return {
    version: 1,
    run: {
      id: "10000000-0000-4000-8000-000000000001",
      useCase: "product_description_draft",
      stateVersion: 4,
      candidateHash,
    },
    target: { kind: "product", locale: "en", draftVersion: 3 },
    projectionKey: "b".repeat(64),
    before: {
      kind: "product",
      name: "TEST Product",
      summary: null,
      document: [
        { id: "locked", kind: "paragraph", locked: true, text: ["Stable locked copy."] },
        { id: "open", kind: "paragraph", locked: false, text: ["Editable copy."] },
      ],
      seo: { title: null, metaDescription: null },
      mediaText: [],
    },
    proposal: {
      nodes: [
        { id: firstId, path: "/displayNameProposal", ordinal: 1, kind: "title",
          label: "Display name", proposedText: "TEST Proposal", beforeText: "TEST Product",
          details: [], editable: true, previewOnly: false },
        { id: secondId, path: "/outline/0", ordinal: 2, kind: "outline",
          label: "Planning", proposedText: "TEST Plan", beforeText: null,
          details: [], editable: false, previewOnly: true },
      ],
    },
    ...overrides,
  } as AiDraftReviewProjectionV1;
}

describe("browser-safe AI candidate review state", () => {
  it("separates locked current nodes from proposal decisions", () => {
    const view = createAiCandidateDiffV1(projection());
    expect(view.beforeDocument.map((node) => node.id)).toEqual(["locked", "open"]);
    expect(view.beforeDocument.map((node) => node.locked)).toEqual([true, false]);
    expect(view.proposalNodes.map((node) => node.id)).toEqual([firstId, secondId]);
    expect(view.proposalNodes.some((node) => node.id === "locked")).toBe(false);
  });

  it("supports explicit per-node decisions, bounded edits and Undo", () => {
    let state = createCandidateReviewStateV1("product:1:3", projection());
    expect(reduceCandidateReviewStateV1(state, {
      type: "edit", nodeId: firstId, text: "denied before Accept",
    })).toBe(state);
    state = reduceCandidateReviewStateV1(state, {
      type: "decide", nodeId: firstId, decision: "accepted",
    });
    state = reduceCandidateReviewStateV1(state, {
      type: "edit", nodeId: firstId, text: "TEST local edit",
    });
    expect(state.decisions[firstId]).toBe("accepted");
    expect(state.edits[firstId]).toBe("TEST local edit");
    state = reduceCandidateReviewStateV1(state, {
      type: "decide", nodeId: firstId, decision: "rejected",
    });
    expect(state.decisions[firstId]).toBe("rejected");
    expect(state.edits[firstId]).toBeUndefined();
    state = reduceCandidateReviewStateV1(state, { type: "undo" });
    expect(state.decisions[firstId]).toBe("accepted");
    expect(state.edits[firstId]).toBe("TEST local edit");
    state = reduceCandidateReviewStateV1(state, {
      type: "decide", nodeId: firstId, decision: "pending",
    });
    expect(state.decisions[firstId]).toBe("pending");
    expect(state.edits[firstId]).toBeUndefined();
  });

  it("keeps planning-only nodes visible but non-actionable without history mutation", () => {
    const state = createCandidateReviewStateV1("product:1:3", projection({
      proposal: { nodes: [
        projection().proposal.nodes[0]!,
        { ...projection().proposal.nodes[1]!, editable: true },
      ] },
    }));
    expect(state.decisions[secondId]).toBeUndefined();
    expect(reduceCandidateReviewStateV1(state, {
      type: "decide", nodeId: secondId, decision: "accepted",
    })).toBe(state);
    expect(reduceCandidateReviewStateV1(state, {
      type: "edit", nodeId: secondId, text: "planning edit denied",
    })).toBe(state);
    expect(state.undoStack).toEqual([]);
  });

  it("rejects edits on non-editable nodes and bounds history and text", () => {
    let state = createCandidateReviewStateV1("product:1:3", projection());
    expect(reduceCandidateReviewStateV1(state, {
      type: "edit", nodeId: secondId, text: "not allowed",
    })).toBe(state);
    expect(reduceCandidateReviewStateV1(state, {
      type: "edit", nodeId: firstId, text: "x".repeat(20_001),
    })).toBe(state);
    state = reduceCandidateReviewStateV1(state, {
      type: "decide", nodeId: firstId, decision: "accepted",
    });
    expect(reduceCandidateReviewStateV1(state, {
      type: "edit", nodeId: firstId, text: "x".repeat(20_001),
    })).toBe(state);
    expect(reduceCandidateReviewStateV1(state, {
      type: "edit", nodeId: firstId, text: "bad\rtext",
    })).toBe(state);
    for (let index = 0; index < 25; index += 1) {
      state = reduceCandidateReviewStateV1(state, {
        type: "edit", nodeId: firstId, text: `edit ${index}`,
      });
    }
    expect(state.undoStack).toHaveLength(20);
  });

  it("clears decisions, edits and history on every authority fence replacement", () => {
    let state = createCandidateReviewStateV1("product:1:3", projection());
    state = reduceCandidateReviewStateV1(state, {
      type: "decide", nodeId: firstId, decision: "accepted",
    });
    state = reduceCandidateReviewStateV1(state, {
      type: "edit", nodeId: firstId, text: "TEST changed",
    });
    for (const next of [
      { requestIdentity: "product:1:4", projection: projection() },
      { requestIdentity: "product:1:4", projection: projection({
        run: { ...projection().run, id: "20000000-0000-4000-8000-000000000002" },
      }) },
      { requestIdentity: "product:1:4", projection: projection({
        run: { ...projection().run, candidateHash: "c".repeat(64) },
      }) },
      { requestIdentity: "product:1:4", projection: projection({ projectionKey: "d".repeat(64) }) },
    ]) {
      state = reduceCandidateReviewStateV1(state, { type: "replace", ...next });
      expect(Object.values(state.decisions).every((decision) => decision === "pending")).toBe(true);
      expect(state.edits).toEqual({});
      expect(state.undoStack).toEqual([]);
    }
  });

  it("fails closed on malformed or duplicate preview identities", () => {
    const duplicate = projection({
      proposal: { nodes: [
        projection().proposal.nodes[0]!,
        { ...projection().proposal.nodes[1]!, id: firstId },
      ] },
    });
    expect(() => createAiCandidateDiffV1(duplicate)).toThrow(/invalid/i);
    const malformed = projection({
      proposal: { nodes: [{ ...projection().proposal.nodes[0]!, id: "candidate_1" }] },
    });
    expect(() => createAiCandidateDiffV1(malformed)).toThrow(/invalid/i);
  });
});
