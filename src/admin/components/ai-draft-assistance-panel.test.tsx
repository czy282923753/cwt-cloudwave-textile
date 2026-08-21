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
  const promise = new Promise<T>((accept) => { resolve = accept; });
  return { promise, resolve };
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
