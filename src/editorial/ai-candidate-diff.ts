import type {
  AiDraftReviewProjectionV1,
  ReviewCurrentNodeV1,
  ReviewProposalNodeV1,
} from "@/ai/applications/draft-assistance/contracts";

export type CandidateDecisionV1 = "pending" | "accepted" | "rejected";

interface CandidateReviewSnapshotV1 {
  readonly decisions: Readonly<Record<string, CandidateDecisionV1>>;
  readonly edits: Readonly<Record<string, string>>;
}

export interface CandidateReviewStateV1 extends CandidateReviewSnapshotV1 {
  readonly requestIdentity: string;
  readonly runId: string;
  readonly candidateHash: string;
  readonly projectionKey: string;
  readonly actionableNodeIds: readonly string[];
  readonly editableNodeIds: readonly string[];
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
    candidateHash: projection.run.candidateHash,
    projectionKey: projection.projectionKey,
    actionableNodeIds: actionableNodes.map((node) => node.id),
    editableNodeIds: actionableNodes.filter((node) => node.editable).map((node) => node.id),
    decisions: Object.freeze(Object.fromEntries(
      actionableNodes.map((node) => [node.id, "pending" as CandidateDecisionV1]),
    )),
    edits: Object.freeze({}),
    undoStack: Object.freeze([]),
  };
}

function withHistory(
  state: CandidateReviewStateV1,
  next: CandidateReviewSnapshotV1,
): CandidateReviewStateV1 {
  const undoStack = [
    ...state.undoStack,
    { decisions: state.decisions, edits: state.edits },
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
        state.candidateHash === event.projection.run.candidateHash &&
        state.projectionKey === event.projection.projectionKey) return state;
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
      });
    case "edit":
      if (!state.editableNodeIds.includes(event.nodeId) ||
        state.decisions[event.nodeId] !== "accepted" ||
        Array.from(event.text).length > MAX_EDIT_SCALARS || event.text.includes("\r") ||
        state.edits[event.nodeId] === event.text) return state;
      return withHistory(state, {
        decisions: state.decisions,
        edits: Object.freeze({ ...state.edits, [event.nodeId]: event.text }),
      });
    case "undo": {
      const previous = state.undoStack.at(-1);
      return previous === undefined ? state : {
        ...state,
        decisions: previous.decisions,
        edits: previous.edits,
        undoStack: state.undoStack.slice(0, -1),
      };
    }
  }
}
