import "server-only";

import { z } from "zod";

export const aiTelemetryEventSchema = z
  .object({
    schemaVersion: z.literal(1),
    eventName: z.enum([
      "ai_availability_checked",
      "ai_attempt_normalized",
      "ai_contract_rejected",
    ]),
    applicationClass: z.string().min(1).max(64),
    useCase: z.string().min(1).max(64),
    capability: z.literal("text"),
    environment: z.enum(["local", "test", "staging", "production"]),
    errorCode: z.string().regex(/^[a-z0-9_]{1,80}$/).optional(),
    status: z.string().regex(/^[a-z0-9_]{1,40}$/).optional(),
    durationMs: z.number().int().nonnegative().optional(),
    attemptCount: z.number().int().nonnegative().optional(),
  })
  .strict();

export type AiTelemetryEvent = z.infer<typeof aiTelemetryEventSchema>;

export interface AiTelemetrySink {
  emit(event: AiTelemetryEvent): void;
}

export const noOpAiTelemetrySink: AiTelemetrySink = {
  emit(): void {},
};
