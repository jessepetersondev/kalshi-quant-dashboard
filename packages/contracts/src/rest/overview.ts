import { z } from "zod";

import { isoDatetimeString } from "../shared.js";

export const systemHealthSummarySchema = z.object({
  status: z.string().min(1),
  freshnessTimestamp: isoDatetimeString,
  degraded: z.boolean()
});

export const pnlSummaryCardSchema = z.object({
  scopeType: z.string().min(1),
  scopeKey: z.string().min(1),
  realizedPnlNet: z.number(),
  unrealizedPnlNet: z.number(),
  feesTotal: z.number(),
  stale: z.boolean().default(false),
  partial: z.boolean().default(false),
  freshnessTimestamp: isoDatetimeString.nullable().optional(),
  disagreementCount: z.number().int().nonnegative().default(0)
});

export const decisionRowSchema = z.object({
  correlationId: z.string().min(1),
  strategyId: z.string().min(1),
  symbol: z.string().min(1).optional(),
  marketTicker: z.string().min(1),
  decisionAction: z.string().min(1),
  reasonSummary: z.string().min(1).optional(),
  currentLifecycleStage: z.string().min(1),
  currentOutcomeStatus: z.string().min(1).optional(),
  latestEventAt: isoDatetimeString,
  sourcePathMode: z.enum(["publisher_only", "direct_only", "hybrid"]),
  degraded: z.boolean().default(false)
});

export const tradeRowSchema = z.object({
  correlationId: z.string().min(1),
  tradeAttemptKey: z.string().min(1),
  strategyId: z.string().min(1),
  symbol: z.string().min(1).optional(),
  marketTicker: z.string().min(1),
  status: z.string().min(1),
  publishStatus: z.string().min(1).nullable().optional(),
  lastResultStatus: z.string().min(1).nullable().optional(),
  latestSeenAt: isoDatetimeString,
  sourcePathMode: z.enum(["publisher_only", "direct_only", "hybrid"]),
  degraded: z.boolean().default(false)
});

export const queueRowSchema = z.object({
  componentName: z.string().min(1),
  queueName: z.string().min(1),
  messageCount: z.number().int().nonnegative(),
  messagesReady: z.number().int().nonnegative().optional(),
  messagesUnacknowledged: z.number().int().nonnegative().optional(),
  consumerCount: z.number().int().nonnegative(),
  oldestMessageAgeSeconds: z.number().nonnegative().nullable().optional(),
  dlqMessageCount: z.number().int().nonnegative().nullable().optional(),
  dlqGrowthTotal: z.number().int().nonnegative().nullable().optional(),
  reconnectStatus: z.string().min(1).nullable().optional(),
  sampledAt: isoDatetimeString
});

export const alertRowSchema = z.object({
  alertId: z.string().min(1),
  alertType: z.string().min(1),
  severity: z.string().min(1),
  status: z.string().min(1),
  summary: z.string().min(1),
  componentType: z.string().min(1).optional(),
  componentKey: z.string().min(1).optional(),
  latestSeenAt: isoDatetimeString,
  detailPath: z.string().min(1)
});

export const overviewResponseSchema = z.object({
  generatedAt: isoDatetimeString,
  healthSummary: systemHealthSummarySchema,
  aggregatePnl: pnlSummaryCardSchema,
  liveDecisionFeed: z.array(decisionRowSchema),
  liveTradeFeed: z.array(tradeRowSchema),
  queueSummary: z.array(queueRowSchema),
  recentAlerts: z.array(alertRowSchema)
});

export type SystemHealthSummary = z.infer<typeof systemHealthSummarySchema>;
export type PnlSummaryCard = z.infer<typeof pnlSummaryCardSchema>;
export type DecisionRow = z.infer<typeof decisionRowSchema>;
export type TradeRow = z.infer<typeof tradeRowSchema>;
export type QueueRow = z.infer<typeof queueRowSchema>;
export type AlertRow = z.infer<typeof alertRowSchema>;
export type OverviewResponse = z.infer<typeof overviewResponseSchema>;
