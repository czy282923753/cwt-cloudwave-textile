import type {
  ApplyAiDraftCandidateV1,
  AiDraftReviewProjectionV1,
  AiQualityLabelV1,
  ReviewCurrentNodeV1,
  ReviewProposalNodeV1,
} from "@/ai/applications/draft-assistance/contracts";

export type CandidateDecisionV1 = "pending" | "accepted" | "rejected";

interface CandidateReviewSnapshotV1 {
  readonly decisions: Readonly<Record<string, CandidateDecisionV1>>;
  readonly edits: Readonly<Record<string, string>>;
  readonly anchors: Readonly<Record<string, string | null>>;
}

export interface CandidateReviewStateV1 extends CandidateReviewSnapshotV1 {
  readonly requestIdentity: string;
  readonly runId: string;
  readonly runStateVersion: number;
  readonly candidateHash: string;
  readonly projectionKey: string;
  readonly targetDraftVersion: number;
  readonly targetRevisionId: string | null;
  readonly actionableNodeIds: readonly string[];
  readonly editableNodeIds: readonly string[];
  readonly anchorNodeIds: readonly string[];
  readonly allowedAnchorIds: readonly string[];
  readonly undoStack: readonly CandidateReviewSnapshotV1[];
}

export type CandidateReviewEventV1 =
  | {
      readonly type: "replace";
      readonly requestIdentity: string;
      readonly projection: AiDraftReviewProjectionV1;
    }
  | {
      readonly type: "decide";
      readonly nodeId: string;
      readonly decision: CandidateDecisionV1;
    }
  | { readonly type: "edit"; readonly nodeId: string; readonly text: string }
  | { readonly type: "anchor"; readonly nodeId: string; readonly blockId: string | null }
  | { readonly type: "undo" };

export interface AiCandidateDiffV1 {
  readonly projectionKey: string;
  readonly beforeDocument: readonly ReviewCurrentNodeV1[];
  readonly proposalNodes: readonly ReviewProposalNodeV1[];
}

const MAX_UNDO = 20;
const MAX_EDIT_SCALARS = 20_000;

function allProposalNodes(
  projection: AiDraftReviewProjectionV1,
): readonly ReviewProposalNodeV1[] {
  return [
    ...(projection.proposal.seo?.title ? [projection.proposal.seo.title] : []),
    ...(projection.proposal.seo?.metaDescription
      ? [projection.proposal.seo.metaDescription] : []),
    ...projection.proposal.nodes,
  ];
}

export function createAiCandidateDiffV1(
  projection: AiDraftReviewProjectionV1,
): AiCandidateDiffV1 {
  const proposalNodes = allProposalNodes(projection);
  const ids = new Set<string>();
  for (const node of proposalNodes) {
    if (!/^ai_[0-9a-f]{60}$/.test(node.id) || ids.has(node.id)) {
      throw new Error("The authorized AI review projection is invalid.");
    }
    ids.add(node.id);
  }
  return {
    projectionKey: projection.projectionKey,
    beforeDocument: projection.before.document,
    proposalNodes,
  };
}

export function createCandidateReviewStateV1(
  requestIdentity: string,
  projection: AiDraftReviewProjectionV1,
): CandidateReviewStateV1 {
  const nodes = createAiCandidateDiffV1(projection).proposalNodes;
  const actionableNodes = nodes.filter((node) => !node.previewOnly);
  return {
    requestIdentity,
    runId: projection.run.id,
    runStateVersion: projection.run.stateVersion,
    candidateHash: projection.run.candidateHash,
    projectionKey: projection.projectionKey,
    targetDraftVersion: projection.target.draftVersion,
    targetRevisionId: projection.target.revisionId,
    actionableNodeIds: actionableNodes.map((node) => node.id),
    editableNodeIds: actionableNodes.filter((node) => node.editable).map((node) => node.id),
    anchorNodeIds: actionableNodes.filter((node) =>
      node.kind === "block" || node.kind === "feature" || node.kind === "faq").map((node) => node.id),
    allowedAnchorIds: projection.before.document.filter((node) => !node.locked).map((node) => node.id),
    decisions: Object.freeze(Object.fromEntries(
      actionableNodes.map((node) => [node.id, "pending" as CandidateDecisionV1]),
    )),
    edits: Object.freeze({}),
    anchors: Object.freeze({}),
    undoStack: Object.freeze([]),
  };
}

function withHistory(
  state: CandidateReviewStateV1,
  next: CandidateReviewSnapshotV1,
): CandidateReviewStateV1 {
  const undoStack = [
    ...state.undoStack,
    { decisions: state.decisions, edits: state.edits, anchors: state.anchors },
  ].slice(-MAX_UNDO);
  return { ...state, ...next, undoStack };
}

export function reduceCandidateReviewStateV1(
  state: CandidateReviewStateV1,
  event: CandidateReviewEventV1,
): CandidateReviewStateV1 {
  switch (event.type) {
    case "replace":
      if (state.requestIdentity === event.requestIdentity &&
        state.runId === event.projection.run.id &&
        state.runStateVersion === event.projection.run.stateVersion &&
        state.candidateHash === event.projection.run.candidateHash &&
        state.projectionKey === event.projection.projectionKey &&
        state.targetDraftVersion === event.projection.target.draftVersion &&
        state.targetRevisionId === event.projection.target.revisionId) return state;
      return createCandidateReviewStateV1(event.requestIdentity, event.projection);
    case "decide":
      if (!state.actionableNodeIds.includes(event.nodeId)) return state;
      if (state.decisions[event.nodeId] === event.decision &&
        (event.decision === "accepted" || state.edits[event.nodeId] === undefined)) return state;
      return withHistory(state, {
        decisions: Object.freeze({ ...state.decisions, [event.nodeId]: event.decision }),
        edits: event.decision === "accepted" ? state.edits : Object.freeze(Object.fromEntries(
          Object.entries(state.edits).filter(([nodeId]) => nodeId !== event.nodeId),
        )),
        anchors: event.decision === "accepted" ? state.anchors : Object.freeze(Object.fromEntries(
          Object.entries(state.anchors).filter(([nodeId]) => nodeId !== event.nodeId),
        )),
      });
    case "edit":
      if (!state.editableNodeIds.includes(event.nodeId) ||
        state.decisions[event.nodeId] !== "accepted" ||
        Array.from(event.text).length > MAX_EDIT_SCALARS || event.text.includes("\r") ||
        state.edits[event.nodeId] === event.text) return state;
      return withHistory(state, {
        decisions: state.decisions,
        edits: Object.freeze({ ...state.edits, [event.nodeId]: event.text }),
        anchors: state.anchors,
      });
    case "anchor":
      if (!state.anchorNodeIds.includes(event.nodeId) ||
        state.decisions[event.nodeId] !== "accepted" ||
        event.blockId !== null && !state.allowedAnchorIds.includes(event.blockId) ||
        Object.prototype.hasOwnProperty.call(state.anchors, event.nodeId) &&
          state.anchors[event.nodeId] === event.blockId) return state;
      return withHistory(state, {
        decisions: state.decisions,
        edits: state.edits,
        anchors: Object.freeze({ ...state.anchors, [event.nodeId]: event.blockId }),
      });
    case "undo": {
      const previous = state.undoStack.at(-1);
      return previous === undefined ? state : {
        ...state,
        decisions: previous.decisions,
        edits: previous.edits,
        anchors: previous.anchors,
        undoStack: state.undoStack.slice(0, -1),
      };
    }
  }
}

export function candidateNodeRequiresAnchorV1(node: ReviewProposalNodeV1): boolean {
  return !node.previewOnly &&
    (node.kind === "block" || node.kind === "feature" || node.kind === "faq");
}

export function buildApplyAiDraftCandidateV1(
  projection: AiDraftReviewProjectionV1,
  state: CandidateReviewStateV1,
  quality: {
    readonly rating: 1 | 2 | 3 | 4 | 5 | null;
    readonly labels: readonly AiQualityLabelV1[];
    readonly comment: string | null;
  } = { rating: null, labels: [], comment: null },
): ApplyAiDraftCandidateV1 | null {
  if (state.runId !== projection.run.id ||
    state.runStateVersion !== projection.run.stateVersion ||
    state.candidateHash !== projection.run.candidateHash ||
    state.projectionKey !== projection.projectionKey ||
    state.targetDraftVersion !== projection.target.draftVersion ||
    state.targetRevisionId !== projection.target.revisionId) return null;
  const nodes = allProposalNodes(projection).filter((node) => !node.previewOnly);
  if (nodes.length === 0 || nodes.length !== state.actionableNodeIds.length ||
    nodes.some((node, index) => node.id !== state.actionableNodeIds[index] ||
      state.decisions[node.id] === undefined || state.decisions[node.id] === "pending")) return null;
  const decisions: ApplyAiDraftCandidateV1["decisions"] = [];
  for (const node of nodes) {
    const decision = state.decisions[node.id];
    if (decision !== "accepted" && decision !== "rejected") return null;
    const requiresAnchor = candidateNodeRequiresAnchorV1(node);
    if (decision === "accepted" && requiresAnchor &&
      !Object.prototype.hasOwnProperty.call(state.anchors, node.id)) return null;
    const edited = state.edits[node.id];
    decisions.push({
      candidatePath: node.path,
      decision,
      ...(decision === "accepted" && edited !== undefined && edited !== node.proposedText
        ? { editedText: edited } : {}),
      ...(decision === "accepted" && requiresAnchor
        ? { insertAfterBlockId: state.anchors[node.id] ?? null } : {}),
    });
  }
  return {
    runId: projection.run.id,
    expectedRunStateVersion: projection.run.stateVersion,
    candidateHash: projection.run.candidateHash,
    expectedTargetVersion: projection.target.draftVersion,
    expectedRevisionId: projection.target.revisionId,
    expectedRevisionDraftVersion: projection.target.revisionId === null
      ? null : projection.target.draftVersion,
    decisions,
    qualityRating: quality.rating,
    qualityLabels: [...quality.labels],
    qualityComment: quality.comment,
  };
}
