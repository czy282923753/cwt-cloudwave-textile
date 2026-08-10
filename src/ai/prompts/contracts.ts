import { z } from "zod";

import type { ReadonlyJsonValue } from "@/ai/canonical-json";

export const promptVariableDefinitionV1Schema = z.discriminatedUnion("type", [
  z.object({
    name: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
    type: z.literal("string"),
    maximumUtf8Bytes: z.number().int().positive().max(65_536),
  }).strict(),
  z.object({
    name: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
    type: z.literal("enum"),
    values: z.array(z.string().min(1).max(100)).min(1).max(20),
  }).strict(),
  z.object({
    name: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
    type: z.literal("json"),
    maximumUtf8Bytes: z.number().int().positive().max(65_536),
  }).strict(),
]);

export const promptResourceFileV1Schema = z.object({
  resourceFormatVersion: z.literal(1),
  promptId: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),
  promptVersion: z.number().int().positive(),
  applicationClass: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
  capability: z.literal("text"),
  useCase: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
  locale: z.literal("en"),
  inputSchemaVersion: z.number().int().positive(),
  outputSchemaVersion: z.number().int().positive(),
  policyVersion: z.string().min(1).max(100),
  variables: z.array(promptVariableDefinitionV1Schema).max(32),
  body: z.string().min(1).max(30_000),
}).strict();

export interface PromptManifestEntryV1 {
  readonly promptId: string;
  readonly promptVersion: number;
  readonly sha256: string;
  readonly relativePath: string;
}

export interface PromptBundleEntryV1 extends PromptManifestEntryV1 {
  readonly rawByteLength: number;
  readonly rawBase64: string;
}

export type PromptVariableDefinitionV1 = z.infer<typeof promptVariableDefinitionV1Schema>;

export interface LoadedPromptResourceV1 {
  readonly tuple: {
    readonly promptId: string;
    readonly promptVersion: number;
    readonly promptHash: string;
  };
  readonly applicationClass: string;
  readonly capability: "text";
  readonly useCase: string;
  readonly locale: "en";
  readonly inputSchemaVersion: number;
  readonly outputSchemaVersion: number;
  readonly policyVersion: string;
  readonly variables: readonly PromptVariableDefinitionV1[];
  readonly body: string;
}

export type PromptRenderVariablesV1 = Readonly<Record<
  string,
  string | ReadonlyJsonValue
>>;
