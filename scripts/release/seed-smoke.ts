import { closePool, query } from "../../packages/db/src/index.js";
import { loadFixture, resetFoundationalState } from "../../packages/testing/src/index.js";
import { sourceProfiles } from "../../packages/source-adapters/src/index.js";

import { SourceIngestService } from "../../apps/ingest/src/services/source-ingest-service.js";

function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1_000).toISOString();
}

function createHealthPayload(args: {
  readonly asset: string;
  readonly lastScanAt: string;
}): Record<string, unknown> {
  return {
    status: "ok",
    asset: args.asset,
    mode: "live",
    halted: false,
    halt_reason: null,
    last_scan_at: args.lastScanAt,
    live_execution_configured: true,
    config_warnings: []
  };
}

async function main(): Promise<void> {
  await resetFoundationalState();

  const sourceIngestService = new SourceIngestService();
  const ethScanAt = minutesAgoIso(4);
  const btcScanAt = minutesAgoIso(3);
  const solScanAt = minutesAgoIso(2);
  const xrpScanAt = minutesAgoIso(1);
  const orderCreatedAt = minutesAgoIso(3);
  const orderSucceededAt = minutesAgoIso(2);
  const queueCapturedAt = minutesAgoIso(1);

  const ethStatus = await loadFixture<Record<string, unknown>>("strategies/eth-status.json");
  const btcDashboard = await loadFixture<Record<string, unknown>>("strategies/btc-dashboard-live.json");
  const solDiagnostics = await loadFixture<Record<string, unknown>>(
    "strategies/sol-no-trade-diagnostics.json"
  );
  const orderCreated = await loadFixture<Record<string, unknown>>("publisher/order-created.json");
  const orderExecutionSucceeded = await loadFixture<Record<string, unknown>>(
    "publisher/order-execution-succeeded.json"
  );
  const queueMetric = await loadFixture<Record<string, unknown>>("rabbitmq/queue-metric.json");

  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.quantStatusV1,
    sourceRepo: "kalshi-eth-quant",
    strategyId: "eth",
    payload: {
      ...ethStatus,
      last_scan_at: ethScanAt,
      latest_decisions: Array.isArray(ethStatus.latest_decisions)
        ? ethStatus.latest_decisions.map((decision) => ({
            ...(decision as Record<string, unknown>),
            timestamp: ethScanAt
          }))
        : []
    }
  });

  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.quantHealthV1,
    sourceRepo: "kalshi-btc-quant",
    strategyId: "btc",
    payload: createHealthPayload({
      asset: "BTC",
      lastScanAt: btcScanAt
    })
  });

  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.quantDashboardLiveV1,
    sourceRepo: "kalshi-btc-quant",
    strategyId: "btc",
    payload: {
      ...btcDashboard,
      buyOrderIntent: Array.isArray(btcDashboard.buyOrderIntent)
        ? btcDashboard.buyOrderIntent.map((row) => ({
            ...(row as Record<string, unknown>),
            timestamp: btcScanAt
          }))
        : [],
      skippedTrades: Array.isArray(btcDashboard.skippedTrades)
        ? btcDashboard.skippedTrades.map((row) => ({
            ...(row as Record<string, unknown>),
            timestamp: btcScanAt
          }))
        : []
    }
  });

  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.quantHealthV1,
    sourceRepo: "kalshi-sol-quant",
    strategyId: "sol",
    payload: createHealthPayload({
      asset: "SOL",
      lastScanAt: solScanAt
    })
  });

  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.quantNoTradeDiagnosticsV1,
    sourceRepo: "kalshi-sol-quant",
    strategyId: "sol",
    payload: {
      ...solDiagnostics,
      ran_at: solScanAt,
      spot:
        solDiagnostics.spot && typeof solDiagnostics.spot === "object"
          ? {
              ...(solDiagnostics.spot as Record<string, unknown>),
              timestamp: solScanAt
            }
          : solDiagnostics.spot
    }
  });

  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.quantHealthV1,
    sourceRepo: "kalshi-xrp-quant",
    strategyId: "xrp",
    payload: createHealthPayload({
      asset: "XRP",
      lastScanAt: xrpScanAt
    })
  });

  await sourceIngestService.ingest({
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

  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.publisherResultV1,
    sourceRepo: "kalshi-integration-executor",
    payload: {
      ...orderExecutionSucceeded,
      occurredAt: orderSucceededAt
    },
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
    payload: {
      ...queueMetric,
      capturedAt: queueCapturedAt
    }
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
        'smoke-alert-overview-1',
        null,
        null,
        'queue_backlog_age',
        'warning',
        'resolved',
        null,
        'Queue backlog recovered',
        'The most recent smoke alert is resolved and retained for detail-route validation.',
        'kalshi.integration.executor',
        '{}'::jsonb,
        now() - interval '5 minutes',
        now() - interval '1 minute',
        now() - interval '1 minute'
      )
      on conflict (alert_id) do update
      set severity = excluded.severity,
          status = excluded.status,
          summary = excluded.summary,
          detail = excluded.detail,
          affected_component = excluded.affected_component,
          metadata = excluded.metadata,
          first_seen_at = excluded.first_seen_at,
          last_seen_at = excluded.last_seen_at,
          resolved_at = excluded.resolved_at
    `
  );

  const alertCheck = await query<{ alert_id: string; status: string }>(
    `
      select alert_id, status
      from alerts
      order by last_seen_at desc
      limit 1
    `
  );

  if (!alertCheck.rows[0]?.alert_id) {
    throw new Error("Smoke seed did not create an alert record.");
  }

  if (alertCheck.rows[0].status === "open") {
    throw new Error("Smoke seed left the overview in an open-alert degraded state.");
  }

  const strategies = await query<{
    strategy_id: string;
    latest_heartbeat_at: string | null;
  }>(
    `
      select
        strategy_id,
        max(occurred_at)::text as latest_heartbeat_at
      from heartbeats
      group by strategy_id
      order by strategy_id asc
    `
  );

  if (strategies.rows.length < 4) {
    throw new Error("Smoke seed did not create fresh heartbeat facts for all initial strategies.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
