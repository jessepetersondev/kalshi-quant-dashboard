import { z } from "zod";

import { detailLevelSchema, isoDatetimeString, jsonRecordSchema } from "../shared.js";
import { alertRowSchema, pnlSummaryCardSchema, queueRowSchema } from "../rest/overview.js";

export const pnlUpsertEventSchema = z.object({
  projectionChangeId: z.number().int().nonnegative(),
  channel: z.literal("pnl"),
  kind: z.literal("upsert"),
  detailLevel: detailLevelSchema,
  emittedAt: isoDatetimeString,
  effectiveOccurredAt: isoDatetimeString,
  payload: z.object({
    scopeType: z.string().min(1),
    scopeKey: z.string().min(1),
    bucketType: z.string().min(1),
    summary: pnlSummaryCardSchema,
    debug: jsonRecordSchema.optional()
  })
});

export const queueMetricUpsertEventSchema = z.object({
  projectionChangeId: z.number().int().nonnegative(),
  channel: z.literal("operations"),
  kind: z.literal("upsert"),
  detailLevel: detailLevelSchema,
  emittedAt: isoDatetimeString,
  effectiveOccurredAt: isoDatetimeString,
  payload: z.object({
    queueName: z.string().min(1),
    row: queueRowSchema,
    debug: jsonRecordSchema.optional()
  })
});

export const alertUpsertEventSchema = z.object({
  projectionChangeId: z.number().int().nonnegative(),
  channel: z.literal("alerts"),
  kind: z.literal("upsert"),
  detailLevel: detailLevelSchema,
  emittedAt: isoDatetimeString,
  effectiveOccurredAt: isoDatetimeString,
  payload: z.object({
    alertId: z.string().min(1),
    row: alertRowSchema,
    debug: jsonRecordSchema.optional()
  })
});

export type PnlUpsertEvent = z.infer<typeof pnlUpsertEventSchema>;
export type QueueMetricUpsertEvent = z.infer<typeof queueMetricUpsertEventSchema>;
export type AlertUpsertEvent = z.infer<typeof alertUpsertEventSchema>;
