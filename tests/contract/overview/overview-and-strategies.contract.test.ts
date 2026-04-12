import { describe, expect, test } from "vitest";

import {
  overviewResponseSchema,
  strategyDetailResponseSchema,
  strategySummarySchema
} from "@kalshi-quant-dashboard/contracts";

describe("overview and strategy contracts", () => {
  test("parse an overview response", () => {
    const result = overviewResponseSchema.parse({
      generatedAt: "2026-04-11T12:00:00Z",
      healthSummary: {
        status: "ok",
        freshnessTimestamp: "2026-04-11T12:00:00Z",
        degraded: false
      },
      aggregatePnl: {
        scopeType: "portfolio",
        scopeKey: "aggregate",
        realizedPnlNet: 4.5,
        unrealizedPnlNet: 1.25,
        feesTotal: 0.5,
        stale: false,
        partial: false,
        freshnessTimestamp: "2026-04-11T12:00:00Z",
        disagreementCount: 0
      },
      liveDecisionFeed: [
        {
          correlationId: "corr-1",
          strategyId: "btc",
          symbol: "BTC",
          marketTicker: "KXBTC-YES",
          decisionAction: "buy",
          reasonSummary: "edge passed",
          currentLifecycleStage: "strategy_emission",
          currentOutcomeStatus: "emitted",
          latestEventAt: "2026-04-11T12:00:00Z",
          sourcePathMode: "hybrid",
          degraded: false
        }
      ],
      liveTradeFeed: [
        {
          correlationId: "corr-1",
          tradeAttemptKey: "pub-1",
          strategyId: "btc",
          symbol: "BTC",
          marketTicker: "KXBTC-YES",
          status: "order.created",
          publishStatus: "published",
          lastResultStatus: null,
          latestSeenAt: "2026-04-11T12:00:01Z",
          sourcePathMode: "hybrid",
          degraded: false
        }
      ],
      queueSummary: [
        {
          componentName: "rabbitmq",
          queueName: "kalshi.integration.executor",
          messageCount: 12,
          messagesReady: 12,
          messagesUnacknowledged: 0,
          consumerCount: 1,
          oldestMessageAgeSeconds: 12,
          dlqMessageCount: 0,
          dlqGrowthTotal: 0,
          reconnectStatus: "connected",
          sampledAt: "2026-04-11T12:00:05Z"
        }
      ],
      recentAlerts: []
    });

    expect(result.aggregatePnl.scopeType).toBe("portfolio");
  });

  test("parse strategy summary and detail responses", () => {
    const strategy = strategySummarySchema.parse({
      strategyId: "eth",
      displayName: "ETH Quant",
      symbol: "ETH",
      sourcePathMode: "direct_only",
      healthStatus: "ok",
      latestHeartbeatAt: "2026-04-11T12:00:00Z",
      latestPnlSnapshotAt: "2026-04-11T12:00:01Z"
    });
    const detail = strategyDetailResponseSchema.parse({
      strategy,
      pnlSummary: {
        scopeType: "strategy",
        scopeKey: "eth",
        realizedPnlNet: 2,
        unrealizedPnlNet: 0.5,
        feesTotal: 0.1,
        stale: false,
        partial: false,
        freshnessTimestamp: "2026-04-11T12:00:01Z",
        disagreementCount: 0
      },
      recentDecisions: [],
      recentTrades: [],
      recentSkips: [],
      activeAlerts: []
    });

    expect(detail.strategy.symbol).toBe("ETH");
  });
});
