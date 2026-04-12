import { describe, expect, test } from "vitest";

import {
  overviewSnapshotEventSchema,
  streamStatusEventSchema
} from "@kalshi-quant-dashboard/contracts";

describe("overview live-update contracts", () => {
  test("parse an overview snapshot event", () => {
    const result = overviewSnapshotEventSchema.parse({
      projectionChangeId: 42,
      channel: "overview",
      kind: "snapshot",
      detailLevel: "standard",
      emittedAt: "2026-04-11T12:00:06Z",
      effectiveOccurredAt: "2026-04-11T12:00:05Z",
      payload: {
        generatedAt: "2026-04-11T12:00:05Z",
        healthSummary: {
          status: "ok",
          freshnessTimestamp: "2026-04-11T12:00:05Z",
          degraded: false
        },
        aggregatePnl: {
          scopeType: "portfolio",
          scopeKey: "aggregate",
          realizedPnlNet: 1,
          unrealizedPnlNet: 2,
          feesTotal: 0.25,
          stale: false,
          partial: false,
          freshnessTimestamp: "2026-04-11T12:00:05Z",
          disagreementCount: 0
        },
        liveDecisionFeed: [],
        liveTradeFeed: [],
        queueSummary: [],
        recentAlerts: []
      }
    });

    expect(result.channel).toBe("overview");
  });

  test("parse a standard stream status event", () => {
    const result = streamStatusEventSchema.parse({
      projectionChangeId: 42,
      channel: "overview",
      kind: "status",
      detailLevel: "standard",
      emittedAt: "2026-04-11T12:00:06Z",
      effectiveOccurredAt: "2026-04-11T12:00:05Z",
      payload: {
        connectionState: "connected",
        freshnessTimestamp: "2026-04-11T12:00:05Z",
        degraded: false,
        reconciliationPending: false
      }
    });

    expect(result.payload.connectionState).toBe("connected");
  });
});
