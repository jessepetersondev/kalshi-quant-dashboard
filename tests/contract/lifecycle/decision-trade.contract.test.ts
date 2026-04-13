import { describe, expect, test } from "vitest";

import {
  decisionDetailResponseSchema,
  decisionListResponseSchema,
  decisionUpsertEventSchema,
  eventTimelineItemSchema,
  fillRowSchema,
  tradeDetailResponseSchema,
  tradeListResponseSchema,
  tradeUpsertEventSchema
} from "@kalshi-quant-dashboard/contracts";

describe("decision and trade lifecycle contracts", () => {
  test("parse paginated lifecycle responses", () => {
    const decisionList = decisionListResponseSchema.parse({
      items: [
        {
          correlationId: "corr-btc-1",
          strategyId: "btc",
          symbol: "BTC",
          marketTicker: "KXBTCD-TEST",
          decisionAction: "buy_yes",
          reasonSummary: "momentum entry",
          currentLifecycleStage: "strategy_emission",
          currentOutcomeStatus: "emitted",
          latestEventAt: "2026-04-11T12:00:00Z",
          sourcePathMode: "hybrid",
          degraded: false
        }
      ],
      pageInfo: {
        page: 1,
        pageSize: 50,
        totalItems: 1,
        totalPages: 1
      }
    });
    const tradeList = tradeListResponseSchema.parse({
      items: [
        {
          correlationId: "corr-btc-1",
          tradeAttemptKey: "publisher-order-1",
          strategyId: "btc",
          symbol: "BTC",
          marketTicker: "KXBTCD-TEST",
          status: "accepted",
          publishStatus: "published",
          lastResultStatus: "accepted",
          latestSeenAt: "2026-04-11T12:00:03Z",
          sourcePathMode: "hybrid",
          degraded: false
        }
      ],
      pageInfo: {
        page: 1,
        pageSize: 50,
        totalItems: 1,
        totalPages: 1
      }
    });

    expect(decisionList.items).toHaveLength(1);
    expect(tradeList.items).toHaveLength(1);
  });

  test("parse detail responses and live upsert payloads", () => {
    const timelineItem = eventTimelineItemSchema.parse({
      canonicalEventId: "event-1",
      canonicalFamily: "trade",
      lifecycleStage: "publisher",
      occurredAt: "2026-04-11T12:00:01Z",
      publishedAt: "2026-04-11T12:00:01Z",
      firstSeenAt: "2026-04-11T12:00:01Z",
      sourceEventName: "order.created",
      sourcePathMode: "hybrid",
      ordering: {
        sourceSequence: 1,
        sourceDeliveryOrdinal: 1
      },
      degradedReasons: []
    });
    const fill = fillRowSchema.parse({
      fillFactId: "fill-1",
      filledQuantity: 2,
      fillPrice: 0.42,
      feeAmount: 0.01,
      occurredAt: "2026-04-11T12:00:03Z"
    });
    const decisionDetail = decisionDetailResponseSchema.parse({
      summary: {
        correlationId: "corr-btc-1",
        strategyId: "btc",
        symbol: "BTC",
        marketTicker: "KXBTCD-TEST",
        decisionAction: "buy_yes",
        reasonSummary: "momentum entry",
        currentLifecycleStage: "publisher",
        currentOutcomeStatus: "accepted",
        latestEventAt: "2026-04-11T12:00:03Z",
        sourcePathMode: "hybrid",
        degraded: false
      },
      timeline: [timelineItem],
      relatedTrades: [],
      rawPayloadAvailable: true,
      rawPayloads: [
        {
          canonicalEventId: "event-1",
          sourceSystem: "publisher",
          sourceEventName: "order.created",
          rawPayload: { ok: true }
        }
      ],
      debugMetadata: { route: "decision" }
    });
    const tradeDetail = tradeDetailResponseSchema.parse({
      summary: {
        correlationId: "corr-btc-1",
        tradeAttemptKey: "publisher-order-1",
        strategyId: "btc",
        symbol: "BTC",
        marketTicker: "KXBTCD-TEST",
        status: "accepted",
        publishStatus: "published",
        lastResultStatus: "accepted",
        latestSeenAt: "2026-04-11T12:00:03Z",
        sourcePathMode: "hybrid",
        degraded: false
      },
      timeline: [timelineItem],
      fills: [fill],
      publisherDashboardLink:
        "http://localhost:5001/dashboard/index.html?orderId=publisher-order-1&correlationId=corr-btc-1#outcomes",
      rawPayloadAvailable: true,
      rawPayloads: [
        {
          canonicalEventId: "event-1",
          sourceSystem: "publisher",
          sourceEventName: "order.execution_succeeded",
          rawPayload: { ok: true }
        }
      ],
      debugMetadata: { route: "trade" }
    });

    expect(decisionDetail.timeline[0]?.canonicalEventId).toBe("event-1");
    expect(tradeDetail.fills[0]?.fillFactId).toBe("fill-1");

    decisionUpsertEventSchema.parse({
      projectionChangeId: 10,
      channel: "decisions",
      kind: "upsert",
      detailLevel: "standard",
      emittedAt: "2026-04-11T12:00:05Z",
      effectiveOccurredAt: "2026-04-11T12:00:03Z",
      payload: {
        correlationId: "corr-btc-1",
        row: decisionDetail.summary
      }
    });
    tradeUpsertEventSchema.parse({
      projectionChangeId: 11,
      channel: "trades",
      kind: "upsert",
      detailLevel: "standard",
      emittedAt: "2026-04-11T12:00:05Z",
      effectiveOccurredAt: "2026-04-11T12:00:03Z",
      payload: {
        correlationId: "corr-btc-1",
        row: tradeDetail.summary
      }
    });
  });
});
