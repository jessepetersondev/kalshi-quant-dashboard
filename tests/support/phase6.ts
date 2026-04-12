import { query } from "../../packages/db/src/index.js";
import { sourceProfiles } from "../../packages/source-adapters/src/index.js";
import { loadFixture } from "../../packages/testing/src/index.js";

import { SourceIngestService } from "../../apps/ingest/src/services/source-ingest-service.js";
import { PnlReconciliationService } from "../../apps/ingest/src/services/pnl-reconciliation-service.js";

interface PnlScenarioFixture {
  readonly strategyId: string;
  readonly marketTicker: string;
  readonly position: {
    readonly side: "yes" | "no";
    readonly contracts: number;
    readonly averageEntryPrice: number;
    readonly lastMarkedPrice: number;
    readonly feesPaid: number;
    readonly status: "open" | "partially_closed" | "closed" | "settled" | "degraded";
    readonly occurredAt: string;
    readonly metadata: Record<string, unknown>;
  };
  readonly trades: readonly {
    readonly tradeId: string;
    readonly correlationId: string;
    readonly status: string;
    readonly quantity: number;
    readonly occurredAt: string;
    readonly metadata: Record<string, unknown>;
  }[];
  readonly directSnapshotTotalPnl?: number;
}

export async function insertPnlScenarioFixture(relativePath: string): Promise<PnlScenarioFixture> {
  const fixture = await loadFixture<PnlScenarioFixture>(relativePath);

  await query(
    `
      insert into positions (
        position_snapshot_id,
        canonical_event_id,
        strategy_id,
        market_ticker,
        side,
        contracts,
        average_entry_price,
        last_marked_price,
        market_exposure,
        fees_paid,
        status,
        valuation_source,
        metadata,
        occurred_at
      )
      values (
        $1,
        null,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        'lifecycle_reconstruction',
        $11::jsonb,
        $12
      )
    `,
    [
      `position:${fixture.strategyId}:${fixture.marketTicker}`,
      fixture.strategyId,
      fixture.marketTicker,
      fixture.position.side,
      fixture.position.contracts,
      fixture.position.averageEntryPrice,
      fixture.position.lastMarkedPrice,
      fixture.position.contracts * fixture.position.lastMarkedPrice,
      fixture.position.feesPaid,
      fixture.position.status,
      JSON.stringify(fixture.position.metadata),
      fixture.position.occurredAt
    ]
  );

  for (const trade of fixture.trades) {
    const canonicalEventId = `canonical:${trade.tradeId}`;
    await query(
      `
        insert into canonical_events (
          canonical_event_id,
          correlation_id,
          strategy_id,
          canonical_family,
          lifecycle_stage,
          source_system,
          source_variant,
          source_repo,
          source_event_name,
          source_event_id,
          source_envelope_id,
          source_contract_version,
          adapter_version,
          source_path_mode,
          dedup_key,
          occurred_at,
          published_at,
          first_seen_at,
          last_seen_at,
          ordering,
          degraded_reasons,
          reconciliation_status,
          normalized_payload,
          raw_payload
        )
        values (
          $1,
          $2,
          $3,
          'trade',
          'terminal',
          'publisher',
          'fixture',
          'phase6-fixture',
          'trade.fixture',
          $4,
          $4,
          'v1',
          'test',
          'hybrid',
          $5,
          $6,
          $6,
          $6,
          $6,
          '{}'::jsonb,
          '[]'::jsonb,
          'consistent',
          $7::jsonb,
          $7::jsonb
        )
      `,
      [
        canonicalEventId,
        trade.correlationId,
        fixture.strategyId,
        trade.tradeId,
        `dedup:${trade.tradeId}`,
        trade.occurredAt,
        JSON.stringify(trade.metadata)
      ]
    );

    await query(
      `
        insert into trades (
          trade_id,
          canonical_event_id,
          correlation_id,
          strategy_id,
          market_ticker,
          side,
          action_type,
          quantity,
          status,
          source_path_mode,
          retry_count,
          publisher_order_id,
          client_order_id,
          external_order_id,
          kalshi_order_id,
          command_event_id,
          trade_intent_id,
          target_publisher_order_id,
          target_client_order_id,
          target_external_order_id,
          occurred_at,
          terminal_state_at,
          degraded_reasons,
          metadata
        )
        values (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          'buy_yes',
          $7,
          $8,
          'hybrid',
          0,
          $1,
          $1,
          $1,
          null,
          $1,
          null,
          null,
          null,
          null,
          $9,
          $9,
          '[]'::jsonb,
          $10::jsonb
        )
      `,
      [
        trade.tradeId,
        canonicalEventId,
        trade.correlationId,
        fixture.strategyId,
        fixture.marketTicker,
        fixture.position.side,
        trade.quantity,
        trade.status,
        trade.occurredAt,
        JSON.stringify(trade.metadata)
      ]
    );
  }

  if (typeof fixture.directSnapshotTotalPnl === "number") {
    await query(
      `
        insert into pnl_snapshots (
          pnl_snapshot_id,
          canonical_event_id,
          strategy_id,
          symbol,
          market_ticker,
          bucket_type,
          range_start,
          range_end,
          realized_pnl,
          unrealized_pnl,
          fees,
          total_pnl,
          stale,
          partial,
          valuation_source,
          metadata,
          occurred_at
        )
        values (
          $1,
          null,
          $2,
          $3,
          null,
          'current',
          null,
          null,
          $4,
          0,
          0,
          $4,
          false,
          false,
          'strategy_snapshot',
          '{}'::jsonb,
          $5
        )
      `,
      [
        `snapshot:${fixture.strategyId}:${fixture.marketTicker}`,
        fixture.strategyId,
        fixture.strategyId.toUpperCase(),
        fixture.directSnapshotTotalPnl,
        fixture.position.occurredAt
      ]
    );
  }

  return fixture;
}

export async function seedAnalyticsFacts(): Promise<void> {
  const ingest = new SourceIngestService();

  await ingest.ingest({
    sourceProfile: sourceProfiles.quantStatusV1,
    sourceRepo: "kalshi-btc-quant",
    strategyId: "btc",
    payload: await loadFixture("skips/skip-only.json")
  });
  await ingest.ingest({
    sourceProfile: sourceProfiles.quantNoTradeDiagnosticsV1,
    sourceRepo: "kalshi-eth-quant",
    strategyId: "eth",
    payload: await loadFixture("skips/no-order.json")
  });

  await insertPnlScenarioFixture("pnl/partial-fill.json");
  await insertPnlScenarioFixture("pnl/partial-close.json");
  await insertPnlScenarioFixture("pnl/settlement.json");
  await insertPnlScenarioFixture("pnl/stale-mark.json");
  await insertPnlScenarioFixture("pnl/disagreement.json");

  await new PnlReconciliationService().reconcileStrategies(["btc", "eth", "sol", "xrp"]);
}

export async function seedOperationsFacts(): Promise<void> {
  const ingest = new SourceIngestService();
  const heartbeat = await loadFixture<Record<string, unknown>>("heartbeats/strategy-heartbeat.json");
  const queueMetric = await loadFixture<Record<string, unknown>>("rabbitmq/queue-metric.json");

  await ingest.ingest({
    sourceProfile: sourceProfiles.quantHealthV1,
    sourceRepo: "kalshi-eth-quant",
    strategyId: "eth",
    payload: {
      ...heartbeat,
      halted: true,
      halt_reason: "collector disconnected",
      last_scan_at: "2026-04-11T12:12:00Z"
    }
  });

  await ingest.ingest({
    sourceProfile: sourceProfiles.rabbitMqManagementV1,
    sourceRepo: "rabbitmq-management",
    payload: {
      ...queueMetric,
      queueName: "kalshi.integration.executor.dlq",
      messageCount: 4,
      deadLetterSize: 4,
      deadLetterGrowth: 3
    }
  });

  await ingest.ingest({
    sourceProfile: sourceProfiles.rabbitMqManagementV1,
    sourceRepo: "rabbitmq-management",
    payload: {
      ...queueMetric,
      queueName: "kalshi.integration.executor",
      capturedAt: "2026-04-11T12:15:00Z",
      oldestMessageAgeMs: 45_000,
      consumerCount: 0
    }
  });
}

export async function seedPhase6Facts(): Promise<void> {
  await seedAnalyticsFacts();
  await seedOperationsFacts();
}
