import { z } from "zod";

import { decisionRowSchema } from "./overview.js";
import {
  pageInfoSchema,
  queryDetailLevelSchema,
  queryPageSchema,
  queryPageSizeSchema,
  queryRangeSchema,
  sortTokenSchema,
  timezoneModeSchema
} from "./common.js";

const csvListSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) =>
    (Array.isArray(value) ? value : value.split(","))
      .map((entry) => entry.trim())
      .filter(Boolean)
  );

export const decisionListQuerySchema = z.object({
  page: queryPageSchema,
  pageSize: queryPageSizeSchema,
  sort: sortTokenSchema.default("newest"),
  search: z.string().trim().optional(),
  timezone: timezoneModeSchema.default("utc"),
  range: queryRangeSchema,
  detailLevel: queryDetailLevelSchema,
  strategy: csvListSchema.optional(),
  symbol: csvListSchema.optional(),
  market: csvListSchema.optional(),
  lifecycleStage: csvListSchema.optional(),
  degraded: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true")
    .optional(),
  detail: z.string().trim().min(1).optional()
});

export const decisionListResponseSchema = z.object({
  items: z.array(decisionRowSchema),
  pageInfo: pageInfoSchema
});

export type DecisionListQuery = z.infer<typeof decisionListQuerySchema>;
export type DecisionListResponse = z.infer<typeof decisionListResponseSchema>;
