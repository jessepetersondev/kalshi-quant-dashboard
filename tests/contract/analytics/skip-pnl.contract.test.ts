import { describe, expect, test } from "vitest";

import {
  pnlSummaryResponseSchema,
  pnlUpsertEventSchema,
  skipUpsertEventSchema,
  skipListResponseSchema
} from "@kalshi-quant-dashboard/contracts";

describe("skip and pnl contracts", () => {
  test("parse skip list responses and pnl summary payloads", () => {
    const skips = skipListResponseSchema.parse({
      items: [
        {
          correlationId: "corr-btc-skip",
          strategyId: "btc",
          symbol: "BTC",
          marketTicker: "KXBTCD-SKIP-ONLY",
          skipCategory: "timing_window",
          skipCode: "cooldown_active",
          reasonRaw: "cooldown after recent fill",
          occurredAt: "2026-04-11T12:10:00Z"
        }
      ],
      taxonomyBreakdown: [
        {
          skipCategory: "timing_window",
          skipCode: "cooldown_active",
          count: 1,
          examples: ["cooldown after recent fill"]
        }
      ],
      pageInfo: {
        page: 1,
        pageSize: 50,
        totalItems: 1,
        totalPages: 1
      }
    });

    const pnl = pnlSummaryResponseSchema.parse({
      generatedAt: "2026-04-11T12:15:00Z",
      bucket: "24h",
      rangeStartUtc: "2026-04-10T12:15:00Z",
      rangeEndUtc: "2026-04-11T12:15:00Z",
      portfolioSummary: {
        scopeType: "portfolio",
        scopeKey: "portfolio",
        realizedPnlNet: 1.2,
        unrealizedPnlNet: 0.4,
        feesTotal: 0.1,
        stale: false,
        partial: false,
        freshnessTimestamp: "2026-04-11T12:15:00Z",
        disagreementCount: 1
      },
      strategyBreakdown: [],
      symbolBreakdown: [],
      marketBreakdown: [],
      compare: []
    });

    expect(skips.taxonomyBreakdown[0]?.skipCategory).toBe("timing_window");
    expect(pnl.portfolioSummary.disagreementCount).toBe(1);
  });

  test("parse pnl live upsert payloads", () => {
    const event = pnlUpsertEventSchema.parse({
      projectionChangeId: 11,
      channel: "pnl",
      kind: "upsert",
      detailLevel: "standard",
      emittedAt: "2026-04-11T12:15:05Z",
      effectiveOccurredAt: "2026-04-11T12:15:00Z",
      payload: {
        scopeType: "strategy",
        scopeKey: "btc",
        bucketType: "current_reconciled",
        summary: {
          scopeType: "strategy",
          scopeKey: "btc",
          realizedPnlNet: 0.9,
          unrealizedPnlNet: 0.2,
          feesTotal: 0.08,
          stale: false,
          partial: true,
          freshnessTimestamp: "2026-04-11T12:15:00Z",
          disagreementCount: 0
        }
      }
    });

    expect(event.payload.scopeKey).toBe("btc");
  });

  test("parse skip live upsert payloads", () => {
    const event = skipUpsertEventSchema.parse({
      projectionChangeId: 12,
      channel: "skips",
      kind: "upsert",
      detailLevel: "standard",
      emittedAt: "2026-04-11T12:15:05Z",
      effectiveOccurredAt: "2026-04-11T12:15:00Z",
      payload: {
        correlationId: "corr-btc-skip",
        row: {
          correlationId: "corr-btc-skip",
          strategyId: "btc",
          symbol: "BTC",
          marketTicker: "KXBTCD-SKIP-ONLY",
          skipCategory: "timing_window",
          skipCode: "cooldown_active",
          reasonRaw: "cooldown after recent fill",
          occurredAt: "2026-04-11T12:10:00Z"
        }
      }
    });

    expect(event.payload.row.skipCategory).toBe("timing_window");
  });
});
