import { z } from "zod";

import { isoDatetimeString, jsonRecordSchema } from "./shared.js";

export const canonicalFamilySchema = z.enum([
  "decision",
  "trade",
  "trade_intent",
  "skip",
  "publisher_event",
  "queue_metric",
  "executor_event",
  "fill",
  "position_snapshot",
  "pnl_snapshot",
  "heartbeat",
  "alert",
  "audit_event"
]);

export const lifecycleStageSchema = z.enum([
  "strategy_emission",
  "skip",
  "intent",
  "publisher",
  "queue",
  "executor",
  "submission",
  "fill",
  "position",
  "pnl",
  "heartbeat",
  "alert",
  "terminal",
  "dead_letter"
]);

export const sourceSystemSchema = z.enum([
  "strategy_adapter",
  "publisher",
  "executor",
  "rabbitmq_management",
  "dashboard"
]);

export const sourcePathModeSchema = z.enum(["publisher_only", "direct_only", "hybrid"]);
export const reconciliationStatusSchema = z.enum([
  "pending",
  "consistent",
  "partial",
  "gap_detected",
  "corrected"
]);

export const identifierAliasSchema = z.object({
  kind: z.string().min(1),
  value: z.string().min(1),
  source: z.string().min(1)
});

export const orderingMetadataSchema = z.object({
  sourceSequence: z.union([z.number(), z.string()]).optional(),
  sourceDeliveryOrdinal: z.number().int().nonnegative().optional(),
  brokerExchange: z.string().min(1).optional(),
  brokerQueue: z.string().min(1).optional(),
  brokerRoutingKey: z.string().min(1).optional(),
  brokerDeliveryTag: z.union([z.number(), z.string()]).optional(),
  hasRedelivery: z.boolean(),
  hasReplay: z.boolean(),
  hasBackfill: z.boolean()
});

export const normalizedDashboardEventSchema = z.object({
  canonicalEventId: z.string().min(1),
  correlationId: z.string().min(1),
  strategyId: z.string().optional(),
  canonicalFamily: canonicalFamilySchema,
  lifecycleStage: lifecycleStageSchema,
  sourceSystem: sourceSystemSchema,
  sourceVariant: z.string().min(1),
  sourceRepo: z.string().min(1),
  sourceEventName: z.string().min(1),
  sourceEventId: z.string().optional(),
  sourceEnvelopeId: z.string().optional(),
  sourceContractVersion: z.string().optional(),
  adapterVersion: z.string().min(1),
  sourcePathMode: sourcePathModeSchema,
  dedupKey: z.string().min(1),
  occurredAt: isoDatetimeString,
  publishedAt: isoDatetimeString.optional(),
  firstSeenAt: isoDatetimeString,
  lastSeenAt: isoDatetimeString,
  ordering: orderingMetadataSchema,
  aliases: z.array(identifierAliasSchema),
  degradedReasons: z.array(z.string()),
  reconciliationStatus: reconciliationStatusSchema,
  normalizedPayload: jsonRecordSchema,
  rawPayload: jsonRecordSchema
});

export type NormalizedDashboardEvent = z.infer<typeof normalizedDashboardEventSchema>;
