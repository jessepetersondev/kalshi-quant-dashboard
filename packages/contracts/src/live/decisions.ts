import { z } from "zod";

import { detailLevelSchema, isoDatetimeString, jsonRecordSchema } from "../shared.js";
import { decisionRowSchema } from "../rest/overview.js";

export const decisionUpsertEventSchema = z.object({
  projectionChangeId: z.number().int().nonnegative(),
  channel: z.literal("decisions"),
  kind: z.literal("upsert"),
  detailLevel: detailLevelSchema,
  emittedAt: isoDatetimeString,
  effectiveOccurredAt: isoDatetimeString,
  payload: z.object({
    correlationId: z.string().min(1),
    row: decisionRowSchema,
    debug: jsonRecordSchema.optional()
  })
});

export type DecisionUpsertEvent = z.infer<typeof decisionUpsertEventSchema>;
