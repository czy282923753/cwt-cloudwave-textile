"use client";

import { useEffect, useReducer, useRef, useState } from "react";

import type { DraftAssistanceAvailabilityQueryV1 } from "@/ai/applications/draft-assistance/contracts";
import {
  applyAiDraftAssistanceCandidateAction,
  cancelAiDraftAssistanceRunAction,
  enqueueAiDraftAssistanceAction,
  inspectAiDraftAssistanceAvailabilityAction,
  readAiDraftAssistanceRunAction,
  rejectAiDraftAssistanceCandidateAction,
  retryAiDraftAssistanceRunAction,
  type AiDraftAvailabilityViewV1,
  type AiDraftRunViewV1,
} from "@/admin/ai-actions";
import {
  buildApplyAiDraftCandidateV1,
  candidateNodeRequiresAnchorV1,
  createAiCandidateDiffV1,
  createCandidateReviewStateV1,
  reduceCandidateReviewStateV1,
  type CandidateReviewStateV1,
} from "@/editorial/ai-candidate-diff";

type ActorlessAvailabilityRequestV1 = Omit<DraftAssistanceAvailabilityQueryV1, "actor">;

interface PanelStateV1 {
  readonly run: AiDraftRunViewV1 | null;
  readonly availability: AiDraftAvailabilityViewV1 | null;
  readonly busy: boolean;
  readonly pollingExhausted: boolean;
  readonly feedback: string;
  readonly error: boolean;
}

type PanelEventV1 =
  | { readonly type: "reset" }
  | { readonly type: "begin"; readonly feedback: string }
  | { readonly type: "availability"; readonly value: AiDraftAvailabilityViewV1 }
  | { readonly type: "run"; readonly value: AiDraftRunViewV1 }
  | { readonly type: "failure"; readonly message: string }
  | { readonly type: "unexpected_rejection" }
  | { readonly type: "poll_exhausted" };

const unexpectedActionRejectionMessage =
  "AI assistance status is uncertain because the server response was interrupted. Ordinary manual editing is unchanged. Retry the explicit request; if a run is visible, use Refresh status first.";

const initialState: PanelStateV1 = {
  run: null,
  availability: null,
  busy: false,
  pollingExhausted: false,
  feedback: "AI assistance is idle. It never starts without an explicit request.",
  error: false,
};

function reviewStateForRun(
  current: CandidateReviewStateV1 | null,
  requestIdentity: string,
  run: AiDraftRunViewV1,
): CandidateReviewStateV1 | null {
  const projection = run.reviewProjection;
  if (projection === null) return null;
  return current === null
    ? createCandidateReviewStateV1(requestIdentity, projection)
    : reduceCandidateReviewStateV1(current, { type: "replace", requestIdentity, projection });
}

export function aiDraftAssistancePanelReducerV1(
  state: PanelStateV1,
  event: PanelEventV1,
): PanelStateV1 {
  switch (event.type) {
    case "reset": return initialState;
    case "begin": return { ...state, busy: true, error: false, feedback: event.feedback };
    case "availability": return {
      ...state,
      availability: event.value,
      busy: false,
      error: false,
      feedback: event.value.message,
    };
    case "run": return {
      ...state,
      run: event.value,
      busy: false,
      pollingExhausted: false,
      error: false,
      feedback: event.value.message,
    };
    case "failure": return {
      ...state,
      busy: false,
      pollingExhausted: true,
      error: true,
      feedback: event.message,
    };
    case "unexpected_rejection": return {
      ...state,
      busy: false,
      pollingExhausted: true,
      error: true,
      feedback: unexpectedActionRejectionMessage,
    };
    case "poll_exhausted": return {
      ...state,
      busy: false,
      pollingExhausted: true,
      feedback: "Automatic refresh stopped after its safe limit. Use Refresh status to check again.",
    };
  }
}

export interface AiDraftAssistancePanelPropsV1 {
  /** Changes only when the editor target/request scope changes. */
  readonly requestIdentity: string;
  readonly request: ActorlessAvailabilityRequestV1;
  readonly pollIntervalMs?: number;
  readonly pollingBudget?: number;
}

export function AiDraftAssistancePanel({
  requestIdentity,
  request,
  pollIntervalMs = 2_000,
  pollingBudget = 12,
}: AiDraftAssistancePanelPropsV1) {
  const boundedPollIntervalMs = Number.isFinite(pollIntervalMs)
    ? Math.min(60_000, Math.max(10, Math.trunc(pollIntervalMs))) : 2_000;
  const boundedPollingBudget = Number.isInteger(pollingBudget)
    ? Math.min(30, Math.max(1, pollingBudget)) : 12;
  const [state, dispatch] = useReducer(aiDraftAssistancePanelReducerV1, initialState);
  const [reviewState, setReviewState] = useState<CandidateReviewStateV1 | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const operationEpochRef = useRef(0);
  const pollCountRef = useRef(0);

  useEffect(() => {
    operationEpochRef.current += 1;
    idempotencyKeyRef.current = null;
    inFlightRef.current = false;
    pollCountRef.current = 0;
    dispatch({ type: "reset" });
  }, [requestIdentity]);

  useEffect(() => () => {
    operationEpochRef.current += 1;
    inFlightRef.current = false;
  }, []);

  useEffect(() => {
    const run = state.run;
    if (run === null || state.busy || state.pollingExhausted ||
      (run.status !== "pending" && run.status !== "processing")) return;
    if (pollCountRef.current >= boundedPollingBudget) {
      dispatch({ type: "poll_exhausted" });
      return;
    }
    const epoch = operationEpochRef.current;
    const timer = window.setTimeout(() => {
      pollCountRef.current += 1;
      void readAiDraftAssistanceRunAction({ runId: run.runId }).then(
        (result) => {
          if (epoch !== operationEpochRef.current) return;
          if (result.ok) {
            dispatch({ type: "run", value: result.value });
            setReviewState((current) => reviewStateForRun(
              current, requestIdentity, result.value,
            ));
            if (pollCountRef.current >= boundedPollingBudget &&
              (result.value.status === "pending" || result.value.status === "processing")) {
              dispatch({ type: "poll_exhausted" });
            }
          } else dispatch({ type: "failure", message: result.message });
        },
        () => {
          if (epoch === operationEpochRef.current) dispatch({ type: "unexpected_rejection" });
        },
      );
    }, boundedPollIntervalMs);
    return () => window.clearTimeout(timer);
  }, [
    boundedPollIntervalMs,
    boundedPollingBudget,
    requestIdentity,
    state.busy,
    state.pollingExhausted,
    state.run,
  ]);

  async function exclusive(
    feedback: string,
    operation: (epoch: number) => Promise<void>,
  ): Promise<void> {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const epoch = operationEpochRef.current + 1;
    operationEpochRef.current = epoch;
    dispatch({ type: "begin", feedback });
    try {
      await operation(epoch);
    } catch {
      if (operationEpochRef.current === epoch) dispatch({ type: "unexpected_rejection" });
    } finally {
      if (operationEpochRef.current === epoch) inFlightRef.current = false;
    }
  }

  function acceptRun(epoch: number, result: Awaited<ReturnType<typeof readAiDraftAssistanceRunAction>>): void {
    if (epoch !== operationEpochRef.current) return;
    if (result.ok) {
      dispatch({ type: "run", value: result.value });
      setReviewState((current) => reviewStateForRun(current, requestIdentity, result.value));
    } else dispatch({ type: "failure", message: result.message });
  }

  const inspectAvailability = () => exclusive("Checking AI availability…", async (epoch) => {
    const result = await inspectAiDraftAssistanceAvailabilityAction(request);
    if (epoch !== operationEpochRef.current) return;
    if (result.ok) dispatch({ type: "availability", value: result.value });
    else dispatch({ type: "failure", message: result.message });
  });

  const enqueue = () => exclusive("Submitting explicit AI draft request…", async (epoch) => {
    const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = idempotencyKey;
    pollCountRef.current = 0;
    acceptRun(epoch, await enqueueAiDraftAssistanceAction({ ...request, idempotencyKey }));
  });

  const refresh = () => exclusive("Refreshing AI draft status…", async (epoch) => {
    if (state.run === null) return;
    pollCountRef.current = 0;
    acceptRun(epoch, await readAiDraftAssistanceRunAction({ runId: state.run.runId }));
  });

  const cancel = () => exclusive("Requesting safe cancellation…", async (epoch) => {
    if (state.run === null) return;
    acceptRun(epoch, await cancelAiDraftAssistanceRunAction({
      runId: state.run.runId,
      stateVersion: state.run.stateVersion,
    }));
  });

  const retry = () => exclusive("Requesting authorized manual retry…", async (epoch) => {
    if (state.run === null) return;
    pollCountRef.current = 0;
    acceptRun(epoch, await retryAiDraftAssistanceRunAction({
      runId: state.run.runId,
      stateVersion: state.run.stateVersion,
    }));
  });

  const reject = () => exclusive("Rejecting the whole AI candidate…", async (epoch) => {
    if (state.run?.candidateHash === null || state.run?.candidateHash === undefined) return;
    acceptRun(epoch, await rejectAiDraftAssistanceCandidateAction({
      runId: state.run.runId,
      stateVersion: state.run.stateVersion,
      candidateHash: state.run.candidateHash,
      qualityRating: null,
      qualityLabels: [],
      qualityComment: null,
    }));
  });

  const apply = () => exclusive("Applying the reviewed AI candidate atomically…", async (epoch) => {
    if (state.run?.reviewProjection === null || state.run?.reviewProjection === undefined ||
      reviewState === null || !state.run.applyAvailable) return;
    const command = buildApplyAiDraftCandidateV1(state.run.reviewProjection, reviewState);
    if (command === null) {
      if (epoch === operationEpochRef.current) dispatch({
        type: "failure",
        message: "Decide every applicable proposal and choose each required insertion boundary before Apply.",
      });
      return;
    }
    acceptRun(epoch, await applyAiDraftAssistanceCandidateAction(command));
  });

  const startNewRequest = (): void => {
    operationEpochRef.current += 1;
    idempotencyKeyRef.current = null;
    inFlightRef.current = false;
    pollCountRef.current = 0;
    dispatch({ type: "reset" });
  };

  const terminal = state.run !== null &&
    (state.run.status === "draft_ready" || state.run.status === "failed" ||
      state.run.status === "cancelled");

  return (
    <section aria-labelledby="ai-draft-assistance-heading" className="space-y-4 rounded-xl border border-slate-700 p-4">
      <div>
        <h2 className="text-lg font-semibold" id="ai-draft-assistance-heading">AI draft assistance</h2>
        <p className="mt-1 text-sm text-slate-300">
          AI creates a protected candidate only. Apply is explicit and updates only the authorized Draft;
          it never autosaves or publishes content.
        </p>
      </div>

      <p aria-live="polite" role={state.error ? "alert" : "status"}>{state.feedback}</p>

      {state.run?.reviewProjection !== null && state.run?.reviewProjection !== undefined &&
      reviewState !== null ? (() => {
        const view = createAiCandidateDiffV1(state.run.reviewProjection);
        return (
          <div aria-label="Protected AI candidate review" className="space-y-4">
            <p className="text-sm text-slate-300">
              This preview is local and non-authoritative. Locked existing Blocks remain unchanged.
            </p>
            <div aria-label="Current document before AI proposal" className="space-y-2">
              <h3 className="font-medium">Current document — before</h3>
              {view.beforeDocument.length === 0 ? <p>No existing document Blocks.</p> :
                view.beforeDocument.map((node) => (
                  <div aria-disabled={node.locked} className="rounded border border-slate-700 p-2" key={node.id}>
                    <strong>{node.kind.replaceAll("_", " ")}</strong>
                    <p>Lock state: {node.locked ? "Locked" : "Unlocked"}</p>
                    {node.text.map((text, index) => <p key={`${node.id}:${index}`}>{text}</p>)}
                  </div>
                ))}
            </div>
            <div aria-label="AI proposal after view" className="space-y-3">
              <h3 className="font-medium">AI proposal — after preview</h3>
              {view.proposalNodes.map((node) => {
                const decision = reviewState.decisions[node.id];
                return (
                  <article className="rounded border border-slate-700 p-3" key={node.id}>
                    <h3 className="font-medium">{node.label}</h3>
                    {node.beforeText !== null ? <p>Before: {node.beforeText}</p> : null}
                    <p>Proposal: {reviewState.edits[node.id] ?? node.proposedText}</p>
                    {node.previewOnly ? <p>Planning preview only</p> : null}
                    {!node.previewOnly && decision !== undefined ? <>
                      <p>Local decision: {decision}</p>
                      <div className="flex flex-wrap gap-2">
                        <button disabled={state.busy} onClick={() => setReviewState((current) =>
                          current === null ? current : reduceCandidateReviewStateV1(current, {
                            type: "decide", nodeId: node.id, decision: "accepted",
                          }))} type="button">Accept locally</button>
                        <button disabled={state.busy} onClick={() => setReviewState((current) =>
                          current === null ? current : reduceCandidateReviewStateV1(current, {
                            type: "decide", nodeId: node.id, decision: "rejected",
                          }))} type="button">Reject locally</button>
                      </div>
                    </> : null}
                    {!node.previewOnly && node.editable && decision === "accepted" ? (
                      <label>
                        Local preview edit
                        <textarea
                          onChange={(event) => {
                            const text = event.currentTarget.value;
                            setReviewState((current) => current === null
                              ? current : reduceCandidateReviewStateV1(current, {
                                  type: "edit", nodeId: node.id, text,
                                }));
                          }}
                          value={reviewState.edits[node.id] ?? node.proposedText}
                        />
                      </label>
                    ) : null}
                    {decision === "accepted" && candidateNodeRequiresAnchorV1(node) ? (
                      <label>
                        Insert after
                        <select
                          disabled={state.busy}
                          onChange={(event) => {
                            const blockId = event.currentTarget.value;
                            setReviewState((current) => current === null ? current
                              : reduceCandidateReviewStateV1(current, {
                                  type: "anchor",
                                  nodeId: node.id,
                                  blockId: blockId === "__start__" ? null : blockId,
                                }));
                          }}
                          value={Object.prototype.hasOwnProperty.call(reviewState.anchors, node.id)
                            ? reviewState.anchors[node.id] ?? "__start__" : ""}
                        >
                          <option disabled value="">Choose an unlocked boundary</option>
                          <option value="__start__">Start of document</option>
                          {view.beforeDocument.filter((block) => !block.locked)
                            .map((block) => <option key={block.id} value={block.id}>
                              After {block.kind.replaceAll("_", " ")} {block.id}
                            </option>)}
                        </select>
                      </label>
                    ) : null}
                  </article>
                );
              })}
            </div>
            <button disabled={reviewState.undoStack.length === 0 || state.busy}
              onClick={() => setReviewState((current) => current === null ? current
                : reduceCandidateReviewStateV1(current, { type: "undo" }))}
              type="button">Undo local review</button>
          </div>
        );
      })() : null}

      <div className="flex flex-wrap gap-2">
        {state.run === null ? (
          <>
            <button disabled={state.busy} onClick={() => void inspectAvailability()} type="button">
              Check availability
            </button>
            <button disabled={state.busy || state.availability?.available === false} onClick={() => void enqueue()} type="button">
              Generate AI draft
            </button>
          </>
        ) : null}

        {state.run?.cancelAvailable &&
        (state.run.status === "pending" || state.run.status === "processing") ? (
          <button disabled={state.busy} onClick={() => void cancel()} type="button">Cancel request</button>
        ) : null}

        {state.run?.status === "failed" && state.run.manualRetryAvailable ? (
          <button disabled={state.busy} onClick={() => void retry()} type="button">Retry AI draft</button>
        ) : null}

        {state.run?.status === "draft_ready" && state.run.rejectAvailable &&
        state.run.candidateHash !== null ? (
          <button disabled={state.busy} onClick={() => void reject()} type="button">Reject candidate</button>
        ) : null}

        {state.run?.status === "draft_ready" && state.run.applyAvailable &&
        state.run.reviewProjection !== null && reviewState !== null ? (
          <button disabled={state.busy ||
            buildApplyAiDraftCandidateV1(state.run.reviewProjection, reviewState) === null}
            onClick={() => void apply()} type="button">Apply reviewed candidate</button>
        ) : null}

        {state.pollingExhausted && state.run !== null ? (
          <button disabled={state.busy} onClick={() => void refresh()} type="button">Refresh status</button>
        ) : null}

        {terminal ? (
          <button disabled={state.busy} onClick={startNewRequest} type="button">Start a new request</button>
        ) : null}
      </div>
    </section>
  );
}
