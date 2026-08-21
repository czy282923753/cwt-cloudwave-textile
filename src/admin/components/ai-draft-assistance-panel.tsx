"use client";

import { useEffect, useReducer, useRef } from "react";

import type { DraftAssistanceAvailabilityQueryV1 } from "@/ai/applications/draft-assistance/contracts";
import {
  cancelAiDraftAssistanceRunAction,
  enqueueAiDraftAssistanceAction,
  inspectAiDraftAssistanceAvailabilityAction,
  readAiDraftAssistanceRunAction,
  rejectAiDraftAssistanceCandidateAction,
  retryAiDraftAssistanceRunAction,
  type AiDraftAvailabilityViewV1,
  type AiDraftRunViewV1,
} from "@/admin/ai-actions";

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
  | { readonly type: "poll_exhausted" };

const initialState: PanelStateV1 = {
  run: null,
  availability: null,
  busy: false,
  pollingExhausted: false,
  feedback: "AI assistance is idle. It never starts without an explicit request.",
  error: false,
};

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
      void readAiDraftAssistanceRunAction({ runId: run.runId }).then((result) => {
        if (epoch !== operationEpochRef.current) return;
        if (result.ok) {
          dispatch({ type: "run", value: result.value });
          if (pollCountRef.current >= boundedPollingBudget &&
            (result.value.status === "pending" || result.value.status === "processing")) {
            dispatch({ type: "poll_exhausted" });
          }
        } else dispatch({ type: "failure", message: result.message });
      });
    }, boundedPollIntervalMs);
    return () => window.clearTimeout(timer);
  }, [boundedPollIntervalMs, boundedPollingBudget, state.busy, state.pollingExhausted, state.run]);

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
    } finally {
      if (operationEpochRef.current === epoch) inFlightRef.current = false;
    }
  }

  function acceptRun(epoch: number, result: Awaited<ReturnType<typeof readAiDraftAssistanceRunAction>>): void {
    if (epoch !== operationEpochRef.current) return;
    if (result.ok) dispatch({ type: "run", value: result.value });
    else dispatch({ type: "failure", message: result.message });
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
          AI creates a protected candidate only. It never changes the editor or publishes content here.
        </p>
      </div>

      <p aria-live="polite" role={state.error ? "alert" : "status"}>{state.feedback}</p>

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
