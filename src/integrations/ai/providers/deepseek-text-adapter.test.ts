import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { canonicalJsonHash } from "@/ai/canonical-json";
import type { ReadonlyJsonObject } from "@/ai/canonical-json";
import type { ProviderNeutralTextRequestV1 } from "@/ai/providers/text-provider";
import {
  createDeepSeekTextProviderV1,
  DEEPSEEK_TEXT_ENDPOINT_V1,
  DEEPSEEK_TEXT_ENVELOPE_HASH_V1,
} from "./deepseek-text-adapter";

const credential = "synthetic-test-credential-01";
const request = (overrides: Partial<ProviderNeutralTextRequestV1> = {}): ProviderNeutralTextRequestV1 => ({
  version: 1,
  instructions: "Return exactly one JSON object.",
  input: "",
  responseFormat: { kind: "json_object", schemaId: "synthetic.output", schemaVersion: 1 },
  maxOutputTokens: 64,
  ...overrides,
});

const successObject = (overrides: Record<string, unknown> = {}) => ({
  id: "synthetic_request_01",
  object: "chat.completion",
  created: 1,
  model: "deepseek-v4-flash",
  system_fingerprint: "synthetic_fp_01",
  choices: [{
    index: 0,
    finish_reason: "stop",
    message: { role: "assistant", content: "{\"safe\":true}", reasoning_content: null, tool_calls: null },
    logprobs: null,
  }],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 4,
    total_tokens: 14,
    prompt_cache_hit_tokens: 6,
    prompt_cache_miss_tokens: 4,
    completion_tokens_details: { reasoning_tokens: 0 },
  },
  ...overrides,
});

function response(value: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function prepare(input: {
  readonly fetchImplementation?: typeof fetch;
  readonly credentialReader?: () => string | undefined;
  readonly parameters?: ReadonlyJsonObject;
  readonly textRequest?: ProviderNeutralTextRequestV1;
} = {}) {
  const provider = createDeepSeekTextProviderV1({
    fetchImplementation: input.fetchImplementation ?? (async () => response(successObject())),
    credentialReader: input.credentialReader ?? (() => credential),
  });
  return provider.prepareTextDispatch({
    model: "deepseek-v4-flash",
    parameters: input.parameters ?? {},
    request: input.textRequest ?? request(),
  });
}

describe("DeepSeek text adapter V1", () => {
  it("binds the reviewed envelope and conservative estimate", () => {
    const provider = createDeepSeekTextProviderV1({ credentialReader: () => credential });
    expect(provider.describeEnvelope()).toEqual({ version: 1, hash: DEEPSEEK_TEXT_ENVELOPE_HASH_V1 });
    const envelope = canonicalJsonHash({
      schema: "cwt.deepseek.text-envelope",
      version: 1,
      provider: "deepseek",
      host: "api.deepseek.com",
      path: "/chat/completions",
      model_alias: "deepseek-v4-flash",
      published_model_version: "DeepSeek-V4-Flash-0731",
      thinking: "disabled",
      stream: false,
      response_format: "json_object",
      max_input_tokens: 16000,
      max_output_tokens: 4000,
      timeout_ms: 120000,
      max_response_bytes: 1048576,
      parameter_allowlist: ["temperature", "top_p"],
    });
    expect(envelope).toMatchObject({ ok: true, value: { hash: DEEPSEEK_TEXT_ENVELOPE_HASH_V1 } });
    expect(provider.estimateInputTokens(request())).toEqual({ ok: true, value: 543 });
  });

  it.each([
    ["other", {}, "model_unsupported"],
    ["deepseek-v4-flash", { temperature: 0.5, top_p: 0.5 }, "parameters_invalid"],
    ["deepseek-v4-flash", { temperature: 2.1 }, "parameters_invalid"],
    ["deepseek-v4-flash", { top_p: -0.1 }, "parameters_invalid"],
    ["deepseek-v4-flash", { endpoint: DEEPSEEK_TEXT_ENDPOINT_V1 }, "parameters_invalid"],
  ])("rejects model/parameter drift (%s)", (model, parameters, errorCode) => {
    const provider = createDeepSeekTextProviderV1({ credentialReader: () => credential });
    const result = provider.resolveConfiguration({ model, parameters });
    expect(result).toMatchObject({ ok: false, error: { code: errorCode } });
  });

  it("reads the credential only after local request gates and emits the literal envelope", async () => {
    const reader = vi.fn(() => credential);
    const fetchImplementation = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(_url).toBe(DEEPSEEK_TEXT_ENDPOINT_V1);
      expect(init?.method).toBe("POST");
      expect(init?.redirect).toBe("manual");
      expect(init?.headers).toEqual({
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${credential}`,
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        model: "deepseek-v4-flash",
        messages: [
          { role: "system", content: "Return exactly one JSON object." },
          { role: "user", content: "" },
        ],
        thinking: { type: "disabled" },
        stream: false,
        response_format: { type: "json_object" },
        max_tokens: 64,
        temperature: 0,
      });
      return response(successObject());
    });
    const provider = createDeepSeekTextProviderV1({ fetchImplementation, credentialReader: reader });
    expect(reader).not.toHaveBeenCalled();
    const invalid = provider.prepareTextDispatch({
      model: "deepseek-v4-flash", parameters: {}, request: request({ instructions: "plain text" }),
    });
    expect(invalid).toMatchObject({ ok: false, error: { code: "prompt_contract_mismatch" } });
    expect(reader).not.toHaveBeenCalled();
    const prepared = provider.prepareTextDispatch({
      model: "deepseek-v4-flash", parameters: { temperature: 0 }, request: request(),
    });
    expect(prepared.ok).toBe(true);
    expect(reader).toHaveBeenCalledTimes(1);
    if (!prepared.ok) return;
    expect(fetchImplementation).not.toHaveBeenCalled();
    const result = await prepared.value.execute({ signal: new AbortController().signal });
    expect(result).toMatchObject({
      kind: "success",
      returnedModel: "deepseek-v4-flash",
      providerRequestId: "synthetic_request_01",
      providerSystemFingerprint: "synthetic_fp_01",
      usage: {
        inputTokens: 10,
        outputTokens: 4,
        totalTokens: 14,
        cacheHitInputTokens: 6,
        cacheMissInputTokens: 4,
      },
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    const second = await prepared.value.execute({ signal: new AbortController().signal });
    expect(second).toMatchObject({ kind: "failure", retryClass: "not_retryable" });
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it.each([
    [undefined, "provider_auth_failed"],
    ["short", "provider_auth_failed"],
    [` ${credential}`, "provider_auth_failed"],
    [`${credential}\n`, "provider_auth_failed"],
  ])("fails closed for an unavailable or invalid credential", (value, code) => {
    const fetchImplementation = vi.fn<typeof fetch>();
    const prepared = prepare({ fetchImplementation, credentialReader: () => value });
    expect(prepared).toMatchObject({ ok: false, error: { code } });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it.each([
    [400, "client_error", "client", "not_retryable"],
    [408, "timeout", "timeout", "same_provider_transient"],
    [403, "client_error", "client", "not_retryable"],
    [404, "client_error", "client", "not_retryable"],
    [409, "client_error", "client", "not_retryable"],
    [429, "rate_limited", "rate_limited", "same_provider_transient"],
    [500, "server_error", "server", "same_provider_transient"],
    [401, "client_error", "authentication", "not_retryable"],
    [402, "quota_exceeded", "quota_exceeded", "not_retryable"],
    [422, "client_error", "client", "not_retryable"],
    [302, "unknown", "unknown", "not_retryable"],
    [204, "unknown", "unknown", "not_retryable"],
  ])("classifies HTTP %i without adapter retry", async (status, responseStatus, failureCode, retryClass) => {
    const prepared = prepare({ fetchImplementation: async () => new Response(null, { status }) });
    if (!prepared.ok) throw new Error("preparation failed");
    const result = await prepared.value.execute({ signal: new AbortController().signal });
    expect(result).toMatchObject({ kind: "failure", responseStatus, failureCode, retryClass, httpStatus: status });
  });

  it("rejects redirects before reading Location, headers or body", async () => {
    const redirect = { status: 302 };
    Object.defineProperties(redirect, {
      headers: { get: () => { throw new Error("headers must not be read"); } },
      body: { get: () => { throw new Error("body must not be read"); } },
    });
    const prepared = prepare({ fetchImplementation: async () => redirect as Response });
    if (!prepared.ok) throw new Error("preparation failed");
    expect(await prepared.value.execute({ signal: new AbortController().signal })).toMatchObject({
      kind: "failure", responseStatus: "unknown", failureCode: "unknown", httpStatus: 302,
    });
  });

  it.each([
    [successObject({ service_tier: "default" })],
    [successObject({ unknown: true })],
    [successObject({ choices: [{
      index: 0, finish_reason: "stop",
      message: { role: "assistant", content: "{}", reasoning_content: "private" },
    }] })],
    [successObject({ usage: {
      prompt_tokens: 10, completion_tokens: 4, total_tokens: 14,
      prompt_cache_hit_tokens: 5, prompt_cache_miss_tokens: 4,
    } })],
    [successObject({ choices: [{
      index: 0, finish_reason: "tool_calls",
      message: { role: "assistant", content: "{}", tool_calls: [{ id: "synthetic_tool" }] },
    }] })],
    [successObject({ choices: [successObject().choices[0], successObject().choices[0]] })],
    [successObject({ choices: [{
      index: 0, finish_reason: "future_finish_reason",
      message: { role: "assistant", content: "{}" },
    }] })],
  ])("rejects unknown, reasoning, tool and usage drift", async (body) => {
    const prepared = prepare({ fetchImplementation: async () => response(body) });
    if (!prepared.ok) throw new Error("preparation failed");
    const result = await prepared.value.execute({ signal: new AbortController().signal });
    expect(result).toMatchObject({ kind: "failure", failureCode: "invalid_response_schema", retryClass: "not_retryable" });
  });

  it("classifies malformed, empty, oversized and transport bodies", async () => {
    const cases: readonly [Response, string, string][] = [
      [new Response(" ", { status: 200, headers: { "content-type": "application/json" } }), "empty_response", "not_retryable"],
      [new Response("{", { status: 200, headers: { "content-type": "application/json" } }), "invalid_response_json", "not_retryable"],
      [new Response('{"id":"one","id":"two"}', { status: 200, headers: { "content-type": "application/json" } }), "invalid_response_json", "not_retryable"],
      [new Response(new Uint8Array([0xff]), { status: 200, headers: { "content-type": "application/json" } }), "invalid_response_json", "not_retryable"],
      [new Response("x".repeat(1_048_577), { status: 200, headers: { "content-type": "application/json" } }), "response_too_large", "not_retryable"],
    ];
    for (const [httpResponse, failureCode, retryClass] of cases) {
      const prepared = prepare({ fetchImplementation: async () => httpResponse });
      if (!prepared.ok) throw new Error("preparation failed");
      const result = await prepared.value.execute({ signal: new AbortController().signal });
      expect(result).toMatchObject({ kind: "failure", failureCode, retryClass });
    }
    const prepared = prepare({ fetchImplementation: async () => { throw new TypeError("synthetic transport"); } });
    if (!prepared.ok) throw new Error("preparation failed");
    expect(await prepared.value.execute({ signal: new AbortController().signal })).toMatchObject({
      kind: "failure", failureCode: "transport", retryClass: "same_provider_transient",
    });
  });

  it("classifies a partial body read failure as transient transport", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"id":"partial"'));
        controller.error(new Error("synthetic partial read"));
      },
    });
    const prepared = prepare({
      fetchImplementation: async () => new Response(body, {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    });
    if (!prepared.ok) throw new Error("preparation failed");
    expect(await prepared.value.execute({ signal: new AbortController().signal })).toMatchObject({
      kind: "failure", failureCode: "transport", retryClass: "same_provider_transient",
    });
  });

  it("owns one total deadline and maps it to a transient timeout", async () => {
    vi.useFakeTimers();
    try {
      const prepared = prepare({
        fetchImplementation: async (_url, init) => new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("synthetic deadline")), { once: true });
        }),
      });
      if (!prepared.ok) throw new Error("preparation failed");
      const execution = prepared.value.execute({ signal: new AbortController().signal });
      await vi.advanceTimersByTimeAsync(120_000);
      expect(await execution).toMatchObject({
        kind: "failure", failureCode: "timeout", retryClass: "same_provider_transient",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ["length", "length_limit"],
    ["content_filter", "content_filter"],
  ])("normalizes the %s finish reason", async (finishReason, completionKind) => {
    const prepared = prepare({ fetchImplementation: async () => response(successObject({
      choices: [{
        index: 0,
        finish_reason: finishReason,
        message: { role: "assistant", content: "{}" },
      }],
    })) });
    if (!prepared.ok) throw new Error("preparation failed");
    expect(await prepared.value.execute({ signal: new AbortController().signal })).toMatchObject({
      kind: "success", completion: { kind: completionKind },
    });
  });

  it("maps insufficient system resources to a transient server failure", async () => {
    const prepared = prepare({ fetchImplementation: async () => response(successObject({
      choices: [{
        index: 0,
        finish_reason: "insufficient_system_resource",
        message: { role: "assistant", content: "{}" },
      }],
    })) });
    if (!prepared.ok) throw new Error("preparation failed");
    expect(await prepared.value.execute({ signal: new AbortController().signal })).toMatchObject({
      kind: "failure", failureCode: "server", retryClass: "same_provider_transient",
    });
  });

  it("performs no fetch when the caller is already aborted", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    const prepared = prepare({ fetchImplementation });
    if (!prepared.ok) throw new Error("preparation failed");
    const controller = new AbortController();
    controller.abort("synthetic_cancel");
    expect(await prepared.value.execute({ signal: controller.signal })).toMatchObject({
      kind: "failure", responseStatus: "cancelled_no_response", retryClass: "not_retryable",
    });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });
});
