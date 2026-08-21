import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  createService: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth/current-user", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock("@/server/ai/phase-d-provider-composition", () => ({
  createPhaseDServerAiServiceV1: mocks.createService,
}));

import {
  cancelAiDraftAssistanceRunAction,
  enqueueAiDraftAssistanceAction,
  inspectAiDraftAssistanceAvailabilityAction,
  readAiDraftAssistanceRunAction,
  rejectAiDraftAssistanceCandidateAction,
  retryAiDraftAssistanceRunAction,
} from "./ai-actions";

const actorId = "10000000-0000-4000-8000-000000000001";
const productId = "20000000-0000-4000-8000-000000000002";
const runId = "30000000-0000-4000-8000-000000000003";
const idempotencyKey = "40000000-0000-4000-8000-000000000004";
const candidateHash = "a".repeat(64);
const projectionKey = "b".repeat(64);

function reviewProjection(stateVersion = 7) {
  return {
    version: 1,
    run: { id: runId, useCase: "product_description_draft", stateVersion, candidateHash },
    target: { kind: "product", locale: "en", draftVersion: 3 },
    projectionKey,
    before: {
      kind: "product",
      name: "Synthetic Textile",
      summary: null,
      document: [],
      seo: { title: null, metaDescription: null },
      mediaText: [],
    },
    proposal: {
      nodes: [{
        id: `ai_${"c".repeat(60)}`,
        path: "payload.descriptionBlocks[0]",
        ordinal: 1,
        kind: "block",
        label: "Description block 1",
        proposedText: "Synthetic candidate",
        beforeText: null,
        details: [],
        editable: true,
        previewOnly: true,
      }],
    },
  } as const;
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    useCase: "product_description_draft",
    task: {
      kind: "product_description_draft",
      tone: "concise_professional_b2b",
      selectedMediaPlacementIds: [],
    },
    target: { type: "product_draft", productId, locale: "en", expectedVersion: 3 },
    idempotencyKey,
    contextSelections: [{ sourceClass: "explicit_human_input", origin: "operator_selected_target_text" }],
    ...overrides,
  };
}

function authorizedRun(overrides: Record<string, unknown> = {}) {
  return {
    runId,
    applicationClass: "draft_assistance",
    useCase: "product_description_draft",
    status: "pending",
    retryState: "none",
    attemptCount: 0,
    stateVersion: 1,
    queuedAt: "2026-01-01T00:00:00.000Z",
    targetType: "product_draft",
    targetId: productId,
    candidateHash: null,
    reviewProjection: null,
    failureCode: null,
    humanDisposition: "not_evaluated",
    qualityRating: null,
    qualityLabels: [],
    cancelAvailable: true,
    manualRetryAvailable: false,
    rejectAvailable: false,
    ...overrides,
  } as const;
}

function service() {
  return {
    inspectDraftAssistanceAvailability: vi.fn().mockResolvedValue({
      ok: true,
      value: { available: true, manualEditorAvailable: true, code: "available" },
    }),
    requestDraftAssistance: vi.fn().mockResolvedValue({
      ok: true,
      value: {
        runId,
        applicationClass: "draft_assistance",
        useCase: "product_description_draft",
        status: "pending",
        queuedAt: "2026-01-01T00:00:00.000Z",
      },
    }),
    readRun: vi.fn().mockResolvedValue({ ok: true, value: authorizedRun() }),
    cancelRun: vi.fn().mockResolvedValue({
      ok: true,
      value: authorizedRun({ status: "cancelled", stateVersion: 2, cancelAvailable: false }),
    }),
    manualRetry: vi.fn().mockResolvedValue({
      ok: true,
      value: authorizedRun({ status: "pending", retryState: "scheduled", stateVersion: 5 }),
    }),
    rejectDisposition: vi.fn().mockResolvedValue({
      ok: true,
      value: authorizedRun({
        status: "draft_ready",
        humanDisposition: "rejected",
        stateVersion: 8,
        candidateHash,
        reviewProjection: null,
        cancelAvailable: false,
      }),
    }),
  };
}

describe("Phase E AI Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue({ id: actorId, role: "product_editor" });
    mocks.createService.mockReturnValue(service());
  });

  it("uses the strict Production actorless decoder and supplies only the authenticated actor", async () => {
    const current = service();
    mocks.createService.mockReturnValue(current);
    const result = await enqueueAiDraftAssistanceAction(request());

    expect(result).toMatchObject({ ok: true, value: { runId, status: "pending" } });
    expect(current.requestDraftAssistance).toHaveBeenCalledWith(expect.objectContaining({
      actor: { userId: actorId, role: "product_editor" },
      idempotencyKey,
      task: expect.objectContaining({ kind: "product_description_draft" }),
    }));
    expect(current.readRun).toHaveBeenCalledWith({
      runId,
      actor: { userId: actorId, role: "product_editor" },
    });

    await expect(enqueueAiDraftAssistanceAction(request({
      actor: { userId: "50000000-0000-4000-8000-000000000005", role: "admin" },
    }))).resolves.toMatchObject({ ok: false, code: "invalid_request" });
    await expect(enqueueAiDraftAssistanceAction(request({
      task: { kind: "fabric_knowledge_draft", tone: "neutral_editorial", topic: "Synthetic" },
    }))).resolves.toMatchObject({ ok: false, code: "invalid_request" });
    expect(current.requestDraftAssistance).toHaveBeenCalledTimes(1);
  });

  it("rejects duplicate/bounded selectors and unknown keys before enqueue", async () => {
    const duplicate = "60000000-0000-4000-8000-000000000006";
    await expect(enqueueAiDraftAssistanceAction(request({
      task: {
        kind: "product_description_draft",
        tone: "concise_professional_b2b",
        selectedMediaPlacementIds: [duplicate, duplicate],
      },
    }))).resolves.toMatchObject({ ok: false, code: "invalid_request" });
    await expect(enqueueAiDraftAssistanceAction(request({ unexpected: true })))
      .resolves.toMatchObject({ ok: false, code: "invalid_request" });
    expect(mocks.createService).not.toHaveBeenCalled();
  });

  it("inspects availability without an idempotency key and does not enqueue", async () => {
    const current = service();
    mocks.createService.mockReturnValue(current);
    const currentRequest = request();
    const availability = {
      useCase: currentRequest.useCase,
      task: currentRequest.task,
      target: currentRequest.target,
      contextSelections: currentRequest.contextSelections,
    };
    const result = await inspectAiDraftAssistanceAvailabilityAction(availability);
    expect(result).toEqual({
      ok: true,
      value: {
        available: true,
        manualEditorAvailable: true,
        message: "AI draft assistance is available.",
      },
    });
    expect(current.requestDraftAssistance).not.toHaveBeenCalled();
    expect(current.inspectDraftAssistanceAvailability).toHaveBeenCalledWith(
      expect.objectContaining({ actor: { userId: actorId, role: "product_editor" } }),
    );
  });

  it("returns only the authorized safe run projection and suppresses internal fields", async () => {
    const current = service();
    current.readRun.mockResolvedValueOnce({
      ok: true,
      value: authorizedRun({
        status: "draft_ready",
        stateVersion: 7,
        candidateHash,
        reviewProjection: reviewProjection(),
        failureCode: "provider_auth_failed",
        rejectAvailable: true,
        cancelAvailable: false,
      }),
    });
    mocks.createService.mockReturnValue(current);
    const result = await readAiDraftAssistanceRunAction({ runId });
    expect(result).toMatchObject({
      ok: true,
      value: {
        runId,
        status: "draft_ready",
        candidateHash,
        reviewProjection: expect.objectContaining({
          version: 1,
          projectionKey,
          run: { id: runId, useCase: "product_description_draft", stateVersion: 7, candidateHash },
        }),
        rejectAvailable: true,
      },
    });
    expect(JSON.stringify(result)).not.toContain("targetId");
    expect(JSON.stringify(result)).not.toContain("targetType");
    expect(JSON.stringify(result)).not.toContain("failureCode");
    expect(JSON.stringify(result)).not.toContain("provider_auth_failed");
    expect(JSON.stringify(result)).not.toContain('"candidate"');
  });

  it("fails closed when a ready run lacks a matching server-authorized projection", async () => {
    const current = service();
    current.readRun.mockResolvedValueOnce({
      ok: true,
      value: authorizedRun({
        status: "draft_ready",
        stateVersion: 7,
        candidateHash,
        reviewProjection: null,
        rejectAvailable: true,
        cancelAvailable: false,
      }),
    });
    mocks.createService.mockReturnValue(current);
    await expect(readAiDraftAssistanceRunAction({ runId })).resolves.toEqual({
      ok: false,
      code: "unavailable",
      message: "AI assistance is unavailable. Ordinary manual editing is unchanged.",
      manualEditorAvailable: true,
    });
  });

  it("passes exact state and candidate fences to lifecycle services", async () => {
    const current = service();
    mocks.createService.mockReturnValue(current);
    await cancelAiDraftAssistanceRunAction({ runId, stateVersion: 3 });
    await retryAiDraftAssistanceRunAction({ runId, stateVersion: 4 });
    await rejectAiDraftAssistanceCandidateAction({
      runId,
      stateVersion: 7,
      candidateHash,
      qualityRating: 2,
      qualityLabels: ["factual_issue", "unsafe_claim"],
      qualityComment: "Synthetic reviewer feedback",
    });
    expect(current.cancelRun).toHaveBeenCalledWith(expect.objectContaining({
      runId,
      expectedStateVersion: 3,
      actor: { userId: actorId, role: "product_editor" },
    }));
    expect(current.manualRetry).toHaveBeenCalledWith({
      runId,
      expectedStateVersion: 4,
      actor: { userId: actorId, role: "product_editor" },
    });
    expect(current.rejectDisposition).toHaveBeenCalledWith({
      runId,
      actor: { userId: actorId, role: "product_editor" },
      expectedStateVersion: 7,
      disposition: "rejected",
      candidateHash,
      qualityRating: 2,
      qualityLabels: ["factual_issue", "unsafe_claim"],
      qualityComment: "Synthetic reviewer feedback",
    });
    const rejected = await rejectAiDraftAssistanceCandidateAction({
      runId,
      stateVersion: 7,
      candidateHash: "bad",
      qualityRating: null,
      qualityLabels: [],
      qualityComment: null,
    });
    expect(rejected).toMatchObject({ ok: false, code: "invalid_request" });
    expect(current.rejectDisposition).toHaveBeenCalledTimes(1);
  });

  it("fails closed for authorization loss and missing durable PostgreSQL", async () => {
    mocks.requireCurrentUser.mockRejectedValueOnce(new Error("Authentication required."));
    await expect(readAiDraftAssistanceRunAction({ runId })).resolves.toEqual({
      ok: false,
      code: "access_denied",
      message: "Sign in again before using AI assistance.",
      manualEditorAvailable: false,
    });
    mocks.createService.mockReturnValueOnce({
      inspectDraftAssistanceAvailability: vi.fn(),
    });
    await expect(enqueueAiDraftAssistanceAction(request())).resolves.toMatchObject({
      ok: false,
      code: "unavailable",
      manualEditorAvailable: true,
    });
  });
});
