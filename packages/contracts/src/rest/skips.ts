import { z } from "zod";

import { skipRowSchema } from "./strategies.js";
import {
  pageInfoSchema,
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

export const skipListQuerySchema = z.object({
  page: queryPageSchema,
  pageSize: queryPageSizeSchema,
  sort: sortTokenSchema.default("newest"),
  search: z.string().trim().optional(),
  timezone: timezoneModeSchema.default("utc"),
  range: queryRangeSchema,
  strategy: csvListSchema.optional(),
  symbol: csvListSchema.optional(),
  market: csvListSchema.optional(),
  skipCategory: csvListSchema.optional()
});

export const skipTaxonomyCountSchema = z.object({
  skipCategory: z.string().min(1),
  skipCode: z.string().min(1).nullable().optional(),
  count: z.number().int().nonnegative(),
  examples: z.array(z.string().min(1)).default([])
});

export const skipListResponseSchema = z.object({
  items: z.array(skipRowSchema),
  taxonomyBreakdown: z.array(skipTaxonomyCountSchema),
  pageInfo: pageInfoSchema
});

export type SkipListQuery = z.infer<typeof skipListQuerySchema>;
export type SkipTaxonomyCount = z.infer<typeof skipTaxonomyCountSchema>;
export type SkipListResponse = z.infer<typeof skipListResponseSchema>;
