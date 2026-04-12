import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { query } from "@kalshi-quant-dashboard/db";
import { sourceProfiles } from "@kalshi-quant-dashboard/source-adapters";
import {
  bootstrapTestDatabase,
  loadFixture,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { SourceIngestService } from "../../../apps/ingest/src/services/source-ingest-service.js";

describe.sequential("foundational mixed-source bindings", () => {
  const sourceIngestService = new SourceIngestService();

  beforeAll(async () => {
    await bootstrapTestDatabase();
  });

  afterAll(async () => {
    await shutdownTestDatabase();
  });

  beforeEach(async () => {
    await resetFoundationalState();
  });

  test("persist direct strategy, skip-only, position, and queue facts as first-class records", async () => {
    await sourceIngestService.ingest({
      sourceProfile: sourceProfiles.quantStatusV1,
      sourceRepo: "kalshi-eth-quant",
      strategyId: "eth",
      payload: await loadFixture("strategies/eth-status.json")
    });
    await sourceIngestService.ingest({
      sourceProfile: sourceProfiles.quantNoTradeDiagnosticsV1,
      sourceRepo: "kalshi-sol-quant",
      strategyId: "sol",
      payload: await loadFixture("strategies/sol-no-trade-diagnostics.json")
    });
    await sourceIngestService.ingest({
      sourceProfile: sourceProfiles.quantPositionsV1,
      sourceRepo: "kalshi-btc-quant",
      strategyId: "btc",
      payload: await loadFixture("strategies/btc-positions.json")
    });
    await sourceIngestService.ingest({
      sourceProfile: sourceProfiles.publisherEnvelopeV1,
      sourceRepo: "kalshi-integration-event-publisher",
      payload: await loadFixture("publisher/order-created.json"),
      metadata: {
        exchange: "kalshi.integration.events",
        queue: "kalshi.integration.executor",
        routingKey: "kalshi.integration.trading.order.created",
        deliveryTag: 11,
        sourceDeliveryOrdinal: 1
      }
    });
    await sourceIngestService.ingest({
      sourceProfile: sourceProfiles.rabbitMqManagementV1,
      sourceRepo: "rabbitmq-management",
      payload: await loadFixture("rabbitmq/queue-metric.json")
    });

    const decisionCount = await query<{ count: string }>("select count(*)::text as count from decisions");
    const tradeCount = await query<{ count: string }>("select count(*)::text as count from trades");
    const positionCount = await query<{ count: string }>("select count(*)::text as count from positions");
    const heartbeatCount = await query<{ count: string }>("select count(*)::text as count from heartbeats");
    const queueMetricCount = await query<{ count: string }>("select count(*)::text as count from queue_metrics");
    const solSkip = await query<{ reason_raw: string }>(
      "select reason_raw from decisions where strategy_id = 'sol' limit 1"
    );

    expect(Number(decisionCount.rows[0]?.count ?? 0)).toBe(3);
    expect(Number(tradeCount.rows[0]?.count ?? 0)).toBe(1);
    expect(Number(positionCount.rows[0]?.count ?? 0)).toBe(1);
    expect(Number(heartbeatCount.rows[0]?.count ?? 0)).toBe(1);
    expect(Number(queueMetricCount.rows[0]?.count ?? 0)).toBe(1);
    expect(solSkip.rows[0]?.reason_raw).toContain("no side passed gate");
  });

  test("merge replay and redelivery observations into one canonical fact with ordered convergence metadata", async () => {
    const payload = await loadFixture<Record<string, unknown>>("publisher/trade-intent-created.json");

    await sourceIngestService.ingest({
      sourceProfile: sourceProfiles.publisherEnvelopeV1,
      sourceRepo: "kalshi-integration-event-publisher",
      payload,
      metadata: {
        exchange: "kalshi.integration.events",
        queue: "kalshi.integration.executor",
        routingKey: "kalshi.integration.trading.trade-intent.created",
        deliveryTag: 1,
        sourceDeliveryOrdinal: 1,
        sourceSequence: 10,
        redelivered: false
      }
    });
    await sourceIngestService.ingest({
      sourceProfile: sourceProfiles.publisherEnvelopeV1,
      sourceRepo: "kalshi-integration-event-publisher",
      payload,
      replayKind: "redelivery",
      metadata: {
        exchange: "kalshi.integration.events",
        queue: "kalshi.integration.executor",
        routingKey: "kalshi.integration.trading.trade-intent.created",
        deliveryTag: 2,
        sourceDeliveryOrdinal: 2,
        sourceSequence: 11,
        redelivered: true
      }
    });

    const canonicalCount = await query<{ count: string }>(
      "select count(*)::text as count from canonical_events"
    );
    const observationCount = await query<{ count: string }>(
      "select count(*)::text as count from event_observations"
    );
    const ordering = await query<{ ordering: Record<string, unknown> }>(
      "select ordering from canonical_events limit 1"
    );

    expect(Number(canonicalCount.rows[0]?.count ?? 0)).toBe(1);
    expect(Number(observationCount.rows[0]?.count ?? 0)).toBe(2);
    expect(ordering.rows[0]?.ordering.hasRedelivery).toBe(true);
    expect(ordering.rows[0]?.ordering.brokerQueue).toBe("kalshi.integration.executor");
  });
});
