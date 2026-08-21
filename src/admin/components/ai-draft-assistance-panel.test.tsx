// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  availability: vi.fn(),
  enqueue: vi.fn(),
  read: vi.fn(),
  cancel: vi.fn(),
  retry: vi.fn(),
  reject: vi.fn(),
}));

vi.mock("@/admin/ai-actions", () => ({
  inspectAiDraftAssistanceAvailabilityAction: actions.availability,
  enqueueAiDraftAssistanceAction: actions.enqueue,
  readAiDraftAssistanceRunAction: actions.read,
  cancelAiDraftAssistanceRunAction: actions.cancel,
  retryAiDraftAssistanceRunAction: actions.retry,
  rejectAiDraftAssistanceCandidateAction: actions.reject,
}));

import { AiDraftAssistancePanel } from "./ai-draft-assistance-panel";

const runId = "30000000-0000-4000-8000-000000000003";
const candidateHash = "a".repeat(64);
const unexpectedRejectionMessage =
  "AI assistance status is uncertain because the server response was interrupted. Ordinary manual editing is unchanged. Retry the explicit request; if a run is visible, use Refresh status first.";

const request = {
  useCase: "product_description_draft" as const,
  task: {
    kind: "product_description_draft" as const,
    tone: "concise_professional_b2b" as const,
    selectedMediaPlacementIds: [],
  },
  target: {
    type: "product_draft" as const,
    productId: "20000000-0000-4000-8000-000000000002",
    locale: "en" as const,
    expectedVersion: 3,
  },
  contextSelections: [{
    sourceClass: "explicit_human_input" as const,
    origin: "operator_selected_target_text" as const,
  }],
};

function run(
  status: "pending" | "processing" | "draft_ready" | "failed" | "cancelled",
  overrides: Record<string, unknown> = {},
) {
  return {
    runId,
    useCase: "product_description_draft",
    status,
    stateVersion: 4,
    queuedAt: "2026-01-01T00:00:00.000Z",
    candidateHash: status === "draft_ready" ? candidateHash : null,
    candidate: status === "draft_ready" ? { version: 1, sections: [] } : null,
    disposition: "not_evaluated",
    cancelAvailable: status === "pending" || status === "processing",
    manualRetryAvailable: false,
    rejectAvailable: status === "draft_ready",
    message: {
      pending: "AI draft request queued.",
      processing: "AI draft processing.",
      draft_ready: "AI draft candidate ready for review.",
      failed: "AI draft failed safely.",
      cancelled: "AI draft request cancelled.",
    }[status],
    ...overrides,
  };
}

function ok(value: unknown) {
  return { ok: true, value } as const;
}

function failure(message = "AI assistance is unavailable.") {
  return { ok: false, code: "unavailable", message, manualEditorAvailable: true } as const;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, reject, resolve };
}

describe("AI draft assistance five-state panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      "40000000-0000-4000-8000-000000000004",
    );
    actions.availability.mockResolvedValue(ok({
      available: true,
      manualEditorAvailable: true,
      message: "AI draft assistance is available.",
    }));
    actions.enqueue.mockResolvedValue(ok(run("pending")));
    actions.read.mockResolvedValue(ok(run("pending")));
    actions.cancel.mockResolvedValue(ok(run("cancelled", { stateVersion: 5, cancelAvailable: false })));
    actions.retry.mockResolvedValue(ok(run("pending", { stateVersion: 5 })));
    actions.reject.mockResolvedValue(ok(run("draft_ready", {
      stateVersion: 5,
      disposition: "rejected",
      candidateHash: null,
      candidate: null,
      rejectAvailable: false,
      message: "AI draft candidate rejected.",
    })));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("never inspects or enqueues on mount, request replacement, or ordinary render", () => {
    const rendered = render(
      <AiDraftAssistancePanel request={request} requestIdentity="product:1:3" />,
    );
    expect(actions.availability).not.toHaveBeenCalled();
    expect(actions.enqueue).not.toHaveBeenCalled();
    rendered.rerender(
      <AiDraftAssistancePanel request={{ ...request, target: { ...request.target, expectedVersion: 4 } }} requestIdentity="product:1:4" />,
    );
    expect(actions.availability).not.toHaveBeenCalled();
    expect(actions.enqueue).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /apply|undo|save/i })).toBeNull();
  });

  it("checks availability separately and enqueues only after explicit Generate", async () => {
    render(<AiDraftAssistancePanel request={request} requestIdentity="product:1:3" />);
    fireEvent.click(screen.getByRole("button", { name: "Check availability" }));
    expect(await screen.findByText("AI draft assistance is available.")).toBeInTheDocument();
    expect(actions.enqueue).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Generate AI draft" }));
    expect(await screen.findByText("AI draft request queued.")).toBeInTheDocument();
    expect(actions.enqueue).toHaveBeenCalledTimes(1);
  });

  it("retains one UUID for safe resubmission and blocks duplicate in-flight requests", async () => {
    actions.enqueue.mockResolvedValueOnce(failure()).mockResolvedValueOnce(ok(run("pending")));
    render(<AiDraftAssistancePanel request={request} requestIdentity="product:1:3" />);
    fireEvent.click(screen.getByRole("button", { name: "Generate AI draft" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Generate AI draft" }));
    await screen.findByText("AI draft request queued.");
    expect(actions.enqueue).toHaveBeenCalledTimes(2);
    const first = actions.enqueue.mock.calls[0]?.[0];
    const second = actions.enqueue.mock.calls[1]?.[0];
    expect(first.idempotencyKey).toBe(second.idempotencyKey);

    actions.enqueue.mockClear();
    const pending = deferred<ReturnType<typeof ok>>();
    actions.enqueue.mockReturnValueOnce(pending.promise);
    fireEvent.click(screen.getByRole("button", { name: "Cancel request" }));
    await screen.findByText("AI draft request cancelled.");
    fireEvent.click(screen.getByRole("button", { name: "Start a new request" }));
    const generate = screen.getByRole("button", { name: "Generate AI draft" });
    fireEvent.click(generate);
    fireEvent.click(generate);
    expect(actions.enqueue).toHaveBeenCalledTimes(1);
    pending.resolve(ok(run("pending")));
    await screen.findByText("AI draft request queued.");
  });

  it("catches a rejected enqueue, releases busy, and reuses the ambiguous request UUID", async () => {
    actions.enqueue
      .mockRejectedValueOnce(new Error("RAW database host and stack must never render"))
      .mockResolvedValueOnce(ok(run("pending")));
    render(<AiDraftAssistancePanel request={request} requestIdentity="product:rejected-enqueue" />);

    fireEvent.click(screen.getByRole("button", { name: "Generate AI draft" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(unexpectedRejectionMessage);
    expect(screen.queryByText(/RAW database host|stack must never render/)).toBeNull();
    const generate = screen.getByRole("button", { name: "Generate AI draft" });
    expect(generate).toBeEnabled();
    fireEvent.click(generate);
    await screen.findByText("AI draft request queued.");

    expect(actions.enqueue).toHaveBeenCalledTimes(2);
    expect(actions.enqueue.mock.calls[0]?.[0].idempotencyKey)
      .toBe(actions.enqueue.mock.calls[1]?.[0].idempotencyKey);
  });

  it("catches a rejected availability inspection without exposing the rejected value", async () => {
    actions.availability.mockRejectedValueOnce({
      message: "RAW Secret config payload",
      stack: "RAW stack",
    });
    render(<AiDraftAssistancePanel request={request} requestIdentity="product:rejected-availability" />);
    fireEvent.click(screen.getByRole("button", { name: "Check availability" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(unexpectedRejectionMessage);
    expect(screen.queryByText(/RAW Secret|RAW stack/)).toBeNull();
    expect(screen.getByRole("button", { name: "Check availability" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Generate AI draft" })).toBeEnabled();
  });

  it("catches a rejected automatic read, stops polling, and preserves the run for Refresh", async () => {
    vi.useFakeTimers();
    actions.read.mockRejectedValueOnce(new Error("RAW polling transport detail"));
    render(
      <AiDraftAssistancePanel
        pollIntervalMs={10}
        pollingBudget={3}
        request={request}
        requestIdentity="product:rejected-poll"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Generate AI draft" }));
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });

    expect(screen.getByRole("alert")).toHaveTextContent(unexpectedRejectionMessage);
    expect(screen.queryByText(/RAW polling/)).toBeNull();
    expect(screen.getByRole("button", { name: "Cancel request" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Refresh status" })).toBeEnabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(actions.read).toHaveBeenCalledTimes(1);
  });

  it("preserves run fences across rejected cancel and refresh for authoritative recovery", async () => {
    actions.cancel.mockRejectedValueOnce(new Error("RAW cancel uncertainty"));
    actions.read
      .mockRejectedValueOnce(new Error("RAW refresh uncertainty"))
      .mockResolvedValueOnce(ok(run("cancelled", { stateVersion: 5, cancelAvailable: false })));
    render(<AiDraftAssistancePanel request={request} requestIdentity="product:rejected-cancel" />);
    fireEvent.click(screen.getByRole("button", { name: "Generate AI draft" }));
    await screen.findByText("AI draft request queued.");

    fireEvent.click(screen.getByRole("button", { name: "Cancel request" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(unexpectedRejectionMessage);
    expect(actions.cancel).toHaveBeenCalledWith({ runId, stateVersion: 4 });
    expect(actions.cancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Cancel request" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Refresh status" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Refresh status" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(unexpectedRejectionMessage);
    expect(actions.read).toHaveBeenCalledTimes(1);
    expect(actions.cancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Refresh status" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Refresh status" }));
    await screen.findByText("AI draft request cancelled.");
    expect(actions.read).toHaveBeenCalledTimes(2);
    expect(actions.cancel).toHaveBeenCalledTimes(1);
  });

  it("preserves the failed run and exact retry fence when manual Retry rejects", async () => {
    actions.enqueue.mockResolvedValueOnce(ok(run("failed", { manualRetryAvailable: true })));
    actions.retry.mockRejectedValueOnce(new Error("RAW retry detail"));
    actions.read.mockResolvedValueOnce(ok(run("pending", { stateVersion: 5 })));
    render(<AiDraftAssistancePanel request={request} requestIdentity="product:rejected-retry" />);
    fireEvent.click(screen.getByRole("button", { name: "Generate AI draft" }));
    await screen.findByText("AI draft failed safely.");

    fireEvent.click(screen.getByRole("button", { name: "Retry AI draft" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(unexpectedRejectionMessage);
    expect(actions.retry).toHaveBeenCalledWith({ runId, stateVersion: 4 });
    expect(actions.retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Retry AI draft" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Refresh status" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Refresh status" }));
    await screen.findByText("AI draft request queued.");
    expect(actions.retry).toHaveBeenCalledTimes(1);
  });

  it("preserves candidate hash and rejection fence when Reject rejects", async () => {
    actions.enqueue.mockResolvedValueOnce(ok(run("draft_ready")));
    actions.reject.mockRejectedValueOnce(new Error("RAW rejected candidate detail"));
    render(<AiDraftAssistancePanel request={request} requestIdentity="product:rejected-disposition" />);
    fireEvent.click(screen.getByRole("button", { name: "Generate AI draft" }));
    await screen.findByText("AI draft candidate ready for review.");

    fireEvent.click(screen.getByRole("button", { name: "Reject candidate" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(unexpectedRejectionMessage);
    expect(actions.reject).toHaveBeenCalledWith({
      runId,
      stateVersion: 4,
      candidateHash,
      qualityRating: null,
      qualityLabels: [],
      qualityComment: null,
    });
    expect(actions.reject).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Reject candidate" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Refresh status" })).toBeEnabled();
  });

  it("ignores stale rejected and resolved actions after identity replacement and unmount", async () => {
    const staleRejection = deferred<ReturnType<typeof ok>>();
    actions.availability.mockReturnValueOnce(staleRejection.promise);
    const rendered = render(
      <AiDraftAssistancePanel request={request} requestIdentity="product:old" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Check availability" }));
    rendered.rerender(
      <AiDraftAssistancePanel request={request} requestIdentity="product:new" />,
    );
    staleRejection.reject(new Error("RAW stale rejection"));
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole("status")).toHaveTextContent(/idle/i);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/RAW stale/)).toBeNull();

    const staleResolution = deferred<ReturnType<typeof ok>>();
    actions.enqueue.mockReturnValueOnce(staleResolution.promise);
    fireEvent.click(screen.getByRole("button", { name: "Generate AI draft" }));
    rendered.unmount();
    staleResolution.resolve(ok(run("draft_ready")));
    await act(async () => { await Promise.resolve(); });

    const staleUnmountRejection = deferred<ReturnType<typeof ok>>();
    actions.availability.mockReturnValueOnce(staleUnmountRejection.promise);
    const second = render(
      <AiDraftAssistancePanel request={request} requestIdentity="product:unmount" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Check availability" }));
    second.unmount();
    staleUnmountRejection.reject(new Error("RAW unmounted rejection"));
    await act(async () => { await Promise.resolve(); });
  });

  it("polls only active states with a fixed budget and cleans up on replacement", async () => {
    vi.useFakeTimers();
    const rendered = render(
      <AiDraftAssistancePanel request={request} requestIdentity="product:1:3" pollIntervalMs={10} pollingBudget={2} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Generate AI draft" }));
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    await act(async () => { await Promise.resolve(); });
    expect(actions.read).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Refresh status" })).toBeInTheDocument();

    actions.read.mockClear();
    rendered.rerender(
      <AiDraftAssistancePanel request={request} requestIdentity="product:1:4" pollIntervalMs={10} pollingBudget={2} />,
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(actions.read).not.toHaveBeenCalled();
    rendered.unmount();
  });

  it.each([
    ["pending", "AI draft request queued."],
    ["processing", "AI draft processing."],
    ["draft_ready", "AI draft candidate ready for review."],
    ["failed", "AI draft failed safely."],
    ["cancelled", "AI draft request cancelled."],
  ] as const)("renders the %s lifecycle state", async (status, message) => {
    actions.enqueue.mockResolvedValueOnce(ok(run(status)));
    render(<AiDraftAssistancePanel request={request} requestIdentity={`product:1:${status}`} />);
    fireEvent.click(screen.getByRole("button", { name: "Generate AI draft" }));
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("uses authoritative controls and exact lifecycle fences", async () => {
    const first = render(
      <AiDraftAssistancePanel request={request} requestIdentity="pending" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Generate AI draft" }));
    await screen.findByText("AI draft request queued.");
    fireEvent.click(screen.getByRole("button", { name: "Cancel request" }));
    await screen.findByText("AI draft request cancelled.");
    expect(actions.cancel).toHaveBeenCalledWith({ runId, stateVersion: 4 });
    first.unmount();

    actions.enqueue.mockResolvedValueOnce(ok(run("failed", { manualRetryAvailable: true })));
    const second = render(<AiDraftAssistancePanel request={request} requestIdentity="failed" />);
    fireEvent.click(screen.getByRole("button", { name: "Generate AI draft" }));
    await screen.findByText("AI draft failed safely.");
    fireEvent.click(screen.getByRole("button", { name: "Retry AI draft" }));
    expect(actions.retry).toHaveBeenCalledWith({ runId, stateVersion: 4 });
    second.unmount();

    actions.enqueue.mockResolvedValueOnce(ok(run("draft_ready")));
    render(<AiDraftAssistancePanel request={request} requestIdentity="ready" />);
    fireEvent.click(screen.getByRole("button", { name: "Generate AI draft" }));
    await screen.findByText("AI draft candidate ready for review.");
    fireEvent.click(screen.getByRole("button", { name: "Reject candidate" }));
    expect(actions.reject).toHaveBeenCalledWith({
      runId,
      stateVersion: 4,
      candidateHash,
      qualityRating: null,
      qualityLabels: [],
      qualityComment: null,
    });
  });

  it("ignores a late polling response after cancellation", async () => {
    vi.useFakeTimers();
    const lateRead = deferred<ReturnType<typeof ok>>();
    actions.read.mockReturnValueOnce(lateRead.promise);
    render(
      <AiDraftAssistancePanel request={request} requestIdentity="product:1:3" pollIntervalMs={10} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Generate AI draft" }));
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(actions.read).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Cancel request" }));
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText("AI draft request cancelled.")).toBeInTheDocument();
    lateRead.resolve(ok(run("draft_ready")));
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByText("AI draft candidate ready for review.")).toBeNull();
    expect(screen.getByText("AI draft request cancelled.")).toBeInTheDocument();
  });
});
