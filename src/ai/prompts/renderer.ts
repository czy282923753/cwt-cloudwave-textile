import { canonicalizeJson } from "@/ai/canonical-json";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";

import type {
  LoadedPromptResourceV1,
  PromptRenderVariablesV1,
} from "./contracts";

const placeholderPattern = /{{([a-z][a-z0-9_]{0,63})}}/g;

export function renderPromptV1(input: {
  readonly resource: LoadedPromptResourceV1;
  readonly variables: PromptRenderVariablesV1;
}): AiServiceResult<{ readonly instructions: string; readonly input: string }> {
  const definitions = new Map(input.resource.variables.map((definition) => [definition.name, definition]));
  if (definitions.size !== input.resource.variables.length) return aiFailure("prompt_invalid");
  const placeholders = Array.from(input.resource.body.matchAll(placeholderPattern), (match) => match[1]);
  if (placeholders.some((name) => name === undefined) ||
    new Set(placeholders).size !== definitions.size ||
    placeholders.some((name) => !definitions.has(name ?? "")) ||
    Object.keys(input.variables).length !== definitions.size ||
    Object.keys(input.variables).some((name) => !definitions.has(name))) {
    return aiFailure("prompt_contract_mismatch");
  }
  let rendered = input.resource.body;
  for (const definition of input.resource.variables) {
    const value = input.variables[definition.name];
    if (value === undefined) return aiFailure("prompt_variables_missing");
    let encoded: string;
    if (definition.type === "string") {
      if (typeof value !== "string" || Buffer.byteLength(value, "utf8") > definition.maximumUtf8Bytes || /[\u0000-\u0009\u000b-\u001f\u007f]/u.test(value)) {
        return aiFailure("prompt_variable_invalid");
      }
      encoded = value;
    } else if (definition.type === "enum") {
      if (typeof value !== "string" || !definition.values.includes(value)) {
        return aiFailure("prompt_variable_invalid");
      }
      encoded = value;
    } else {
      if (typeof value === "string") return aiFailure("prompt_variable_invalid");
      const canonical = canonicalizeJson(value);
      if (!canonical.ok || Buffer.byteLength(canonical.value, "utf8") > definition.maximumUtf8Bytes) {
        return aiFailure("prompt_variable_invalid");
      }
      encoded = canonical.value;
    }
    rendered = rendered.replaceAll(`{{${definition.name}}}`, encoded);
  }
  if (rendered.includes("{{") || rendered.includes("}}")) return aiFailure("prompt_invalid");
  if (Buffer.byteLength(rendered, "utf8") > 98_304) return aiFailure("prompt_too_large");
  return aiSuccess({ instructions: rendered, input: "" });
}
