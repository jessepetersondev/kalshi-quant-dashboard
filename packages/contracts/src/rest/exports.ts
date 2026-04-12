import { z } from "zod";

import {
  csvExportResourceSchema,
  exportColumnProfileSchema
} from "../shared.js";
import { alertListQuerySchema } from "./alerts.js";
import { decisionListQuerySchema } from "./decisions.js";
import { pnlSummaryQuerySchema } from "./pnl.js";
import { skipListQuerySchema } from "./skips.js";
import { tradeListQuerySchema } from "./trades.js";

export const exportQuerySchema = z.object({
  resource: csvExportResourceSchema,
  timezone: z.enum(["utc", "local"]).default("utc"),
  format: z.literal("csv").default("csv")
});

export const decisionExportQuerySchema = decisionListQuerySchema.pick({
  search: true,
  timezone: true,
  range: true,
  strategy: true,
  symbol: true,
  market: true,
  lifecycleStage: true,
  degraded: true,
  sort: true
});

export const tradeExportQuerySchema = tradeListQuerySchema.pick({
  search: true,
  timezone: true,
  range: true,
  strategy: true,
  symbol: true,
  market: true,
  status: true,
  lifecycleStage: true,
  degraded: true,
  sort: true
});

export const skipExportQuerySchema = skipListQuerySchema.pick({
  search: true,
  timezone: true,
  range: true,
  strategy: true,
  symbol: true,
  market: true,
  skipCategory: true,
  sort: true
});

export const alertExportQuerySchema = alertListQuerySchema.pick({
  search: true,
  timezone: true,
  severity: true,
  status: true,
  strategy: true
});

export const pnlExportQuerySchema = pnlSummaryQuerySchema.pick({
  timezone: true,
  bucket: true,
  rangeStartUtc: true,
  rangeEndUtc: true,
  strategy: true,
  compare: true
});

export const csvExportAuditSchema = z.object({
  resource: csvExportResourceSchema,
  columnProfile: exportColumnProfileSchema,
  rowCount: z.number().int().nonnegative()
});

export type ExportQuery = z.infer<typeof exportQuerySchema>;
export type DecisionExportQuery = z.infer<typeof decisionExportQuerySchema>;
export type TradeExportQuery = z.infer<typeof tradeExportQuerySchema>;
export type SkipExportQuery = z.infer<typeof skipExportQuerySchema>;
export type AlertExportQuery = z.infer<typeof alertExportQuerySchema>;
export type PnlExportQuery = z.infer<typeof pnlExportQuerySchema>;
export type CsvExportAudit = z.infer<typeof csvExportAuditSchema>;
export type CsvExportResource = z.infer<typeof csvExportResourceSchema>;
