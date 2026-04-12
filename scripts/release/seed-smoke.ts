import { closePool, query } from "../../packages/db/src/index.js";
import { loadFixture } from "../../packages/testing/src/index.js";
import { sourceProfiles } from "../../packages/source-adapters/src/index.js";

import { SourceIngestService } from "../../apps/ingest/src/services/source-ingest-service.js";

async function main(): Promise<void> {
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
    payload: {
      ...(await loadFixture<Record<string, unknown>>("rabbitmq/queue-metric.json")),
      oldestMessageAgeMs: 60_000
    }
  });

  await sourceIngestService.ingest({
    sourceProfile: sourceProfiles.quantPnlV1,
    sourceRepo: "kalshi-xrp-quant",
    strategyId: "xrp",
    payload: await loadFixture("strategies/xrp-pnl.json")
  });

  const alertCheck = await query<{ alert_id: string }>(
    `
      select alert_id
      from alerts
      order by last_seen_at desc
      limit 1
    `
  );

  if (!alertCheck.rows[0]?.alert_id) {
    throw new Error("Smoke seed did not create an alert record.");
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
