import { z } from "zod";

import { detailLevelSchema, isoDatetimeString } from "../shared.js";
import { overviewResponseSchema } from "../rest/overview.js";

export const liveChannelSchema = z.enum([
  "overview",
  "decisions",
  "trades",
  "skips",
  "pnl",
  "operations",
  "alerts"
]);

export const streamStatusPayloadSchema = z.object({
  connectionState: z.enum(["connected", "reconnecting", "paused", "degraded"]),
  freshnessTimestamp: isoDatetimeString,
  degraded: z.boolean(),
  reconciliationPending: z.boolean().optional()
});

export const streamGapPayloadSchema = z.object({
  gapType: z.enum([
    "missing_terminal_event",
    "history_mismatch",
    "backfill_pending",
    "resync_required"
  ]),
  affectedChannels: z.array(liveChannelSchema),
  detectedAt: isoDatetimeString,
  message: z.string().min(1),
  correlationId: z.string().min(1).optional(),
  strategyId: z.string().min(1).optional()
});

export const streamResyncRequiredPayloadSchema = z.object({
  reason: z.string().min(1),
  affectedChannels: z.array(liveChannelSchema),
  refetch: z.boolean(),
  cursorStart: z.number().int().nonnegative().optional()
});

export const overviewSnapshotEventSchema = z.object({
  projectionChangeId: z.number().int().nonnegative(),
  channel: z.literal("overview"),
  kind: z.literal("snapshot"),
  detailLevel: detailLevelSchema,
  emittedAt: isoDatetimeString,
  effectiveOccurredAt: isoDatetimeString.nullable().optional(),
  payload: overviewResponseSchema
});

export const streamStatusEventSchema = z.object({
  projectionChangeId: z.number().int().nonnegative(),
  channel: z.literal("overview"),
  kind: z.literal("status"),
  detailLevel: detailLevelSchema,
  emittedAt: isoDatetimeString,
  effectiveOccurredAt: isoDatetimeString.nullable().optional(),
  payload: streamStatusPayloadSchema
});

export const streamGapEventSchema = z.object({
  projectionChangeId: z.number().int().nonnegative(),
  channel: z.literal("overview"),
  kind: z.literal("gap"),
  detailLevel: detailLevelSchema,
  emittedAt: isoDatetimeString,
  effectiveOccurredAt: isoDatetimeString.nullable().optional(),
  payload: streamGapPayloadSchema
});

export const streamResyncRequiredEventSchema = z.object({
  projectionChangeId: z.number().int().nonnegative(),
  channel: z.literal("overview"),
  kind: z.literal("resync_required"),
  detailLevel: detailLevelSchema,
  emittedAt: isoDatetimeString,
  effectiveOccurredAt: isoDatetimeString.nullable().optional(),
  payload: streamResyncRequiredPayloadSchema
});

export type OverviewSnapshotEvent = z.infer<typeof overviewSnapshotEventSchema>;
export type StreamStatusEvent = z.infer<typeof streamStatusEventSchema>;
export type StreamGapEvent = z.infer<typeof streamGapEventSchema>;
export type StreamResyncRequiredEvent = z.infer<typeof streamResyncRequiredEventSchema>;
