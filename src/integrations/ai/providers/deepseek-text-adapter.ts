import "server-only";

import { canonicalizeJson, type ReadonlyJsonObject } from "@/ai/canonical-json";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";
import type {
  NormalizedCompletionV1,
  NormalizedProviderResponseStatus,
  NormalizedTokenUsageV2,
  PreparedTextDispatchV1,
  ProviderNeutralFailureCode,
  ProviderNeutralTextRequestV1,
  ProviderTextResultV2,
  ResolvedAdapterConfigurationV1,
  TextAiProvider,
} from "@/ai/providers/text-provider";

export const DEEPSEEK_TEXT_PROVIDER_KEY_V1 = "deepseek";
export const DEEPSEEK_TEXT_MODEL_ALIAS_V1 = "deepseek-v4-flash";
export const DEEPSEEK_TEXT_ENDPOINT_V1 = "https://api.deepseek.com/chat/completions";
export const DEEPSEEK_TEXT_ENVELOPE_HASH_V1 =
  "28bdd2cedf963e65a817103fc41b5c0e636fff110938c590e6d80aedb6d68a0e";

const MAX_INPUT_TOKENS = 16_000;
const MAX_OUTPUT_TOKENS = 4_000;
const MAX_RESPONSE_BYTES = 1_048_576;
const TIMEOUT_MS = 120_000;

type FetchImplementation = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface DeepSeekTextAdapterTestSeamsV1 {
  readonly fetchImplementation?: FetchImplementation;
  readonly credentialReader?: () => string | undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], required: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.every((key) => allowed.includes(key)) && required.every((key) => keys.includes(key));
}

function safeIdentifier(value: unknown, maximumBytes = 256): value is string {
  return typeof value === "string" && value.length > 0 && value === value.trim() &&
    Buffer.byteLength(value, "utf8") <= maximumBytes && !/[\u0000-\u001f\u007f]/u.test(value);
}

function safeToken(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function requestIsValid(request: ProviderNeutralTextRequestV1): boolean {
  if (request.version !== 1 || request.responseFormat.kind !== "json_object" ||
    !Number.isSafeInteger(request.responseFormat.schemaVersion) || request.responseFormat.schemaVersion < 1 ||
    !safeIdentifier(request.responseFormat.schemaId) ||
    typeof request.instructions !== "string" || request.instructions.length === 0 ||
    typeof request.input !== "string" ||
    !request.instructions.toLowerCase().includes("json") ||
    !Number.isSafeInteger(request.maxOutputTokens) || request.maxOutputTokens < 1 ||
    request.maxOutputTokens > MAX_OUTPUT_TOKENS) return false;
  const estimate = Buffer.byteLength(request.instructions, "utf8") +
    Buffer.byteLength(request.input, "utf8") + 512;
  return Number.isSafeInteger(estimate) && estimate <= MAX_INPUT_TOKENS;
}

function failure(input: {
  readonly responseStatus: NormalizedProviderResponseStatus;
  readonly failureCode: ProviderNeutralFailureCode;
  readonly retryClass: "same_provider_transient" | "not_retryable";
  readonly durationMs: number;
  readonly httpStatus?: number;
  readonly providerErrorCode?: string;
  readonly providerRequestId?: string;
  readonly returnedModel?: string;
}): ProviderTextResultV2 {
  return { kind: "failure", ...input };
}

async function boundedBody(response: Response): Promise<
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly kind: "too_large" | "transport" | "invalid_utf8" }
> {
  if (response.body === null) return { ok: true, text: "" };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return { ok: false, kind: "too_large" };
      }
      chunks.push(part.value);
    }
  } catch {
    return { ok: false, kind: "transport" };
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, kind: "invalid_utf8" };
  }
}

function hasDuplicateObjectKey(document: string): boolean | undefined {
  let index = 0;
  const whitespace = (): void => {
    while (index < document.length && /[\x20\t\r\n]/u.test(document[index] ?? "")) index += 1;
  };
  const stringToken = (): string | undefined => {
    if (document[index] !== '"') return undefined;
    const start = index;
    index += 1;
    while (index < document.length) {
      const character = document[index];
      if (character === '"') {
        index += 1;
        try {
          const value: unknown = JSON.parse(document.slice(start, index));
          return typeof value === "string" ? value : undefined;
        } catch {
          return undefined;
        }
      }
      if (character === "\\") index += 2;
      else index += 1;
    }
    return undefined;
  };
  const value = (): boolean | undefined => {
    whitespace();
    if (document[index] === "{") return object();
    if (document[index] === "[") return array();
    if (document[index] === '"') return stringToken() === undefined ? undefined : false;
    const token = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u.exec(
      document.slice(index),
    )?.[0];
    if (token === undefined) return undefined;
    index += token.length;
    return false;
  };
  const array = (): boolean | undefined => {
    index += 1;
    whitespace();
    if (document[index] === "]") { index += 1; return false; }
    while (index < document.length) {
      const duplicate = value();
      if (duplicate === undefined || duplicate) return duplicate;
      whitespace();
      if (document[index] === "]") { index += 1; return false; }
      if (document[index] !== ",") return undefined;
      index += 1;
    }
    return undefined;
  };
  const object = (): boolean | undefined => {
    index += 1;
    const keys = new Set<string>();
    whitespace();
    if (document[index] === "}") { index += 1; return false; }
    while (index < document.length) {
      whitespace();
      const key = stringToken();
      if (key === undefined) return undefined;
      if (keys.has(key)) return true;
      keys.add(key);
      whitespace();
      if (document[index] !== ":") return undefined;
      index += 1;
      const duplicate = value();
      if (duplicate === undefined || duplicate) return duplicate;
      whitespace();
      if (document[index] === "}") { index += 1; return false; }
      if (document[index] !== ",") return undefined;
      index += 1;
    }
    return undefined;
  };
  const duplicate = value();
  whitespace();
  return duplicate === undefined || index !== document.length ? undefined : duplicate;
}

function parseOneJsonDocument(text: string): unknown | undefined {
  const document = text.trim();
  if (document.length === 0) return undefined;
  try {
    const value: unknown = JSON.parse(document);
    return hasDuplicateObjectKey(document) === false ? value : undefined;
  } catch {
    return undefined;
  }
}

type ResponseSchemaDiagnosticCode =
  | "cwt_response_content_type"
  | "cwt_response_top_level_shape"
  | "cwt_response_identity_shape"
  | "cwt_response_choice_shape"
  | "cwt_response_message_shape"
  | "cwt_response_finish_reason";

function normalizeSuccess(input: {
  readonly value: unknown;
  readonly requestedModel: string;
  readonly requestedMaxOutputTokens: number;
  readonly durationMs: number;
}): ProviderTextResultV2 {
  const invalid = (providerErrorCode: ResponseSchemaDiagnosticCode, returnedModel?: string) => failure({
    responseStatus: "invalid_response",
    failureCode: "invalid_response_schema",
    retryClass: "not_retryable",
    providerErrorCode,
    durationMs: input.durationMs,
    ...(returnedModel === undefined ? {} : { returnedModel }),
  });
  if (!isPlainObject(input.value) || !exactKeys(input.value,
    ["id", "object", "created", "model", "system_fingerprint", "choices", "usage"],
    ["id", "model", "choices"])) return invalid("cwt_response_top_level_shape");
  const id = input.value.id;
  const returnedModel = input.value.model;
  if (!safeIdentifier(id) || !safeIdentifier(returnedModel, 128)) {
    return invalid("cwt_response_identity_shape");
  }
  const systemFingerprint = input.value.system_fingerprint;
  if (systemFingerprint !== undefined && systemFingerprint !== null &&
    !safeIdentifier(systemFingerprint)) return invalid("cwt_response_identity_shape", returnedModel);
  if (input.value.object !== undefined && input.value.object !== "chat.completion" ||
    input.value.created !== undefined && !safeToken(input.value.created)) {
    return invalid("cwt_response_identity_shape", returnedModel);
  }
  if (!Array.isArray(input.value.choices) || input.value.choices.length !== 1) {
    return invalid("cwt_response_choice_shape", returnedModel);
  }
  const choice = input.value.choices[0];
  if (!isPlainObject(choice) || !exactKeys(choice,
    ["index", "finish_reason", "message", "logprobs"],
    ["index", "finish_reason", "message"]) || choice.index !== 0 ||
    choice.logprobs !== undefined && choice.logprobs !== null) {
    return invalid("cwt_response_choice_shape", returnedModel);
  }
  const message = choice.message;
  if (!isPlainObject(message) || !exactKeys(message,
    ["role", "content", "reasoning_content", "tool_calls"], ["role", "content"]) ||
    message.role !== "assistant" || typeof message.content !== "string" ||
    message.reasoning_content !== undefined && message.reasoning_content !== null &&
      message.reasoning_content !== "" ||
    message.tool_calls !== undefined && message.tool_calls !== null &&
      (!Array.isArray(message.tool_calls) || message.tool_calls.length !== 0)) {
    return invalid("cwt_response_message_shape", returnedModel);
  }
  const usage = input.value.usage;
  let normalizedUsage: NormalizedTokenUsageV2 | undefined;
  if (isPlainObject(usage)) {
    const promptTokens = usage.prompt_tokens;
    const completionTokens = usage.completion_tokens;
    const totalTokens = usage.total_tokens;
    if (safeToken(promptTokens) && safeToken(completionTokens) && safeToken(totalTokens) &&
      promptTokens + completionTokens === totalTokens) {
      const coreUsage: NormalizedTokenUsageV2 = {
        inputTokens: promptTokens,
        outputTokens: completionTokens,
        totalTokens,
      };
      const cacheHit = usage.prompt_cache_hit_tokens;
      const cacheMiss = usage.prompt_cache_miss_tokens;
      normalizedUsage = safeToken(cacheHit) && safeToken(cacheMiss) &&
        cacheHit + cacheMiss === promptTokens
        ? { ...coreUsage, cacheHitInputTokens: cacheHit, cacheMissInputTokens: cacheMiss }
        : coreUsage;
    }
  }
  if (choice.finish_reason === "insufficient_system_resource") {
    return failure({
      responseStatus: "server_error",
      failureCode: "server",
      retryClass: "same_provider_transient",
      providerRequestId: id,
      returnedModel,
      durationMs: input.durationMs,
    });
  }
  let completion: NormalizedCompletionV1;
  switch (choice.finish_reason) {
    case "stop": completion = { kind: "complete" }; break;
    case "length": completion = { kind: "length_limit" }; break;
    case "content_filter": completion = { kind: "content_filter" }; break;
    default: return invalid("cwt_response_finish_reason", returnedModel);
  }
  if (message.content.length === 0) {
    return failure({
      responseStatus: "invalid_response",
      failureCode: "empty_response",
      retryClass: "not_retryable",
      providerRequestId: id,
      returnedModel,
      durationMs: input.durationMs,
    });
  }
  return {
    kind: "success",
    returnedModel,
    completion,
    outputText: message.content,
    ...(normalizedUsage === undefined ? {} : { usage: normalizedUsage }),
    providerRequestId: id,
    ...(systemFingerprint === undefined || systemFingerprint === null
      ? {} : { providerSystemFingerprint: systemFingerprint }),
    durationMs: input.durationMs,
  };
}

function statusFailure(status: number, durationMs: number): ProviderTextResultV2 {
  if (status === 408) return failure({
    responseStatus: "timeout", failureCode: "timeout",
    retryClass: "same_provider_transient", httpStatus: status, durationMs,
  });
  if (status === 429) return failure({
    responseStatus: "rate_limited", failureCode: "rate_limited",
    retryClass: "same_provider_transient", httpStatus: status, durationMs,
  });
  if (status >= 500 && status <= 599) return failure({
    responseStatus: "server_error", failureCode: "server",
    retryClass: "same_provider_transient", httpStatus: status, durationMs,
  });
  if (status === 401) return failure({
    responseStatus: "client_error", failureCode: "authentication",
    retryClass: "not_retryable", httpStatus: status, durationMs,
  });
  if (status === 402) return failure({
    responseStatus: "quota_exceeded", failureCode: "quota_exceeded",
    retryClass: "not_retryable", httpStatus: status, durationMs,
  });
  if (status >= 400 && status <= 499) return failure({
    responseStatus: "client_error", failureCode: "client",
    retryClass: "not_retryable", httpStatus: status, durationMs,
  });
  return failure({
    responseStatus: "unknown", failureCode: "unknown",
    retryClass: "not_retryable", httpStatus: status, durationMs,
  });
}

export function createDeepSeekTextProviderV1(
  testSeams: DeepSeekTextAdapterTestSeamsV1 = {},
): TextAiProvider {
  const fetchImplementation = testSeams.fetchImplementation ?? globalThis.fetch;
  return Object.freeze({
    key: DEEPSEEK_TEXT_PROVIDER_KEY_V1,
    capability: "text" as const,
    resolveConfiguration(input: {
      readonly model: string;
      readonly parameters: unknown;
    }): AiServiceResult<ResolvedAdapterConfigurationV1> {
      if (input.model !== DEEPSEEK_TEXT_MODEL_ALIAS_V1) return aiFailure("model_unsupported");
      if (!isPlainObject(input.parameters)) return aiFailure("parameters_invalid");
      const keys = Object.keys(input.parameters);
      if (keys.some((key) => key !== "temperature" && key !== "top_p") || keys.length > 1) {
        return aiFailure("parameters_invalid");
      }
      const temperature = input.parameters.temperature;
      const topP = input.parameters.top_p;
      if (temperature !== undefined && (typeof temperature !== "number" ||
        !Number.isFinite(temperature) || temperature < 0 || temperature > 2) ||
        topP !== undefined && (typeof topP !== "number" || !Number.isFinite(topP) || topP < 0 || topP > 1)) {
        return aiFailure("parameters_invalid");
      }
      return aiSuccess({ model: input.model, parameters: Object.freeze({ ...input.parameters }) as ReadonlyJsonObject });
    },
    describeEnvelope() {
      return { version: 1, hash: DEEPSEEK_TEXT_ENVELOPE_HASH_V1 };
    },
    estimateInputTokens(request: ProviderNeutralTextRequestV1) {
      if (!requestIsValid(request)) return aiFailure("input_token_limit_exceeded");
      return aiSuccess(Buffer.byteLength(request.instructions, "utf8") +
        Buffer.byteLength(request.input, "utf8") + 512);
    },
    prepareTextDispatch(input: {
      readonly model: string;
      readonly parameters: ReadonlyJsonObject;
      readonly request: ProviderNeutralTextRequestV1;
    }): AiServiceResult<PreparedTextDispatchV1> {
      const configuration = this.resolveConfiguration({ model: input.model, parameters: input.parameters });
      if (!configuration.ok) return configuration;
      if (!requestIsValid(input.request)) return aiFailure("prompt_contract_mismatch");
      const bodyObject: Record<string, unknown> = {
        model: DEEPSEEK_TEXT_MODEL_ALIAS_V1,
        messages: [
          { role: "system", content: input.request.instructions },
          { role: "user", content: input.request.input },
        ],
        thinking: { type: "disabled" },
        stream: false,
        response_format: { type: "json_object" },
        max_tokens: input.request.maxOutputTokens,
      };
      for (const [key, value] of Object.entries(configuration.value.parameters)) bodyObject[key] = value;
      const canonical = canonicalizeJson(bodyObject);
      if (!canonical.ok) return canonical;
      let credential = (testSeams.credentialReader ??
        (() => process.env.DEEPSEEK_API_KEY))();
      if (credential === undefined || credential.length < 20 || credential.length > 512 ||
        credential[0] === " " || credential[credential.length - 1] === " " ||
        !/^[\x20-\x7e]+$/.test(credential)) {
        credential = undefined;
        return aiFailure("provider_auth_failed");
      }
      let consumed = false;
      return aiSuccess(Object.freeze({
        provider: DEEPSEEK_TEXT_PROVIDER_KEY_V1,
        requestedModel: DEEPSEEK_TEXT_MODEL_ALIAS_V1,
        async execute(executeInput: { readonly signal: AbortSignal }): Promise<ProviderTextResultV2> {
          if (consumed) return failure({
            responseStatus: "unknown", failureCode: "unknown",
            retryClass: "not_retryable", durationMs: 0,
          });
          consumed = true;
          if (executeInput.signal.aborted) {
            credential = undefined;
            return failure({
              responseStatus: "cancelled_no_response", failureCode: "client",
              retryClass: "not_retryable", durationMs: 0,
            });
          }
          const startedAt = performance.now();
          const deadline = new AbortController();
          let deadlineExpired = false;
          const timeout = setTimeout(() => {
            deadlineExpired = true;
            deadline.abort("deepseek_adapter_deadline");
          }, TIMEOUT_MS);
          const combined = AbortSignal.any([executeInput.signal, deadline.signal]);
          try {
            const response = await fetchImplementation(DEEPSEEK_TEXT_ENDPOINT_V1, {
              method: "POST",
              redirect: "manual",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${credential}`,
              },
              body: canonical.value,
              signal: combined,
            });
            credential = undefined;
            const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
            if (response.status >= 300 && response.status <= 399) {
              return statusFailure(response.status, durationMs);
            }
            if (response.status !== 200) {
              void response.body?.cancel().catch(() => undefined);
              return statusFailure(response.status, durationMs);
            }
            const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
            if (contentType !== "application/json") {
              void response.body?.cancel().catch(() => undefined);
              return failure({
                responseStatus: "invalid_response", failureCode: "invalid_response_schema",
                retryClass: "not_retryable", httpStatus: 200,
                providerErrorCode: "cwt_response_content_type", durationMs,
              });
            }
            const body = await boundedBody(response);
            if (!body.ok) {
              if (body.kind === "too_large") return failure({
                responseStatus: "invalid_response", failureCode: "response_too_large",
                retryClass: "not_retryable", httpStatus: 200, durationMs,
              });
              if (body.kind === "transport") return failure({
                responseStatus: "transport_error", failureCode: "transport",
                retryClass: "same_provider_transient", httpStatus: 200, durationMs,
              });
              return failure({
                responseStatus: "invalid_response", failureCode: "invalid_response_json",
                retryClass: "not_retryable", httpStatus: 200, durationMs,
              });
            }
            if (body.text.trim().length === 0) return failure({
              responseStatus: "invalid_response", failureCode: "empty_response",
              retryClass: "not_retryable", httpStatus: 200, durationMs,
            });
            const value = parseOneJsonDocument(body.text);
            if (value === undefined) return failure({
              responseStatus: "invalid_response", failureCode: "invalid_response_json",
              retryClass: "not_retryable", httpStatus: 200, durationMs,
            });
            return normalizeSuccess({
              value,
              requestedModel: input.model,
              requestedMaxOutputTokens: input.request.maxOutputTokens,
              durationMs,
            });
          } catch {
            const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
            credential = undefined;
            if (executeInput.signal.aborted) return failure({
              responseStatus: "cancelled_no_response", failureCode: "client",
              retryClass: "not_retryable", durationMs,
            });
            if (deadlineExpired) return failure({
              responseStatus: "timeout", failureCode: "timeout",
              retryClass: "same_provider_transient", durationMs,
            });
            return failure({
              responseStatus: "transport_error", failureCode: "transport",
              retryClass: "same_provider_transient", durationMs,
            });
          } finally {
            clearTimeout(timeout);
            credential = undefined;
          }
        },
      }));
    },
  });
}
