import { query } from "@kalshi-quant-dashboard/db";
import { sourceProfiles } from "@kalshi-quant-dashboard/source-adapters";
import { loadFixture } from "@kalshi-quant-dashboard/testing";

import { SourceIngestService } from "../../../apps/ingest/src/services/source-ingest-service.js";

export async function seedLifecycleFacts(): Promise<void> {
  const service = new SourceIngestService();

  await service.ingest({
    sourceProfile: sourceProfiles.quantStatusV1,
    sourceRepo: "kalshi-eth-quant",
    strategyId: "eth",
    payload: await loadFixture("strategies/eth-status.json")
  });

  await service.ingest({
    sourceProfile: sourceProfiles.quantDashboardLiveV1,
    sourceRepo: "kalshi-btc-quant",
    strategyId: "btc",
    payload: await loadFixture("strategies/btc-dashboard-live.json")
  });

  await service.ingest({
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

  await service.ingest({
    sourceProfile: sourceProfiles.standaloneExecutorV1,
    sourceRepo: "kalshi-integration-executor",
    payload: await loadFixture("publisher/order-execution-succeeded.json"),
    metadata: {
      exchange: "kalshi.integration.events",
      queue: "kalshi.integration.executor",
      routingKey: "kalshi.integration.trading.order.execution_succeeded",
      deliveryTag: 12,
      sourceDeliveryOrdinal: 2
    }
  });
}

export async function seedReplayObservation(): Promise<void> {
  const service = new SourceIngestService();

  await service.ingest({
    sourceProfile: sourceProfiles.publisherEnvelopeV1,
    sourceRepo: "kalshi-integration-event-publisher",
    payload: await loadFixture("publisher/order-created.json"),
    replayKind: "replay",
    metadata: {
      exchange: "kalshi.integration.events",
      queue: "kalshi.integration.executor",
      routingKey: "kalshi.integration.trading.order.created",
      deliveryTag: 21,
      sourceDeliveryOrdinal: 3,
      redelivered: true
    }
  });
}

export async function getCanonicalOrderingFlags(correlationId: string) {
  const result = await query<{
    canonical_event_id: string;
    ordering: Record<string, unknown>;
  }>(
    `
      select canonical_event_id, ordering
      from canonical_events
      where correlation_id = $1
      order by occurred_at asc, canonical_event_id asc
    `,
    [correlationId]
  );

  return result.rows;
}
