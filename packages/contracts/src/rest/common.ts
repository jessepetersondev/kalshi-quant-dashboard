import { z } from "zod";

import { detailLevelSchema, isoDatetimeString } from "../shared.js";

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative()
});

export const pageInfoSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().positive()
});

export const timezoneModeSchema = z.enum(["utc", "local"]);
export const sortTokenSchema = z.enum(["newest", "oldest"]);
export const queryPageSchema = z.coerce.number().int().positive().default(1);
export const queryPageSizeSchema = z.coerce.number().int().positive().max(500).default(50);
export const queryDetailLevelSchema = detailLevelSchema.default("standard");
export const queryRangeSchema = z.string().trim().min(1).default("24h");

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.record(z.unknown()).optional()
  })
});

export const mutationAuditSchema = z.object({
  auditLogId: z.string().min(1),
  result: z.enum(["accepted", "rejected"]),
  occurredAt: isoDatetimeString,
  actorUserId: z.string().min(1).optional()
});

export const healthProbeSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  service: z.string().min(1),
  checkedAt: isoDatetimeString,
  details: z.record(z.unknown())
});

export type MutationAudit = z.infer<typeof mutationAuditSchema>;
export type PageInfo = z.infer<typeof pageInfoSchema>;
