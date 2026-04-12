import { describe, expect, test } from "vitest";

import type { PnlSummaryCard } from "@kalshi-quant-dashboard/contracts";

import {
  aggregatePnlSummaries,
  buildSystemHealthSummary
} from "../../../apps/ingest/src/projections/overview-projector.js";

describe("overview selectors", () => {
  test("aggregate visible strategy pnl into a portfolio card", () => {
    const cards: PnlSummaryCard[] = [
      {
        scopeType: "strategy",
        scopeKey: "btc",
        realizedPnlNet: 12.5,
        unrealizedPnlNet: 1.25,
        feesTotal: 0.5,
        stale: false,
        partial: false,
        freshnessTimestamp: "2026-04-11T12:00:00Z",
        disagreementCount: 0
      },
      {
        scopeType: "strategy",
        scopeKey: "eth",
        realizedPnlNet: -2.25,
        unrealizedPnlNet: 4.75,
        feesTotal: 0.25,
        stale: true,
        partial: false,
        freshnessTimestamp: "2026-04-11T12:01:00Z",
        disagreementCount: 1
      }
    ];

    const result = aggregatePnlSummaries(cards, "2026-04-11T12:05:00Z");

    expect(result.scopeType).toBe("portfolio");
    expect(result.scopeKey).toBe("aggregate");
    expect(result.realizedPnlNet).toBe(10.25);
    expect(result.unrealizedPnlNet).toBe(6);
    expect(result.feesTotal).toBe(0.75);
    expect(result.stale).toBe(true);
    expect(result.partial).toBe(false);
    expect(result.disagreementCount).toBe(1);
    expect(result.freshnessTimestamp).toBe("2026-04-11T12:01:00Z");
  });

  test("mark health degraded when alerts are open or queue reconnect is active", () => {
    const summary = buildSystemHealthSummary({
      generatedAt: "2026-04-11T12:05:00Z",
      latestFreshnessAt: "2026-04-11T12:04:30Z",
      openAlertCount: 2,
      reconnecting: true
    });

    expect(summary.status).toBe("degraded");
    expect(summary.degraded).toBe(true);
    expect(summary.freshnessTimestamp).toBe("2026-04-11T12:04:30Z");
  });
});
