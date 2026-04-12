import { z } from "zod";

import { isoDatetimeString } from "../shared.js";
import { pnlSummaryCardSchema } from "./overview.js";
import { timezoneModeSchema } from "./common.js";

const csvListSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) =>
    (Array.isArray(value) ? value : value.split(","))
      .map((entry) => entry.trim())
      .filter(Boolean)
  );

export const pnlBucketSchema = z.enum([
  "24h",
  "7d",
  "30d",
  "mtd",
  "ytd",
  "all-time",
  "all_time",
  "custom"
]);

export const pnlGranularitySchema = z.enum(["hour", "day", "week"]);

export const pnlAttributionRowSchema = z.object({
  scopeType: z.enum(["portfolio", "strategy", "symbol", "market"]),
  scopeKey: z.string().min(1),
  label: z.string().min(1),
  realizedPnlNet: z.number(),
  unrealizedPnlNet: z.number(),
  feesTotal: z.number(),
  totalPnlNet: z.number(),
  stale: z.boolean().default(false),
  partial: z.boolean().default(false),
  disagreement: z.boolean().default(false),
  freshnessTimestamp: isoDatetimeString.nullable().optional(),
  metadata: z.record(z.unknown()).default({})
});

export const pnlTimeseriesPointSchema = z.object({
  bucketStart: isoDatetimeString,
  bucketEnd: isoDatetimeString,
  realizedPnlNet: z.number(),
  unrealizedPnlNet: z.number(),
  feesTotal: z.number(),
  totalPnlNet: z.number(),
  stale: z.boolean().default(false),
  partial: z.boolean().default(false)
});

export const pnlCompareSeriesSchema = z.object({
  strategyId: z.string().min(1),
  label: z.string().min(1),
  summary: pnlAttributionRowSchema,
  series: z.array(pnlTimeseriesPointSchema).default([])
});

export const pnlWinLossSummarySchema = z.object({
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  winRate: z.number().min(0).max(1)
});

export const pnlSummaryQuerySchema = z.object({
  timezone: timezoneModeSchema.default("utc"),
  bucket: pnlBucketSchema.default("24h"),
  rangeStartUtc: isoDatetimeString.optional(),
  rangeEndUtc: isoDatetimeString.optional(),
  strategy: csvListSchema.optional(),
  compare: csvListSchema.optional()
});

export const pnlTimeseriesQuerySchema = z.object({
  timezone: timezoneModeSchema.default("utc"),
  bucket: pnlBucketSchema.default("24h"),
  granularity: pnlGranularitySchema.default("day"),
  rangeStartUtc: isoDatetimeString.optional(),
  rangeEndUtc: isoDatetimeString.optional(),
  strategy: csvListSchema.optional(),
  compare: csvListSchema.optional()
});

export const pnlSummaryResponseSchema = z.object({
  generatedAt: isoDatetimeString,
  bucket: pnlBucketSchema,
  rangeStartUtc: isoDatetimeString.nullable().optional(),
  rangeEndUtc: isoDatetimeString.nullable().optional(),
  portfolioSummary: pnlSummaryCardSchema,
  strategyBreakdown: z.array(pnlAttributionRowSchema),
  symbolBreakdown: z.array(pnlAttributionRowSchema),
  marketBreakdown: z.array(pnlAttributionRowSchema),
  compare: z.array(pnlCompareSeriesSchema).default([])
});

export const pnlTimeseriesResponseSchema = z.object({
  generatedAt: isoDatetimeString,
  bucket: pnlBucketSchema,
  granularity: pnlGranularitySchema,
  rangeStartUtc: isoDatetimeString,
  rangeEndUtc: isoDatetimeString,
  series: z.array(pnlTimeseriesPointSchema),
  compare: z.array(pnlCompareSeriesSchema).default([]),
  attribution: z.array(pnlAttributionRowSchema),
  winLossSummary: pnlWinLossSummarySchema,
  disagreementCount: z.number().int().nonnegative()
});

export type PnlBucket = z.infer<typeof pnlBucketSchema>;
export type PnlSummaryQuery = z.infer<typeof pnlSummaryQuerySchema>;
export type PnlTimeseriesQuery = z.infer<typeof pnlTimeseriesQuerySchema>;
export type PnlAttributionRow = z.infer<typeof pnlAttributionRowSchema>;
export type PnlTimeseriesPoint = z.infer<typeof pnlTimeseriesPointSchema>;
export type PnlCompareSeries = z.infer<typeof pnlCompareSeriesSchema>;
export type PnlSummaryResponse = z.infer<typeof pnlSummaryResponseSchema>;
export type PnlTimeseriesResponse = z.infer<typeof pnlTimeseriesResponseSchema>;
