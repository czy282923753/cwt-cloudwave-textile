import "server-only";

import { createHash } from "node:crypto";

export const DEEPSEEK_PRICING_SOURCE_URL_V1 =
  "https://api-docs.deepseek.com/quick_start/pricing/";
export const DEEPSEEK_CHAT_COMPLETION_SOURCE_URL_V1 =
  "https://api-docs.deepseek.com/api/create-chat-completion/";
export const DEEPSEEK_PRICING_SOURCE_SHA256_V1 =
  "3af5e5d6992a4e26709ed37f02d9bfbc46ee92dc825e6588404728419f41ce71";
export const DEEPSEEK_CHAT_COMPLETION_SOURCE_SHA256_V1 =
  "2948bb768f4fedca3837bd402ca5bf7ca864b7bc6ef68312f82ebe4fb8ea9a3a";

export interface DeepSeekOfficialSourceCountersV1 {
  readonly official_pricing_get: number;
  readonly official_chat_completion_schema_get: number;
  readonly official_source_get_total: number;
  readonly billable_post: 0;
}

export interface DeepSeekOfficialSourceProjectionV1 {
  readonly version: 1;
  readonly status: "PASS";
  readonly retrieved_at: string;
  readonly counters: DeepSeekOfficialSourceCountersV1;
  readonly pricing: {
    readonly url: typeof DEEPSEEK_PRICING_SOURCE_URL_V1;
    readonly status: 200;
    readonly bytes: number;
    readonly sha256: typeof DEEPSEEK_PRICING_SOURCE_SHA256_V1;
    readonly model_alias: "deepseek-v4-flash";
    readonly published_model_version: "DeepSeek-V4-Flash-0731";
    readonly cache_hit_input_microusd_per_million: 2_800;
    readonly cache_miss_input_microusd_per_million: 140_000;
    readonly output_microusd_per_million: 280_000;
  };
  readonly chat_completion: {
    readonly url: typeof DEEPSEEK_CHAT_COMPLETION_SOURCE_URL_V1;
    readonly status: 200;
    readonly bytes: number;
    readonly sha256: typeof DEEPSEEK_CHAT_COMPLETION_SOURCE_SHA256_V1;
    readonly endpoint_path: "/chat/completions";
    readonly response_format: "json_object";
    readonly thinking_disabled_supported: true;
    readonly non_streaming_supported: true;
    readonly service_tier_occurrences: 0;
  };
}

export type DeepSeekOfficialSourcePreflightResultV1 =
  | { readonly ok: true; readonly value: DeepSeekOfficialSourceProjectionV1 }
  | {
      readonly ok: false;
      readonly code:
        | "official_source_transport_failed"
        | "official_source_timeout"
        | "official_source_redirect_rejected"
        | "official_source_status_mismatch"
        | "official_source_too_large"
        | "official_source_utf8_invalid"
        | "official_source_hash_mismatch"
        | "official_source_fact_mismatch";
      readonly counters: DeepSeekOfficialSourceCountersV1;
    };

type FetchImplementation = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

interface SourceContractV1 {
  readonly url: string;
  readonly maximumBytes: number;
  readonly expectedHash: string;
  readonly verifyFacts: (text: string) => boolean;
}

export interface DeepSeekOfficialSourcePreflightTestSeamsV1 {
  readonly fetchImplementation?: FetchImplementation;
  readonly contracts?: readonly [SourceContractV1, SourceContractV1];
  readonly now?: () => Date;
}

const pricingContract: SourceContractV1 = Object.freeze({
  url: DEEPSEEK_PRICING_SOURCE_URL_V1,
  maximumBytes: 65_536,
  expectedHash: DEEPSEEK_PRICING_SOURCE_SHA256_V1,
  verifyFacts(text: string) {
    return text.includes("deepseek-v4-flash") && text.includes("DeepSeek-V4-Flash-0731") &&
      text.includes("0.0028") && text.includes("0.14") && text.includes("0.28") &&
      text.includes("https://api.deepseek.com");
  },
});

const chatContract: SourceContractV1 = Object.freeze({
  url: DEEPSEEK_CHAT_COMPLETION_SOURCE_URL_V1,
  maximumBytes: 262_144,
  expectedHash: DEEPSEEK_CHAT_COMPLETION_SOURCE_SHA256_V1,
  verifyFacts(text: string) {
    return text.includes("/chat/completions") && text.includes("deepseek-v4-flash") &&
      text.includes("disabled") && text.includes("json_object") &&
      text.includes("stream") && !text.includes("service_tier");
  },
});

function counters(pricing: number, chat: number): DeepSeekOfficialSourceCountersV1 {
  return Object.freeze({
    official_pricing_get: pricing,
    official_chat_completion_schema_get: chat,
    official_source_get_total: pricing + chat,
    billable_post: 0,
  });
}

async function readSource(input: {
  readonly contract: SourceContractV1;
  readonly fetchImplementation: FetchImplementation;
}): Promise<
  | { readonly ok: true; readonly bytes: number; readonly sha256: string; readonly text: string }
  | { readonly ok: false; readonly code: Exclude<
      DeepSeekOfficialSourcePreflightResultV1,
      { readonly ok: true }
    >["code"] }
> {
  const deadline = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    deadline.abort("official_source_deadline");
  }, 30_000);
  try {
    const response = await input.fetchImplementation(input.contract.url, {
      method: "GET",
      redirect: "manual",
      signal: deadline.signal,
    });
    if (response.status >= 300 && response.status <= 399) {
      return { ok: false, code: "official_source_redirect_rejected" };
    }
    if (response.status !== 200) return { ok: false, code: "official_source_status_mismatch" };
    if (response.body === null) return { ok: false, code: "official_source_fact_mismatch" };
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.byteLength;
        if (length > input.contract.maximumBytes) {
          await reader.cancel();
          return { ok: false, code: "official_source_too_large" };
        }
        chunks.push(part.value);
      }
    } catch {
      return { ok: false, code: timedOut ? "official_source_timeout" : "official_source_transport_failed" };
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return { ok: false, code: "official_source_utf8_invalid" };
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== input.contract.expectedHash) return { ok: false, code: "official_source_hash_mismatch" };
    if (!input.contract.verifyFacts(text)) return { ok: false, code: "official_source_fact_mismatch" };
    return { ok: true, bytes: length, sha256, text };
  } catch {
    return { ok: false, code: timedOut ? "official_source_timeout" : "official_source_transport_failed" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runDeepSeekOfficialSourcePreflightV1(
  testSeams: DeepSeekOfficialSourcePreflightTestSeamsV1 = {},
): Promise<DeepSeekOfficialSourcePreflightResultV1> {
  const fetchImplementation = testSeams.fetchImplementation ?? globalThis.fetch;
  const contracts = testSeams.contracts ?? [pricingContract, chatContract];
  const pricing = await readSource({ contract: contracts[0], fetchImplementation });
  if (!pricing.ok) return { ok: false, code: pricing.code, counters: counters(1, 0) };
  const chat = await readSource({ contract: contracts[1], fetchImplementation });
  if (!chat.ok) return { ok: false, code: chat.code, counters: counters(1, 1) };
  return {
    ok: true,
    value: Object.freeze({
      version: 1,
      status: "PASS",
      retrieved_at: (testSeams.now ?? (() => new Date()))().toISOString(),
      counters: counters(1, 1),
      pricing: Object.freeze({
        url: DEEPSEEK_PRICING_SOURCE_URL_V1,
        status: 200,
        bytes: pricing.bytes,
        sha256: DEEPSEEK_PRICING_SOURCE_SHA256_V1,
        model_alias: "deepseek-v4-flash",
        published_model_version: "DeepSeek-V4-Flash-0731",
        cache_hit_input_microusd_per_million: 2_800,
        cache_miss_input_microusd_per_million: 140_000,
        output_microusd_per_million: 280_000,
      }),
      chat_completion: Object.freeze({
        url: DEEPSEEK_CHAT_COMPLETION_SOURCE_URL_V1,
        status: 200,
        bytes: chat.bytes,
        sha256: DEEPSEEK_CHAT_COMPLETION_SOURCE_SHA256_V1,
        endpoint_path: "/chat/completions",
        response_format: "json_object",
        thinking_disabled_supported: true,
        non_streaming_supported: true,
        service_tier_occurrences: 0,
      }),
    }),
  };
}
