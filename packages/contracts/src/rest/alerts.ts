import { z } from "zod";

import { isoDatetimeString } from "../shared.js";
import { eventTimelineItemSchema, rawPayloadEntrySchema } from "./details.js";
import {
  pageInfoSchema,
  queryDetailLevelSchema,
  queryPageSchema,
  queryPageSizeSchema,
  timezoneModeSchema
} from "./common.js";
import { alertRowSchema } from "./overview.js";

const csvListSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) =>
    (Array.isArray(value) ? value : value.split(","))
      .map((entry) => entry.trim())
      .filter(Boolean)
  );

export const alertListQuerySchema = z.object({
  page: queryPageSchema,
  pageSize: queryPageSizeSchema,
  search: z.string().trim().optional(),
  timezone: timezoneModeSchema.default("utc"),
  detailLevel: queryDetailLevelSchema,
  severity: csvListSchema.optional(),
  status: csvListSchema.optional(),
  strategy: csvListSchema.optional()
});

export const alertSummarySchema = alertRowSchema.extend({
  correlationId: z.string().min(1).nullable().optional(),
  strategyId: z.string().min(1).nullable().optional(),
  firstSeenAt: isoDatetimeString,
  detail: z.string().min(1),
  affectedComponent: z.string().min(1),
  resolvedAt: isoDatetimeString.nullable().optional(),
  metadata: z.record(z.unknown()).default({})
});

export const alertAuditEntrySchema = z.object({
  auditLogId: z.string().min(1),
  action: z.string().min(1),
  result: z.string().min(1),
  occurredAt: isoDatetimeString,
  actorUserId: z.string().min(1)
});

export const alertListResponseSchema = z.object({
  items: z.array(alertRowSchema),
  pageInfo: pageInfoSchema
});

export const alertDetailResponseSchema = z.object({
  summary: alertSummarySchema,
  timeline: z.array(eventTimelineItemSchema),
  rawPayloadAvailable: z.boolean(),
  rawPayloads: z.array(rawPayloadEntrySchema).optional(),
  auditEntries: z.array(alertAuditEntrySchema).default([])
});

export type AlertListQuery = z.infer<typeof alertListQuerySchema>;
export type AlertSummary = z.infer<typeof alertSummarySchema>;
export type AlertListResponse = z.infer<typeof alertListResponseSchema>;
export type AlertDetailResponse = z.infer<typeof alertDetailResponseSchema>;
