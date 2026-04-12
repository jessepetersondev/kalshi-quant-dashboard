import { z } from "zod";

import { detailLevelSchema, isoDatetimeString, jsonRecordSchema } from "../shared.js";
import { skipRowSchema } from "../rest/strategies.js";

export const skipUpsertEventSchema = z.object({
  projectionChangeId: z.number().int().nonnegative(),
  channel: z.literal("skips"),
  kind: z.literal("upsert"),
  detailLevel: detailLevelSchema,
  emittedAt: isoDatetimeString,
  effectiveOccurredAt: isoDatetimeString,
  payload: z.object({
    correlationId: z.string().min(1),
    row: skipRowSchema,
    debug: jsonRecordSchema.optional()
  })
});

export type SkipUpsertEvent = z.infer<typeof skipUpsertEventSchema>;
