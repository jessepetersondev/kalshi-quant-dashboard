import { SourceIngestService } from "../../../apps/ingest/src/services/source-ingest-service.js";
import { query } from "../../../packages/db/dist/db/src/index.js";
import { sourceProfiles } from "../../../packages/source-adapters/dist/source-adapters/src/index.js";
import {
  bootstrapTestDatabase,
  loadFixture,
  shutdownTestDatabase
} from "../../../packages/testing/dist/testing/src/index.js";
import {
  seedAnalyticsFacts,
  seedOperationsFacts
} from "../../support/phase6.js";

function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

async function seedLifecycleFacts(): Promise<void> {
  const service = new SourceIngestService();
  const decisionAt = minutesAgoIso(10);
  const orderCreatedAt = minutesAgoIso(9);
  const orderAcceptedAt = minutesAgoIso(8);
  const ethStatus = await loadFixture<Record<string, unknown>>("strategies/eth-status.json");
  const btcDashboard = await loadFixture<Record<string, unknown>>("strategies/btc-dashboard-live.json");
  const orderCreated = await loadFixture<Record<string, unknown>>("publisher/order-created.json");
  const orderExecutionSucceeded = await loadFixture<Record<string, unknown>>(
    "publisher/order-execution-succeeded.json"
  );

  await service.ingest({
    sourceProfile: sourceProfiles.quantStatusV1,
    sourceRepo: "kalshi-eth-quant",
    strategyId: "eth",
    payload: {
      ...ethStatus,
      last_scan_at: decisionAt,
      latest_decisions: Array.isArray(ethStatus.latest_decisions)
        ? ethStatus.latest_decisions.map((decision) => ({
            ...(decision as Record<string, unknown>),
            timestamp: decisionAt
          }))
        : []
    }
  });

  await service.ingest({
    sourceProfile: sourceProfiles.quantDashboardLiveV1,
    sourceRepo: "kalshi-btc-quant",
    strategyId: "btc",
    payload: {
      ...btcDashboard,
      buyOrderIntent: Array.isArray(btcDashboard.buyOrderIntent)
        ? btcDashboard.buyOrderIntent.map((row) => ({
            ...(row as Record<string, unknown>),
            timestamp: decisionAt
          }))
        : [],
      skippedTrades: Array.isArray(btcDashboard.skippedTrades)
        ? btcDashboard.skippedTrades.map((row) => ({
            ...(row as Record<string, unknown>),
            timestamp: decisionAt
          }))
        : []
    }
  });

  await service.ingest({
    sourceProfile: sourceProfiles.publisherEnvelopeV1,
    sourceRepo: "kalshi-integration-event-publisher",
    payload: {
      ...orderCreated,
      occurredAt: orderCreatedAt
    },
    metadata: {
      exchange: "kalshi.integration.events",
      queue: "kalshi.integration.executor",
      routingKey: "kalshi.integration.trading.order.created",
      deliveryTag: 11,
      sourceDeliveryOrdinal: 1
    }
  });

  await service.ingest({
    sourceProfile: sourceProfiles.publisherResultV1,
    sourceRepo: "kalshi-integration-executor",
    payload: {
      ...orderExecutionSucceeded,
      occurredAt: orderAcceptedAt
    },
    metadata: {
      exchange: "kalshi.integration.events",
      queue: "kalshi.integration.executor",
      routingKey: "kalshi.integration.trading.order.execution_succeeded",
      deliveryTag: 12,
      sourceDeliveryOrdinal: 2
    }
  });
}

async function seedReplayObservation(): Promise<void> {
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

async function seedOverviewFacts(): Promise<void> {
  const sourceIngestService = new SourceIngestService();

  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.quantStatusV1,
    sourceRepo: "kalshi-eth-quant",
    strategyId: "eth",
    payload: await loadFixture("strategies/eth-status.json")
  });
  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.quantDashboardLiveV1,
    sourceRepo: "kalshi-btc-quant",
    strategyId: "btc",
    payload: await loadFixture("strategies/btc-dashboard-live.json")
  });
  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.quantNoTradeDiagnosticsV1,
    sourceRepo: "kalshi-sol-quant",
    strategyId: "sol",
    payload: await loadFixture("strategies/sol-no-trade-diagnostics.json")
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
    sourceProfile: sourceProfiles.publisherResultV1,
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
  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.rabbitMqManagementV1,
    sourceRepo: "rabbitmq-management",
    payload: await loadFixture("rabbitmq/queue-metric.json")
  });
  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.quantPnlV1,
    sourceRepo: "kalshi-xrp-quant",
    strategyId: "xrp",
    payload: await loadFixture("strategies/xrp-pnl.json")
  });

  await query(
    `
      insert into alerts (
        alert_id,
        correlation_id,
        strategy_id,
        alert_type,
        severity,
        status,
        source_canonical_event_id,
        summary,
        detail,
        affected_component,
        metadata,
        first_seen_at,
        last_seen_at,
        resolved_at
      )
      values (
        'alert-overview-1',
        null,
        'btc',
        'queue_backlog_age',
        'warning',
        'open',
        null,
        'Executor queue age exceeded threshold',
        'Backlog age is above threshold',
        'kalshi.integration.executor',
        '{}'::jsonb,
        '2026-04-11T12:00:05Z',
        '2026-04-11T12:00:05Z',
        null
      )
      on conflict (alert_id) do update
      set summary = excluded.summary,
          detail = excluded.detail,
          last_seen_at = excluded.last_seen_at,
          status = excluded.status
    `
  );
}

export async function prepareOverviewScenario(): Promise<void> {
  await bootstrapTestDatabase();
  await seedOverviewFacts();
}

export async function prepareLifecycleScenario(): Promise<void> {
  await bootstrapTestDatabase();
  await seedLifecycleFacts();
}

export async function prepareAnalyticsScenario(): Promise<void> {
  await bootstrapTestDatabase();
  await seedAnalyticsFacts();
}

export async function prepareOperationsScenario(): Promise<void> {
  await bootstrapTestDatabase();
  await seedOperationsFacts();
}

export async function appendOverviewDecisionUpdate(): Promise<void> {
  const sourceIngestService = new SourceIngestService();
  const payload = await loadFixture<Record<string, unknown>>("strategies/eth-status.json");
  const latestDecisions = Array.isArray(payload.latest_decisions)
    ? [...payload.latest_decisions]
    : [];
  const existingDecision = (latestDecisions[0] ?? {}) as Record<string, unknown>;

  latestDecisions[0] = {
    ...existingDecision,
    ticker: "KXETHD-LIVE-2",
    title: "ETH breakout",
    reason: "breakout resumed above session high",
    timestamp: "2026-04-11T12:05:00Z"
  };

  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.quantStatusV1,
    sourceRepo: "kalshi-eth-quant",
    strategyId: "eth",
    payload: {
      ...payload,
      last_scan_at: "2026-04-11T12:05:00Z",
      latest_decisions: latestDecisions
    }
  });
}

export async function appendTradeLifecycleUpdate(): Promise<void> {
  const sourceIngestService = new SourceIngestService();
  const orderCreated = await loadFixture<Record<string, unknown>>("publisher/order-created.json");
  const orderAttributes = { ...(orderCreated.attributes as Record<string, unknown>) };
  const executionSucceeded = await loadFixture<Record<string, unknown>>(
    "publisher/order-execution-succeeded.json"
  );
  const executionAttributes = {
    ...(executionSucceeded.attributes as Record<string, unknown>)
  };

  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.publisherEnvelopeV1,
    sourceRepo: "kalshi-integration-event-publisher",
    payload: {
      ...orderCreated,
      id: "44444444-4444-4444-4444-444444444444",
      resourceId: "publisher-order-2",
      correlationId: "corr-btc-2",
      idempotencyKey: "idem-btc-2",
      attributes: {
        ...orderAttributes,
        ticker: "KXBTCD-LIVE2",
        publisherOrderId: "publisher-order-2",
        clientOrderId: "client-order-2",
        tradeIntentId: "trade-intent-2"
      },
      occurredAt: "2026-04-11T12:05:01Z"
    },
    metadata: {
      exchange: "kalshi.integration.events",
      queue: "kalshi.integration.executor",
      routingKey: "kalshi.integration.trading.order.created",
      deliveryTag: 31,
      sourceDeliveryOrdinal: 4
    }
  });
  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.publisherResultV1,
    sourceRepo: "kalshi-integration-executor",
    payload: {
      ...executionSucceeded,
      id: "55555555-5555-5555-5555-555555555555",
      resourceId: "publisher-order-2",
      correlationId: "corr-btc-2",
      idempotencyKey: "idem-btc-2",
      attributes: {
        ...executionAttributes,
        publisherOrderId: "publisher-order-2",
        clientOrderId: "client-order-2",
        externalOrderId: "external-order-2",
        commandEventId: "command-event-2"
      },
      occurredAt: "2026-04-11T12:05:03Z"
    },
    metadata: {
      exchange: "kalshi.integration.events",
      queue: "kalshi.integration.executor",
      routingKey: "kalshi.integration.trading.order.execution_succeeded",
      deliveryTag: 32,
      sourceDeliveryOrdinal: 5
    }
  });
}

export async function appendReplayObservation(): Promise<void> {
  await seedReplayObservation();
}

export async function shutdownScenarioDatabase(): Promise<void> {
  await shutdownTestDatabase();
}
