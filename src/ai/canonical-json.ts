import { createHash } from "node:crypto";

import { aiFailure, aiSuccess, type AiServiceResult } from "./errors";

export type JsonPrimitive = null | boolean | number | string;
export type ReadonlyJsonValue =
  | JsonPrimitive
  | readonly ReadonlyJsonValue[]
  | ReadonlyJsonObject;
export type ReadonlyJsonObject = {
  readonly [key: string]: ReadonlyJsonValue;
};

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function serialize(
  value: unknown,
  ancestors: ReadonlySet<object>,
): AiServiceResult<string> {
  if (value === null) return aiSuccess("null");
  if (typeof value === "boolean") return aiSuccess(value ? "true" : "false");
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return aiFailure("canonicalization_failed");
    return aiSuccess(JSON.stringify(Object.is(value, -0) ? 0 : value));
  }
  if (typeof value === "string") {
    if (hasLoneSurrogate(value)) return aiFailure("canonicalization_failed");
    return aiSuccess(JSON.stringify(value));
  }
  if (typeof value !== "object") return aiFailure("canonicalization_failed");
  if (ancestors.has(value)) return aiFailure("canonicalization_failed");

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) return aiFailure("canonicalization_failed");
    }
    const serialized: string[] = [];
    for (const item of value) {
      const result = serialize(item, nextAncestors);
      if (!result.ok) return result;
      serialized.push(result.value);
    }
    return aiSuccess(`[${serialized.join(",")}]`);
  }

  if (!isPlainObject(value)) return aiFailure("canonicalization_failed");
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) {
    return aiFailure("canonicalization_failed");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(value).sort();
  if (keys.length !== ownKeys.length) return aiFailure("canonicalization_failed");
  const members: string[] = [];
  for (const key of keys) {
    if (hasLoneSurrogate(key)) return aiFailure("canonicalization_failed");
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor)
    ) {
      return aiFailure("canonicalization_failed");
    }
    const result = serialize(descriptor.value, nextAncestors);
    if (!result.ok) return result;
    members.push(`${JSON.stringify(key)}:${result.value}`);
  }
  return aiSuccess(`{${members.join(",")}}`);
}

export function canonicalizeJson(value: unknown): AiServiceResult<string> {
  return serialize(value, new Set<object>());
}

export function sha256Hex(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalJsonHash(value: unknown): AiServiceResult<{
  readonly canonicalJson: string;
  readonly hash: string;
}> {
  const canonical = canonicalizeJson(value);
  if (!canonical.ok) return canonical;
  return aiSuccess({
    canonicalJson: canonical.value,
    hash: sha256Hex(Buffer.from(canonical.value, "utf8")),
  });
}
