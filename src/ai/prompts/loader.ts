import "server-only";

import { createHash } from "node:crypto";

import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";

import { productionPromptBundleV1 } from "./generated/production-prompt-bundle.generated";
import {
  promptResourceFileV1Schema,
  type LoadedPromptResourceV1,
  type PromptBundleEntryV1,
} from "./contracts";

function fatalUtf8(bytes: Uint8Array): string | undefined {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

export interface PromptBundleLoaderV1 {
  load(input: {
    readonly promptId: string;
    readonly promptVersion: number;
    readonly promptHash: string;
    readonly applicationClass: string;
    readonly capability: "text";
    readonly useCase: string;
    readonly inputSchemaVersion: number;
    readonly outputSchemaVersion: number;
    readonly policyVersion: string;
  }): AiServiceResult<LoadedPromptResourceV1>;
}

export function createPromptBundleLoaderV1(
  entries: readonly PromptBundleEntryV1[],
): AiServiceResult<PromptBundleLoaderV1> {
  const loaded = new Map<string, LoadedPromptResourceV1>();
  for (const entry of entries) {
    if (
      !/^[0-9a-f]{64}$/.test(entry.sha256) ||
      !/^[a-z][a-z0-9-]{0,63}$/.test(entry.promptId) ||
      !Number.isInteger(entry.promptVersion) || entry.promptVersion < 1 ||
      !/^[a-z][a-z0-9-]{0,63}\/v[1-9][0-9]*\.[0-9a-f]{64}\.json$/.test(entry.relativePath)
    ) return aiFailure("prompt_bundle_invalid");
    const bytes = Buffer.from(entry.rawBase64, "base64");
    if (
      bytes.byteLength !== entry.rawByteLength || bytes.byteLength > 32_768 ||
      createHash("sha256").update(bytes).digest("hex") !== entry.sha256 ||
      bytes[bytes.length - 1] !== 0x0a
    ) return aiFailure("prompt_bundle_invalid");
    const text = fatalUtf8(bytes);
    if (text === undefined || text.startsWith("\uFEFF") || text.includes("\r") || text.endsWith("\n\n")) {
      return aiFailure("prompt_bundle_invalid");
    }
    let untrusted: unknown;
    try {
      untrusted = JSON.parse(text);
    } catch {
      return aiFailure("prompt_invalid");
    }
    const parsed = promptResourceFileV1Schema.safeParse(untrusted);
    if (!parsed.success || parsed.data.promptId !== entry.promptId ||
      parsed.data.promptVersion !== entry.promptVersion) {
      return aiFailure("prompt_contract_mismatch");
    }
    const key = `${entry.promptId}:${entry.promptVersion}:${entry.sha256}`;
    if (loaded.has(key)) return aiFailure("prompt_bundle_invalid");
    loaded.set(key, Object.freeze({
      tuple: {
        promptId: entry.promptId,
        promptVersion: entry.promptVersion,
        promptHash: entry.sha256,
      },
      applicationClass: parsed.data.applicationClass,
      capability: "text",
      useCase: parsed.data.useCase,
      locale: "en",
      inputSchemaVersion: parsed.data.inputSchemaVersion,
      outputSchemaVersion: parsed.data.outputSchemaVersion,
      policyVersion: parsed.data.policyVersion,
      variables: parsed.data.variables,
      body: parsed.data.body,
    }));
  }
  return aiSuccess({
    load(input) {
      const resource = loaded.get(`${input.promptId}:${input.promptVersion}:${input.promptHash}`);
      if (resource === undefined) return aiFailure("prompt_not_found");
      if (
        resource.applicationClass !== input.applicationClass ||
        resource.capability !== input.capability || resource.useCase !== input.useCase ||
        resource.inputSchemaVersion !== input.inputSchemaVersion ||
        resource.outputSchemaVersion !== input.outputSchemaVersion ||
        resource.policyVersion !== input.policyVersion
      ) return aiFailure("prompt_contract_mismatch");
      return aiSuccess(resource);
    },
  });
}

const productionLoader = createPromptBundleLoaderV1(productionPromptBundleV1);
if (!productionLoader.ok) throw new Error("The Production Prompt bundle is invalid.");
export const productionPromptLoaderV1 = productionLoader.value;
