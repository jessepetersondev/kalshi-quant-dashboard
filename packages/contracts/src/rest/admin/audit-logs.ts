import { z } from "zod";

import { isoDatetimeString } from "../../shared.js";
import {
  pageInfoSchema,
  queryPageSchema,
  queryPageSizeSchema
} from "../common.js";

export const auditLogListQuerySchema = z.object({
  page: queryPageSchema,
  pageSize: queryPageSizeSchema,
  search: z.string().trim().optional()
});

export const auditLogEntrySchema = z.object({
  auditLogId: z.string().min(1),
  actorUserId: z.string().min(1),
  action: z.string().min(1),
  targetType: z.string().min(1),
  targetId: z.string().min(1),
  result: z.enum(["accepted", "rejected"]),
  reason: z.string().nullable(),
  beforeState: z.record(z.unknown()).nullable().optional(),
  afterState: z.record(z.unknown()).nullable().optional(),
  occurredAt: isoDatetimeString
});

export const auditLogListResponseSchema = z.object({
  items: z.array(auditLogEntrySchema),
  pageInfo: pageInfoSchema
});

export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;
export type AuditLogListResponse = z.infer<typeof auditLogListResponseSchema>;
