import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { canonicalJsonHash, type ReadonlyJsonObject } from "@/ai/canonical-json";
import type { ProviderNeutralTextRequestV1 } from "@/ai/providers/text-provider";
import canonicalFixtureDocument from "../../../../test-fixtures/ai/deepseek-synthetic-contract.v1.json";
import {
  createDeepSeekTextProviderV1,
  DEEPSEEK_TEXT_ENDPOINT_V1,
  DEEPSEEK_TEXT_ENVELOPE_HASH_V1,
} from "./deepseek-text-adapter";

type FailureExpectation = Readonly<{
  failureCode: string;
  retryClass: string;
}>;

type SyntheticContractFixture = Readonly<{
  schema: string;
  version: number;
  classification: string;
  request: Readonly<{
    version: 1;
    model: string;
    parameters: ReadonlyJsonObject;
    instructions: string;
    input: string;
    responseFormat: Readonly<{
      kind: "json_object";
      schemaId: string;
      schemaVersion: number;
    }>;
    maxOutputTokens: number;
    expectedEstimatedInputTokens: number;
    expectedBody: ReadonlyJsonObject;
  }>;
  cases: Readonly<{
    configurationFailures: readonly Readonly<{
      model: string;
      parameters: ReadonlyJsonObject;
      errorCode: string;
    }>[];
    httpFailures: readonly Readonly<{
      status: number;
      expected: Readonly<{
        responseStatus: string;
        failureCode: string;
        retryClass: string;
      }>;
    }>[];
    invalidResponseMutations: readonly string[];
    bodyFailures: readonly Readonly<{
      encoding: string;
      expected: FailureExpectation;
      payload?: string;
      bytes?: readonly number[];
      byteLength?: number;
      unit?: string;
    }>[];
    partialBodyFailure: Readonly<{
      prefix: string;
      expected: FailureExpectation;
    }>;
    timeoutFailure: Readonly<{
      durationMs: number;
      expected: FailureExpectation;
    }>;
    finishReasons: readonly Readonly<{
      finishReason: string;
      completionKind: string;
    }>[];
    transportBoundaries: Readonly<{
      alreadyAborted: Readonly<{
        reason: string;
        expected: Readonly<{ responseStatus: string; retryClass: string }>;
      }>;
      insufficientResources: Readonly<{
        finishReason: string;
        expected: FailureExpectation;
      }>;
      oneShot: Readonly<{
        maximumFetchCalls: number;
        expectedSecond: Readonly<{ kind: string; retryClass: string }>;
      }>;
      redirect: Readonly<{
        maximumDestinationHits: number;
        expected: Readonly<{
          httpStatus: number;
          responseStatus: string;
          failureCode: string;
        }>;
      }>;
    }>;
    success: Readonly<{
      response: Readonly<Record<string, unknown>>;
      expected: Readonly<{
        completion: Readonly<{ kind: string }>;
        outputText: string;
        providerRequestId: string;
        providerSystemFingerprint: string;
        returnedModel: string;
        usage: Readonly<{
          inputTokens: number;
          outputTokens: number;
          totalTokens: number;
          cacheHitInputTokens: number;
          cacheMissInputTokens: number;
        }>;
      }>;
    }>;
  }>;
}>;

interface FetchCall {
  readonly input: string | URL | Request;
  readonly init: RequestInit | undefined;
}

interface ExplicitSeams {
  readonly fetchCalls: FetchCall[];
  readonly fetchImplementation: typeof fetch;
  readonly credentialReads: () => number;
  readonly credentialReader: () => string | undefined;
}

type FetchResponder = (
  input: string | URL | Request,
  init: RequestInit | undefined,
) => Response | Promise<Response>;

const fixture = canonicalFixtureDocument as SyntheticContractFixture;
const syntheticCredential = "synthetic-test-value-phase-d-01";

function requireFixture(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid Phase D synthetic fixture: ${message}`);
}

function exactKeys(value: Readonly<Record<string, unknown>>, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function configurationCaseId(testCase: SyntheticContractFixture["cases"]["configurationFailures"][number]): string {
  const keys = Object.keys(testCase.parameters).sort();
  if (testCase.model === "synthetic-unsupported-model" && keys.length === 0 &&
    testCase.errorCode === "model_unsupported") return "configuration:model-unsupported";
  if (testCase.model === fixture.request.model && JSON.stringify(keys) === JSON.stringify(["temperature", "top_p"]) &&
    testCase.parameters.temperature === 0.5 && testCase.parameters.top_p === 0.5 &&
    testCase.errorCode === "parameters_invalid") return "configuration:temperature-and-top-p";
  if (testCase.model === fixture.request.model && JSON.stringify(keys) === JSON.stringify(["temperature"]) &&
    testCase.parameters.temperature === 2.1 && testCase.errorCode === "parameters_invalid") {
    return "configuration:temperature-high";
  }
  if (testCase.model === fixture.request.model && JSON.stringify(keys) === JSON.stringify(["top_p"]) &&
    testCase.parameters.top_p === -0.1 && testCase.errorCode === "parameters_invalid") {
    return "configuration:top-p-negative";
  }
  if (testCase.model === fixture.request.model && JSON.stringify(keys) === JSON.stringify(["endpoint"]) &&
    testCase.parameters.endpoint === "synthetic-disabled-value" && testCase.errorCode === "parameters_invalid") {
    return "configuration:endpoint-parameter";
  }
  throw new Error("Unknown configuration failure combination");
}

function httpCaseId(testCase: SyntheticContractFixture["cases"]["httpFailures"][number]): string {
  switch (testCase.status) {
    case 400:
    case 408:
    case 403:
    case 404:
    case 409:
    case 429:
    case 500:
    case 401:
    case 402:
    case 422:
    case 302:
    case 204:
      return `http:${testCase.status}`;
  }
  throw new Error("Unknown HTTP failure status");
}

function mutationCaseId(mutation: string): string {
  switch (mutation) {
    case "extra_service_tier":
    case "unknown_top_level":
    case "reasoning_content":
    case "usage_totals":
    case "tool_calls":
    case "second_choice":
    case "unknown_finish_reason":
      return `invalid-response:${mutation}`;
  }
  throw new Error("Unknown invalid-response mutation name");
}

function bodyCaseId(testCase: SyntheticContractFixture["cases"]["bodyFailures"][number]): string {
  if (testCase.encoding === "empty" && testCase.payload === "") return "body:empty";
  if (testCase.encoding === "text" && testCase.payload === "{") return "body:malformed-json";
  if (testCase.encoding === "text" && testCase.payload === '{"id":"one","id":"two"}') {
    return "body:duplicate-key-json";
  }
  if (testCase.encoding === "bytes" && JSON.stringify(testCase.bytes) === "[255]") return "body:invalid-utf8";
  if (testCase.encoding === "repeated" && testCase.byteLength === 1_048_577 && testCase.unit === "x") {
    return "body:response-too-large";
  }
  if (testCase.encoding === "transport" && testCase.payload === undefined && testCase.bytes === undefined &&
    testCase.byteLength === undefined && testCase.unit === undefined) return "body:transport";
  throw new Error("Unknown body failure combination");
}

function finishCaseId(testCase: SyntheticContractFixture["cases"]["finishReasons"][number]): string {
  if (testCase.finishReason === "length" && testCase.completionKind === "length_limit") return "finish:length";
  if (testCase.finishReason === "content_filter" && testCase.completionKind === "content_filter") {
    return "finish:content_filter";
  }
  throw new Error("Unknown finish-reason combination");
}

const configurationCases = fixture.cases.configurationFailures.map((testCase) => ({
  id: configurationCaseId(testCase),
  testCase,
}));
const httpCases = fixture.cases.httpFailures.map((testCase) => ({ id: httpCaseId(testCase), testCase }));
const invalidResponseCases = fixture.cases.invalidResponseMutations.map((mutation) => ({
  id: mutationCaseId(mutation),
  mutation,
}));
const bodyCases = fixture.cases.bodyFailures.map((testCase) => ({ id: bodyCaseId(testCase), testCase }));
const finishCases = fixture.cases.finishReasons.map((testCase) => ({ id: finishCaseId(testCase), testCase }));

const expectedCaseIds = {
  configuration: [
    "configuration:model-unsupported",
    "configuration:temperature-and-top-p",
    "configuration:temperature-high",
    "configuration:top-p-negative",
    "configuration:endpoint-parameter",
  ],
  http: [
    "http:400", "http:408", "http:403", "http:404", "http:409", "http:429",
    "http:500", "http:401", "http:402", "http:422", "http:302", "http:204",
  ],
  invalidResponse: [
    "invalid-response:extra_service_tier",
    "invalid-response:unknown_top_level",
    "invalid-response:reasoning_content",
    "invalid-response:usage_totals",
    "invalid-response:tool_calls",
    "invalid-response:second_choice",
    "invalid-response:unknown_finish_reason",
  ],
  body: [
    "body:empty",
    "body:malformed-json",
    "body:duplicate-key-json",
    "body:invalid-utf8",
    "body:response-too-large",
    "body:transport",
  ],
  partialBody: ["partial-body:transport"],
  timeout: ["timeout:total-deadline"],
  finish: ["finish:length", "finish:content_filter"],
  alreadyAborted: ["transport:already-aborted"],
  insufficientResource: ["transport:insufficient-system-resource"],
  oneShot: ["transport:one-shot"],
  redirect: ["transport:redirect"],
  success: ["success:complete-normalization"],
} as const;

function fixtureTextRequest(): ProviderNeutralTextRequestV1 {
  return {
    version: fixture.request.version,
    instructions: fixture.request.instructions,
    input: fixture.request.input,
    responseFormat: {
      kind: fixture.request.responseFormat.kind,
      schemaId: fixture.request.responseFormat.schemaId,
      schemaVersion: fixture.request.responseFormat.schemaVersion,
    },
    maxOutputTokens: fixture.request.maxOutputTokens,
  };
}

function createExplicitSeams(responder: FetchResponder, credentialValue: string | undefined): ExplicitSeams {
  const fetchCalls: FetchCall[] = [];
  let credentialReadCount = 0;
  return {
    fetchCalls,
    fetchImplementation: async (input, init) => {
      fetchCalls.push({ input, init });
      return responder(input, init);
    },
    credentialReads: () => credentialReadCount,
    credentialReader: () => {
      credentialReadCount += 1;
      return credentialValue;
    },
  };
}

function providerFor(seams: ExplicitSeams) {
  return createDeepSeekTextProviderV1({
    fetchImplementation: seams.fetchImplementation,
    credentialReader: seams.credentialReader,
  });
}

function prepare(seams: ExplicitSeams) {
  return providerFor(seams).prepareTextDispatch({
    model: fixture.request.model,
    parameters: fixture.request.parameters,
    request: fixtureTextRequest(),
  });
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function expectExactRequestTuple(seams: ExplicitSeams): void {
  expect(seams.fetchCalls).toHaveLength(1);
  const call = seams.fetchCalls[0];
  if (call === undefined) throw new Error("Expected one synthetic fetch call");
  expect(call.input).toBe(DEEPSEEK_TEXT_ENDPOINT_V1);
  expect(call.init?.method).toBe("POST");
  expect(call.init?.redirect).toBe("manual");
  expect(call.init?.headers).toEqual({
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${syntheticCredential}`,
  });
  expect(String(call.init?.body)).toBe(JSON.stringify(fixture.request.expectedBody));
}

function completeResponseWithFinishReason(finishReason: string): Readonly<Record<string, unknown>> {
  const response = fixture.cases.success.response;
  const choice = (response.choices as readonly Readonly<Record<string, unknown>>[])[0];
  requireFixture(choice !== undefined, "success response choice is absent");
  return { ...response, choices: [{ ...choice, finish_reason: finishReason, message: {
    ...(choice.message as Readonly<Record<string, unknown>>),
    content: "{}",
  } }] };
}

function invalidResponse(mutation: string): Readonly<Record<string, unknown>> {
  const response = fixture.cases.success.response;
  const choices = response.choices as readonly Readonly<Record<string, unknown>>[];
  const choice = choices[0];
  requireFixture(choice !== undefined, "success response choice is absent");
  const message = choice.message as Readonly<Record<string, unknown>>;
  const usage = response.usage as Readonly<Record<string, unknown>>;
  switch (mutation) {
    case "extra_service_tier": return { ...response, service_tier: "default" };
    case "unknown_top_level": return { ...response, unknown: true };
    case "reasoning_content": return {
      ...response,
      choices: [{ ...choice, message: { ...message, reasoning_content: "private" } }],
    };
    case "usage_totals": return { ...response, usage: { ...usage, prompt_cache_hit_tokens: 5 } };
    case "tool_calls": return {
      ...response,
      choices: [{ ...choice, message: { ...message, tool_calls: [{ id: "synthetic_tool" }] } }],
    };
    case "second_choice": return { ...response, choices: [choice, choice] };
    case "unknown_finish_reason": return {
      ...response,
      choices: [{ ...choice, finish_reason: "future_finish_reason" }],
    };
  }
  throw new Error("Unknown invalid-response mutation name");
}

function bodyFailureResponse(testCase: SyntheticContractFixture["cases"]["bodyFailures"][number]): Response {
  switch (testCase.encoding) {
    case "empty":
    case "text":
      requireFixture(testCase.payload !== undefined, "text body payload is absent");
      return new Response(testCase.payload, { status: 200, headers: { "content-type": "application/json" } });
    case "bytes":
      requireFixture(testCase.bytes !== undefined, "byte body payload is absent");
      return new Response(new Uint8Array(testCase.bytes), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    case "repeated":
      requireFixture(testCase.byteLength !== undefined && testCase.unit !== undefined,
        "repeated body fields are absent");
      return new Response(testCase.unit.repeat(testCase.byteLength), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
  }
  throw new Error("Transport body failure has no Response object");
}

requireFixture(fixture.schema === "cwt.phase-d.deepseek-synthetic-contract", "schema mismatch");
requireFixture(fixture.version === 1, "version mismatch");
requireFixture(fixture.classification === "SYNTHETIC_TEST_DATA_NOT_CWT_FACT", "classification mismatch");
requireFixture(fixture.request.version === 1 && fixture.request.model === "deepseek-v4-flash",
  "request identity mismatch");
requireFixture(exactKeys(fixture.request.parameters, ["temperature"]) && fixture.request.parameters.temperature === 0,
  "request parameters are not explicit temperature zero");
requireFixture(fixture.request.expectedBody.temperature === 0 &&
  JSON.stringify(fixture.request.expectedBody.thinking) === JSON.stringify({ type: "disabled" }),
  "expected body lacks explicit temperature or disabled thinking");
requireFixture(fixture.request.expectedEstimatedInputTokens === 543, "token estimate mismatch");
requireFixture(fixture.cases.partialBodyFailure.prefix === '{"id":"partial"', "partial body mismatch");
requireFixture(fixture.cases.timeoutFailure.durationMs === 120_000, "timeout duration mismatch");
requireFixture(fixture.cases.transportBoundaries.alreadyAborted.reason === "synthetic_cancel",
  "already-aborted reason mismatch");
requireFixture(fixture.cases.transportBoundaries.insufficientResources.finishReason ===
  "insufficient_system_resource", "insufficient-resource finish reason mismatch");
requireFixture(fixture.cases.transportBoundaries.oneShot.maximumFetchCalls === 1, "one-shot maximum mismatch");
requireFixture(fixture.cases.transportBoundaries.redirect.maximumDestinationHits === 0 &&
  fixture.cases.transportBoundaries.redirect.expected.httpStatus === 302, "redirect boundary mismatch");
requireFixture(fixture.cases.success.expected.providerRequestId === "synthetic_response_01",
  "success identity mismatch");

describe("DeepSeek Phase D synthetic contract V1", () => {
  it("binds the exact fixture identity, group order, total cardinality, and unique case IDs", () => {
    const observedGroups = {
      configuration: configurationCases.map((entry) => entry.id),
      http: httpCases.map((entry) => entry.id),
      invalidResponse: invalidResponseCases.map((entry) => entry.id),
      body: bodyCases.map((entry) => entry.id),
      partialBody: ["partial-body:transport"],
      timeout: ["timeout:total-deadline"],
      finish: finishCases.map((entry) => entry.id),
      alreadyAborted: ["transport:already-aborted"],
      insufficientResource: ["transport:insufficient-system-resource"],
      oneShot: ["transport:one-shot"],
      redirect: ["transport:redirect"],
      success: ["success:complete-normalization"],
    };
    expect(observedGroups).toEqual(expectedCaseIds);
    const allIds = Object.values(observedGroups).flat();
    expect(allIds).toHaveLength(39);
    expect(new Set(allIds).size).toBe(39);
    expect(Object.fromEntries(Object.entries(observedGroups).map(([group, ids]) => [group, ids.length])))
      .toEqual({
        configuration: 5,
        http: 12,
        invalidResponse: 7,
        body: 6,
        partialBody: 1,
        timeout: 1,
        finish: 2,
        alreadyAborted: 1,
        insufficientResource: 1,
        oneShot: 1,
        redirect: 1,
        success: 1,
      });
  });

  it("preserves the reviewed envelope and fixture-owned 543-token estimate", () => {
    const seams = createExplicitSeams(() => jsonResponse(fixture.cases.success.response), syntheticCredential);
    const provider = providerFor(seams);
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
    expect(provider.estimateInputTokens(fixtureTextRequest())).toEqual({
      ok: true,
      value: fixture.request.expectedEstimatedInputTokens,
    });
    expect(seams.credentialReads()).toBe(0);
    expect(seams.fetchCalls).toHaveLength(0);
  });

  it.each(configurationCases)("registers $id exactly once", ({ testCase }) => {
    const seams = createExplicitSeams(() => jsonResponse(fixture.cases.success.response), syntheticCredential);
    const result = providerFor(seams).resolveConfiguration({
      model: testCase.model,
      parameters: testCase.parameters,
    });
    expect(result).toMatchObject({ ok: false, error: { code: testCase.errorCode } });
    expect(seams.credentialReads()).toBe(0);
    expect(seams.fetchCalls).toHaveLength(0);
  });

  it("rejects Prompt mismatch before credential read or fetch", () => {
    const seams = createExplicitSeams(() => jsonResponse(fixture.cases.success.response), syntheticCredential);
    const request = fixtureTextRequest();
    const result = providerFor(seams).prepareTextDispatch({
      model: fixture.request.model,
      parameters: fixture.request.parameters,
      request: { ...request, instructions: "plain text" },
    });
    expect(result).toMatchObject({ ok: false, error: { code: "prompt_contract_mismatch" } });
    expect(seams.credentialReads()).toBe(0);
    expect(seams.fetchCalls).toHaveLength(0);
  });

  it.each([
    { label: "undefined", value: undefined },
    { label: "short", value: "short" },
    { label: "leading-space", value: ` ${syntheticCredential}` },
    { label: "trailing-lf", value: `${syntheticCredential}\n` },
  ])("fails closed for explicit invalid credential $label", ({ value }) => {
    const seams = createExplicitSeams(() => jsonResponse(fixture.cases.success.response), value);
    const result = prepare(seams);
    expect(result).toMatchObject({ ok: false, error: { code: "provider_auth_failed" } });
    expect(seams.credentialReads()).toBe(1);
    expect(seams.fetchCalls).toHaveLength(0);
  });

  it.each(httpCases)("registers $id exactly once", async ({ testCase }) => {
    const seams = createExplicitSeams(() => new Response(null, { status: testCase.status }), syntheticCredential);
    const prepared = prepare(seams);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) throw new Error("Synthetic HTTP case preparation failed");
    expect(seams.credentialReads()).toBe(1);
    expect(seams.fetchCalls).toHaveLength(0);
    const result = await prepared.value.execute({ signal: new AbortController().signal });
    expect(result).toMatchObject({
      kind: "failure",
      httpStatus: testCase.status,
      responseStatus: testCase.expected.responseStatus,
      failureCode: testCase.expected.failureCode,
      retryClass: testCase.expected.retryClass,
    });
    expect(seams.credentialReads()).toBe(1);
    expectExactRequestTuple(seams);
  });

  it.each(invalidResponseCases)("registers $id exactly once", async ({ mutation }) => {
    const seams = createExplicitSeams(() => jsonResponse(invalidResponse(mutation)), syntheticCredential);
    const prepared = prepare(seams);
    if (!prepared.ok) throw new Error("Synthetic invalid-response case preparation failed");
    const result = await prepared.value.execute({ signal: new AbortController().signal });
    expect(result).toMatchObject({
      kind: "failure",
      responseStatus: "invalid_response",
      failureCode: "invalid_response_schema",
      retryClass: "not_retryable",
    });
    expect(seams.credentialReads()).toBe(1);
    expectExactRequestTuple(seams);
  });

  it.each(bodyCases)("registers $id exactly once", async ({ testCase }) => {
    const responder: FetchResponder = testCase.encoding === "transport"
      ? () => { throw new TypeError("synthetic transport"); }
      : () => bodyFailureResponse(testCase);
    const seams = createExplicitSeams(responder, syntheticCredential);
    const prepared = prepare(seams);
    if (!prepared.ok) throw new Error("Synthetic body case preparation failed");
    const result = await prepared.value.execute({ signal: new AbortController().signal });
    expect(result).toMatchObject({
      kind: "failure",
      failureCode: testCase.expected.failureCode,
      retryClass: testCase.expected.retryClass,
    });
    if (testCase.encoding === "transport") {
      expect(result).toMatchObject({ responseStatus: "transport_error" });
    } else {
      expect(result).toMatchObject({ responseStatus: "invalid_response", httpStatus: 200 });
    }
    expect(seams.credentialReads()).toBe(1);
    expectExactRequestTuple(seams);
  });

  it("registers partial-body:transport exactly once", async () => {
    const testCase = fixture.cases.partialBodyFailure;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(testCase.prefix));
        controller.error(new Error("synthetic partial read"));
      },
    });
    const seams = createExplicitSeams(() => new Response(body, {
      status: 200,
      headers: { "content-type": "application/json" },
    }), syntheticCredential);
    const prepared = prepare(seams);
    if (!prepared.ok) throw new Error("Synthetic partial-body case preparation failed");
    const result = await prepared.value.execute({ signal: new AbortController().signal });
    expect(result).toMatchObject({
      kind: "failure",
      responseStatus: "transport_error",
      failureCode: testCase.expected.failureCode,
      retryClass: testCase.expected.retryClass,
      httpStatus: 200,
    });
    expect(seams.credentialReads()).toBe(1);
    expectExactRequestTuple(seams);
  });

  it("registers timeout:total-deadline exactly once", async () => {
    const testCase = fixture.cases.timeoutFailure;
    vi.useFakeTimers();
    try {
      const seams = createExplicitSeams((_input, init) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("synthetic deadline")), { once: true });
      }), syntheticCredential);
      const prepared = prepare(seams);
      if (!prepared.ok) throw new Error("Synthetic timeout case preparation failed");
      const execution = prepared.value.execute({ signal: new AbortController().signal });
      await vi.advanceTimersByTimeAsync(testCase.durationMs);
      const result = await execution;
      expect(result).toMatchObject({
        kind: "failure",
        responseStatus: "timeout",
        failureCode: testCase.expected.failureCode,
        retryClass: testCase.expected.retryClass,
      });
      expect(Number.isFinite(result.durationMs)).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(seams.credentialReads()).toBe(1);
      expectExactRequestTuple(seams);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(finishCases)("registers $id exactly once", async ({ testCase }) => {
    const seams = createExplicitSeams(
      () => jsonResponse(completeResponseWithFinishReason(testCase.finishReason)),
      syntheticCredential,
    );
    const prepared = prepare(seams);
    if (!prepared.ok) throw new Error("Synthetic finish-reason case preparation failed");
    const result = await prepared.value.execute({ signal: new AbortController().signal });
    expect(result).toMatchObject({
      kind: "success",
      returnedModel: fixture.request.model,
      completion: { kind: testCase.completionKind },
      outputText: "{}",
      providerRequestId: fixture.cases.success.expected.providerRequestId,
    });
    expect(seams.credentialReads()).toBe(1);
    expectExactRequestTuple(seams);
  });

  it("registers transport:already-aborted exactly once", async () => {
    const testCase = fixture.cases.transportBoundaries.alreadyAborted;
    let destinationHits = 0;
    const seams = createExplicitSeams(() => {
      destinationHits += 1;
      return jsonResponse(fixture.cases.success.response);
    }, syntheticCredential);
    const prepared = prepare(seams);
    if (!prepared.ok) throw new Error("Synthetic already-aborted case preparation failed");
    const controller = new AbortController();
    controller.abort(testCase.reason);
    const result = await prepared.value.execute({ signal: controller.signal });
    expect(result).toMatchObject({
      kind: "failure",
      responseStatus: testCase.expected.responseStatus,
      failureCode: "client",
      retryClass: testCase.expected.retryClass,
    });
    expect(seams.credentialReads()).toBe(1);
    expect(seams.fetchCalls).toHaveLength(0);
    expect(destinationHits).toBe(0);
  });

  it("registers transport:insufficient-system-resource exactly once", async () => {
    const testCase = fixture.cases.transportBoundaries.insufficientResources;
    const seams = createExplicitSeams(
      () => jsonResponse(completeResponseWithFinishReason(testCase.finishReason)),
      syntheticCredential,
    );
    const prepared = prepare(seams);
    if (!prepared.ok) throw new Error("Synthetic insufficient-resource case preparation failed");
    const result = await prepared.value.execute({ signal: new AbortController().signal });
    expect(result).toMatchObject({
      kind: "failure",
      responseStatus: "server_error",
      failureCode: testCase.expected.failureCode,
      retryClass: testCase.expected.retryClass,
      providerRequestId: fixture.cases.success.expected.providerRequestId,
      returnedModel: fixture.request.model,
    });
    expect(seams.credentialReads()).toBe(1);
    expectExactRequestTuple(seams);
  });

  it("registers transport:one-shot exactly once", async () => {
    const testCase = fixture.cases.transportBoundaries.oneShot;
    const seams = createExplicitSeams(() => jsonResponse(fixture.cases.success.response), syntheticCredential);
    const prepared = prepare(seams);
    if (!prepared.ok) throw new Error("Synthetic one-shot case preparation failed");
    expect(seams.credentialReads()).toBe(1);
    expect(seams.fetchCalls).toHaveLength(0);
    const first = await prepared.value.execute({ signal: new AbortController().signal });
    expect(first).toMatchObject({ kind: "success", ...fixture.cases.success.expected });
    const second = await prepared.value.execute({ signal: new AbortController().signal });
    expect(second).toMatchObject(testCase.expectedSecond);
    expect(second).toMatchObject({ failureCode: "unknown", responseStatus: "unknown" });
    expect(seams.credentialReads()).toBe(1);
    expect(seams.fetchCalls).toHaveLength(testCase.maximumFetchCalls);
    expectExactRequestTuple(seams);
  });

  it("registers transport:redirect exactly once", async () => {
    const testCase = fixture.cases.transportBoundaries.redirect;
    const destinationHits = 0;
    const redirect = { status: testCase.expected.httpStatus };
    Object.defineProperties(redirect, {
      headers: { get: () => { throw new Error("redirect headers must not be read"); } },
      body: { get: () => { throw new Error("redirect body must not be read"); } },
    });
    const seams = createExplicitSeams(() => redirect as Response, syntheticCredential);
    const prepared = prepare(seams);
    if (!prepared.ok) throw new Error("Synthetic redirect case preparation failed");
    const result = await prepared.value.execute({ signal: new AbortController().signal });
    expect(result).toMatchObject({
      kind: "failure",
      httpStatus: testCase.expected.httpStatus,
      responseStatus: testCase.expected.responseStatus,
      failureCode: testCase.expected.failureCode,
      retryClass: "not_retryable",
    });
    expect(seams.credentialReads()).toBe(1);
    expect(destinationHits).toBe(testCase.maximumDestinationHits);
    expectExactRequestTuple(seams);
  });

  it("registers success:complete-normalization exactly once", async () => {
    const testCase = fixture.cases.success;
    const seams = createExplicitSeams(() => jsonResponse(testCase.response), syntheticCredential);
    const prepared = prepare(seams);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) throw new Error("Synthetic success case preparation failed");
    expect(seams.credentialReads()).toBe(1);
    expect(seams.fetchCalls).toHaveLength(0);
    const result = await prepared.value.execute({ signal: new AbortController().signal });
    expect(result).toMatchObject({ kind: "success", ...testCase.expected });
    expect(seams.credentialReads()).toBe(1);
    expectExactRequestTuple(seams);
  });
});
