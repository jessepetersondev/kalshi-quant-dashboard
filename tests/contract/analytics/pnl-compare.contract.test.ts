import { describe, expect, test } from "vitest";

import { pnlTimeseriesResponseSchema } from "@kalshi-quant-dashboard/contracts";

describe("pnl compare contracts", () => {
  test("parse compare-mode timeseries payloads", () => {
    const payload = pnlTimeseriesResponseSchema.parse({
      generatedAt: "2026-04-11T12:16:00Z",
      bucket: "all-time",
      granularity: "day",
      rangeStartUtc: "2026-04-01T00:00:00Z",
      rangeEndUtc: "2026-04-11T12:16:00Z",
      series: [
        {
          bucketStart: "2026-04-10T00:00:00Z",
          bucketEnd: "2026-04-11T00:00:00Z",
          realizedPnlNet: 1.1,
          unrealizedPnlNet: 0.3,
          feesTotal: 0.04,
          totalPnlNet: 1.4,
          stale: false,
          partial: false
        }
      ],
      compare: [
        {
          strategyId: "btc",
          label: "BTC",
          summary: {
            scopeType: "strategy",
            scopeKey: "btc",
            label: "BTC",
            realizedPnlNet: 1.1,
            unrealizedPnlNet: 0.3,
            feesTotal: 0.04,
            totalPnlNet: 1.4,
            stale: false,
            partial: false,
            disagreement: false,
            freshnessTimestamp: "2026-04-11T12:16:00Z",
            metadata: {}
          },
          series: []
        }
      ],
      attribution: [],
      winLossSummary: {
        wins: 7,
        losses: 3,
        winRate: 0.7
      },
      disagreementCount: 1
    });

    expect(payload.compare[0]?.strategyId).toBe("btc");
    expect(payload.winLossSummary.winRate).toBeCloseTo(0.7, 5);
  });
});
