import { z } from "zod";

import { detailLevelSchema, isoDatetimeString, jsonRecordSchema } from "../shared.js";
import { tradeRowSchema } from "../rest/overview.js";

export const tradeUpsertEventSchema = z.object({
  projectionChangeId: z.number().int().nonnegative(),
  channel: z.literal("trades"),
  kind: z.literal("upsert"),
  detailLevel: detailLevelSchema,
  emittedAt: isoDatetimeString,
  effectiveOccurredAt: isoDatetimeString,
  payload: z.object({
    correlationId: z.string().min(1),
    row: tradeRowSchema,
    debug: jsonRecordSchema.optional()
  })
});

export type TradeUpsertEvent = z.infer<typeof tradeUpsertEventSchema>;
