import type { PoolClient } from "pg";

import { seedStrategies } from "./strategies.js";

const baseBindings = [
  {
    sourceBindingId: "binding-publisher-envelope-v1",
    sourceSystem: "publisher",
    sourceVariant: "publisher-envelope-v1",
    adapterVersion: "1.0.0",
    contractVersion: "v1",
    transportType: "rabbitmq_consumer",
    capabilities: ["trade_intent", "trade", "routing_metadata"],
    identityRules: { sourceEventId: true },
    orderingRules: { brokerMetadata: true },
    normalizationRules: { canonicalFamilyFromCategoryName: true }
  },
  {
    sourceBindingId: "binding-publisher-result-v1",
    sourceSystem: "publisher",
    sourceVariant: "publisher-result-v1",
    adapterVersion: "1.0.0",
    contractVersion: "v1",
    transportType: "rabbitmq_consumer",
    capabilities: ["executor_results"],
    identityRules: { sourceEventId: true },
    orderingRules: { brokerMetadata: true },
    normalizationRules: { terminalStateFromName: true }
  },
  {
    sourceBindingId: "binding-standalone-executor-v1",
    sourceSystem: "executor",
    sourceVariant: "standalone-executor-v1",
    adapterVersion: "1.0.0",
    contractVersion: "v1",
    transportType: "seed_fixture",
    capabilities: ["execution_records", "dead_letter"],
    identityRules: { externalOrderId: true },
    orderingRules: { recordedAtUtc: true },
    normalizationRules: { aliasStitching: true }
  },
  {
    sourceBindingId: "binding-quant-runtime-v1",
    sourceSystem: "strategy_adapter",
    sourceVariant: "quant-runtime-v1",
    adapterVersion: "1.0.0",
    contractVersion: "v1",
    transportType: "http_poll",
    capabilities: ["decisions", "positions", "pnl", "heartbeats"],
    identityRules: { synthesizedDecisionId: true },
    orderingRules: { timestamp: true },
    normalizationRules: { skipFactsFirstClass: true }
  },
  {
    sourceBindingId: "binding-quant-positions-v1",
    sourceSystem: "strategy_adapter",
    sourceVariant: "quant-positions-v1",
    adapterVersion: "1.0.0",
    contractVersion: "v1",
    transportType: "http_poll",
    capabilities: ["positions"],
    identityRules: { tickerUpdatedAt: true },
    orderingRules: { updatedAt: true },
    normalizationRules: { positionSnapshotsFirstClass: true }
  },
  {
    sourceBindingId: "binding-quant-dashboard-live-v1",
    sourceSystem: "strategy_adapter",
    sourceVariant: "quant-dashboard-live-v1",
    adapterVersion: "1.0.0",
    contractVersion: "v1",
    transportType: "http_poll",
    capabilities: ["execution_sets", "skip_feed"],
    identityRules: { scanTimestamp: true },
    orderingRules: { scanTimestamp: true },
    normalizationRules: { btcDashboardProjection: true }
  },
  {
    sourceBindingId: "binding-quant-no-trade-diagnostics-v1",
    sourceSystem: "strategy_adapter",
    sourceVariant: "quant-no-trade-diagnostics-v1",
    adapterVersion: "1.0.0",
    contractVersion: "v1",
    transportType: "http_poll",
    capabilities: ["skip_only"],
    identityRules: { ranAt: true },
    orderingRules: { ranAt: true },
    normalizationRules: { diagnosticsBecomeSkipFacts: true }
  },
  {
    sourceBindingId: "binding-rabbitmq-management-v1",
    sourceSystem: "rabbitmq_management",
    sourceVariant: "rabbitmq-management-v1",
    adapterVersion: "1.0.0",
    contractVersion: "v1",
    transportType: "http_poll",
    capabilities: ["queue_metrics"],
    identityRules: { queueName: true },
    orderingRules: { capturedAt: true },
    normalizationRules: { queueMetricsToOpsFacts: true }
  }
] as const;

export async function seedSourceBindingsTable(client: PoolClient): Promise<void> {
  for (const binding of baseBindings) {
    await client.query(
      `
        insert into source_bindings (
          source_binding_id,
          source_system,
          source_variant,
          adapter_version,
          contract_version,
          transport_type,
          capabilities,
          identity_rules,
          ordering_rules,
          normalization_rules,
          enabled
        )
        values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, true)
        on conflict (source_binding_id) do update
        set source_system = excluded.source_system,
            source_variant = excluded.source_variant,
            adapter_version = excluded.adapter_version,
            contract_version = excluded.contract_version,
            transport_type = excluded.transport_type,
            capabilities = excluded.capabilities,
            identity_rules = excluded.identity_rules,
            ordering_rules = excluded.ordering_rules,
            normalization_rules = excluded.normalization_rules,
            updated_at = now()
      `,
      [
        binding.sourceBindingId,
        binding.sourceSystem,
        binding.sourceVariant,
        binding.adapterVersion,
        binding.contractVersion,
        binding.transportType,
        JSON.stringify(binding.capabilities),
        JSON.stringify(binding.identityRules),
        JSON.stringify(binding.orderingRules),
        JSON.stringify(binding.normalizationRules)
      ]
    );
  }

  for (const strategy of seedStrategies) {
    const runtimeBindingId = `strategy-binding-${strategy.strategyId}-runtime`;
    await client.query(
      `
        insert into strategy_source_bindings (
          strategy_source_binding_id,
          strategy_id,
          source_binding_id,
          priority,
          enabled,
          used_for_decisions,
          used_for_trades,
          used_for_skips,
          used_for_positions,
          used_for_pnl,
          used_for_heartbeats,
          used_for_operations
        )
        values ($1, $2, 'binding-quant-runtime-v1', 10, true, true, true, true, true, true, true, false)
        on conflict (strategy_source_binding_id) do update
        set priority = excluded.priority,
            enabled = true,
            updated_at = now()
      `,
      [runtimeBindingId, strategy.strategyId]
    );

    await client.query(
      `
        insert into strategy_source_bindings (
          strategy_source_binding_id,
          strategy_id,
          source_binding_id,
          priority,
          enabled,
          used_for_decisions,
          used_for_trades,
          used_for_skips,
          used_for_positions,
          used_for_pnl,
          used_for_heartbeats,
          used_for_operations
        )
        values ($1, $2, 'binding-quant-positions-v1', 15, true, false, false, false, true, false, false, false)
        on conflict (strategy_source_binding_id) do update
        set priority = excluded.priority,
            enabled = true,
            updated_at = now()
      `,
      [`strategy-binding-${strategy.strategyId}-positions`, strategy.strategyId]
    );

    await client.query(
      `
        insert into strategy_endpoints (
          endpoint_id,
          strategy_id,
          source_binding_id,
          base_url,
          health_path,
          status_path,
          positions_path,
          trades_path,
          orders_path,
          pnl_path,
          realized_pnl_path,
          skip_diagnostics_path,
          dashboard_live_path,
          enabled
        )
        values (
          $1,
          $2,
          'binding-quant-runtime-v1',
          $3,
          '/health',
          '/api/status',
          '/api/positions',
          '/api/trades',
          '/api/orders',
          '/api/pnl',
          '/api/pnl/realized',
          $4,
          $5,
          true
        )
        on conflict (endpoint_id) do update
        set base_url = excluded.base_url,
            skip_diagnostics_path = excluded.skip_diagnostics_path,
            dashboard_live_path = excluded.dashboard_live_path,
            updated_at = now()
      `,
      [
        `endpoint-${strategy.strategyId}-runtime`,
        strategy.strategyId,
        strategy.baseUrl,
        strategy.skipDiagnosticsPath ?? null,
        strategy.dashboardLivePath ?? null
      ]
    );

    if (strategy.strategyId === "btc") {
      await client.query(
        `
          insert into strategy_source_bindings (
            strategy_source_binding_id,
            strategy_id,
            source_binding_id,
            priority,
            enabled,
            used_for_decisions,
            used_for_trades,
            used_for_skips,
            used_for_positions,
            used_for_pnl,
            used_for_heartbeats,
            used_for_operations
          )
          values ($1, $2, 'binding-publisher-envelope-v1', 20, true, false, true, false, false, false, false, false)
          on conflict (strategy_source_binding_id) do update
          set priority = excluded.priority,
              enabled = true,
              updated_at = now()
        `,
        [`strategy-binding-${strategy.strategyId}-publisher`, strategy.strategyId]
      );
    }
  }
}
