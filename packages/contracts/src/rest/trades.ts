import { z } from "zod";

import { tradeRowSchema } from "./overview.js";
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

export const tradeListQuerySchema = z.object({
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
  status: csvListSchema.optional(),
  lifecycleStage: csvListSchema.optional(),
  degraded: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true")
    .optional(),
  detail: z.string().trim().min(1).optional()
});

export const tradeListResponseSchema = z.object({
  items: z.array(tradeRowSchema),
  pageInfo: pageInfoSchema
});

export type TradeListQuery = z.infer<typeof tradeListQuerySchema>;
export type TradeListResponse = z.infer<typeof tradeListResponseSchema>;
