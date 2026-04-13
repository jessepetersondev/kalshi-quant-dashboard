import { z } from "zod";

import {
  canonicalFamilySchema,
  lifecycleStageSchema,
  sourcePathModeSchema
} from "../normalized-events.js";
import { isoDatetimeString, jsonRecordSchema } from "../shared.js";
import { decisionRowSchema, tradeRowSchema } from "./overview.js";

export const eventTimelineItemSchema = z.object({
  canonicalEventId: z.string().min(1),
  canonicalFamily: canonicalFamilySchema,
  lifecycleStage: lifecycleStageSchema,
  occurredAt: isoDatetimeString,
  publishedAt: isoDatetimeString.nullable().optional(),
  firstSeenAt: isoDatetimeString,
  sourceEventName: z.string().min(1),
  sourcePathMode: sourcePathModeSchema,
  ordering: jsonRecordSchema,
  degradedReasons: z.array(z.string()).default([])
});

export const rawPayloadEntrySchema = z.object({
  canonicalEventId: z.string().min(1),
  sourceSystem: z.string().min(1),
  sourceEventName: z.string().min(1),
  rawPayload: jsonRecordSchema
});

export const fillRowSchema = z.object({
  fillFactId: z.string().min(1),
  filledQuantity: z.number().int(),
  fillPrice: z.number().nullable().optional(),
  feeAmount: z.number().nullable().optional(),
  occurredAt: isoDatetimeString
});

export const decisionDetailResponseSchema = z.object({
  summary: decisionRowSchema,
  timeline: z.array(eventTimelineItemSchema),
  relatedTrades: z.array(tradeRowSchema).default([]),
  rawPayloadAvailable: z.boolean(),
  rawPayloads: z.array(rawPayloadEntrySchema).optional(),
  debugMetadata: jsonRecordSchema.nullable().optional()
});

export const tradeDetailResponseSchema = z.object({
  summary: tradeRowSchema,
  timeline: z.array(eventTimelineItemSchema),
  fills: z.array(fillRowSchema),
  publisherDashboardLink: z.string().url().optional(),
  rawPayloadAvailable: z.boolean(),
  rawPayloads: z.array(rawPayloadEntrySchema).optional(),
  debugMetadata: jsonRecordSchema.nullable().optional()
});

export type EventTimelineItem = z.infer<typeof eventTimelineItemSchema>;
export type RawPayloadEntry = z.infer<typeof rawPayloadEntrySchema>;
export type FillRow = z.infer<typeof fillRowSchema>;
export type DecisionDetailResponse = z.infer<typeof decisionDetailResponseSchema>;
export type TradeDetailResponse = z.infer<typeof tradeDetailResponseSchema>;
