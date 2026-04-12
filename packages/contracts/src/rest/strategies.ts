import { z } from "zod";

import { isoDatetimeString } from "../shared.js";
import {
  alertRowSchema,
  decisionRowSchema,
  pnlSummaryCardSchema,
  tradeRowSchema
} from "./overview.js";

export const strategySummarySchema = z.object({
  strategyId: z.string().min(1),
  displayName: z.string().min(1),
  symbol: z.string().min(1),
  sourcePathMode: z.enum(["publisher_only", "direct_only", "hybrid"]),
  healthStatus: z.string().min(1),
  latestHeartbeatAt: isoDatetimeString.nullable().optional(),
  latestPnlSnapshotAt: isoDatetimeString.nullable().optional()
});

export const skipRowSchema = z.object({
  correlationId: z.string().min(1),
  strategyId: z.string().min(1),
  symbol: z.string().min(1).optional(),
  marketTicker: z.string().min(1),
  skipCategory: z.string().min(1),
  skipCode: z.string().min(1).nullable().optional(),
  reasonRaw: z.string().min(1),
  occurredAt: isoDatetimeString
});

export const strategyListResponseSchema = z.object({
  items: z.array(strategySummarySchema)
});

export const strategyDetailResponseSchema = z.object({
  strategy: strategySummarySchema,
  pnlSummary: pnlSummaryCardSchema,
  recentDecisions: z.array(decisionRowSchema),
  recentTrades: z.array(tradeRowSchema),
  recentSkips: z.array(skipRowSchema),
  activeAlerts: z.array(alertRowSchema)
});

export type StrategySummary = z.infer<typeof strategySummarySchema>;
export type SkipRow = z.infer<typeof skipRowSchema>;
export type StrategyListResponse = z.infer<typeof strategyListResponseSchema>;
export type StrategyDetailResponse = z.infer<typeof strategyDetailResponseSchema>;
