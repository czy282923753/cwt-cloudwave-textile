import type { ReadonlyJsonObject } from "../canonical-json";
import type { ProviderEnvelopeIdentityV1 } from "../core/contracts";
import type { AiServiceResult } from "../errors";

export interface ProviderNeutralTextRequestV1 {
  readonly version: 1;
  readonly instructions: string;
  readonly input: string;
  readonly responseFormat: {
    readonly kind: "json_object";
    readonly schemaId: string;
    readonly schemaVersion: number;
  };
  readonly maxOutputTokens: number;
}

export interface ResolvedAdapterConfigurationV1 {
  readonly model: string;
  readonly parameters: ReadonlyJsonObject;
}

export interface NormalizedTokenUsageV2 {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly cacheHitInputTokens?: number;
  readonly cacheMissInputTokens?: number;
}

export type NormalizedCompletionV1 =
  | { readonly kind: "complete" }
  | { readonly kind: "length_limit" }
  | { readonly kind: "content_filter" }
  | { readonly kind: "cancelled" }
  | { readonly kind: "unknown"; readonly safeCode?: string };

export type NormalizedProviderResponseStatus =
  | "success"
  | "timeout"
  | "transport_error"
  | "rate_limited"
  | "quota_exceeded"
  | "client_error"
  | "server_error"
  | "safety_rejected"
  | "invalid_response"
  | "model_drift"
  | "cancelled_no_response"
  | "cancelled_late_response"
  | "unknown";

export type ProviderNeutralFailureCode =
  | "timeout"
  | "transport"
  | "rate_limited"
  | "quota_exceeded"
  | "authentication"
  | "client"
  | "server"
  | "empty_response"
  | "invalid_response_json"
  | "invalid_response_schema"
  | "response_too_large"
  | "unknown";

export type ProviderTextResultV2 =
  | {
      readonly kind: "success";
      readonly returnedModel: string;
      readonly completion: NormalizedCompletionV1;
      readonly outputText: string;
      readonly usage?: NormalizedTokenUsageV2;
      readonly providerRequestId?: string;
      readonly providerSystemFingerprint?: string;
      readonly durationMs: number;
    }
  | {
      readonly kind: "failure";
      readonly responseStatus: NormalizedProviderResponseStatus;
      readonly failureCode: ProviderNeutralFailureCode;
      readonly retryClass: "same_provider_transient" | "not_retryable";
      readonly httpStatus?: number;
      readonly providerErrorCode?: string;
      readonly providerRequestId?: string;
      readonly returnedModel?: string;
      readonly durationMs: number;
    };

export interface PreparedTextDispatchV1 {
  readonly provider: string;
  readonly requestedModel: string;
  execute(input: { readonly signal: AbortSignal }): Promise<ProviderTextResultV2>;
}

export interface TextAiProvider {
  readonly key: string;
  readonly capability: "text";
  resolveConfiguration(input: {
    readonly model: string;
    readonly parameters: unknown;
  }): AiServiceResult<ResolvedAdapterConfigurationV1>;
  describeEnvelope(): ProviderEnvelopeIdentityV1;
  estimateInputTokens(
    request: ProviderNeutralTextRequestV1,
  ): AiServiceResult<number>;
  prepareTextDispatch(input: {
    readonly model: string;
    readonly parameters: ReadonlyJsonObject;
    readonly request: ProviderNeutralTextRequestV1;
  }): AiServiceResult<PreparedTextDispatchV1>;
}
