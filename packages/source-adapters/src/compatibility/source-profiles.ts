import type { ZodTypeAny } from "zod";

import {
  deadLetterRecordSchema,
  executorEnvelopeSchema,
  executionRecordSchema,
  noTradeDiagnosticSchema,
  publisherEnvelopeSchema,
  publisherResultEnvelopeSchema,
  quantDashboardLiveSchema,
  quantHealthSchema,
  quantOrdersEnvelopeSchema,
  quantPnlSchema,
  quantPositionsEnvelopeSchema,
  rabbitMqQueueMetricSampleSchema,
  quantRealizedPnlSchema,
  quantStatusSchema,
  quantTradesEnvelopeSchema
} from "@kalshi-quant-dashboard/contracts";

export interface SourceProfile {
  readonly sourceSystem:
    | "strategy_adapter"
    | "publisher"
    | "executor"
    | "rabbitmq_management";
  readonly sourceVariant: string;
  readonly contractVersion: string;
  readonly transportType: "rabbitmq_consumer" | "http_poll" | "seed_fixture";
  readonly parser: ZodTypeAny;
  readonly capabilities: readonly string[];
}

export const sourceProfiles = {
  publisherEnvelopeV1: {
    sourceSystem: "publisher",
    sourceVariant: "publisher-envelope-v1",
    contractVersion: "v1",
    transportType: "rabbitmq_consumer",
    parser: publisherEnvelopeSchema,
    capabilities: ["trade_intent", "trade", "routing_metadata", "result_events"]
  },
  publisherResultV1: {
    sourceSystem: "publisher",
    sourceVariant: "publisher-result-v1",
    contractVersion: "v1",
    transportType: "rabbitmq_consumer",
    parser: publisherResultEnvelopeSchema,
    capabilities: ["executor_results", "routing_metadata"]
  },
  standaloneExecutorV1: {
    sourceSystem: "executor",
    sourceVariant: "standalone-executor-v1",
    contractVersion: "v1",
    transportType: "rabbitmq_consumer",
    parser: executorEnvelopeSchema.or(executionRecordSchema),
    capabilities: ["execution_records", "terminal_status", "order_aliases", "result_events"]
  },
  standaloneDeadLetterV1: {
    sourceSystem: "executor",
    sourceVariant: "standalone-executor-dead-letter-v1",
    contractVersion: "v1",
    transportType: "seed_fixture",
    parser: deadLetterRecordSchema,
    capabilities: ["dead_letter", "replay_tracking"]
  },
  quantHealthV1: {
    sourceSystem: "strategy_adapter",
    sourceVariant: "quant-health-v1",
    contractVersion: "v1",
    transportType: "http_poll",
    parser: quantHealthSchema,
    capabilities: ["heartbeat", "strategy_health"]
  },
  quantStatusV1: {
    sourceSystem: "strategy_adapter",
    sourceVariant: "quant-runtime-v1",
    contractVersion: "v1",
    transportType: "http_poll",
    parser: quantStatusSchema,
    capabilities: ["decision_feed", "runtime_status"]
  },
  quantTradesV1: {
    sourceSystem: "strategy_adapter",
    sourceVariant: "quant-trades-v1",
    contractVersion: "v1",
    transportType: "http_poll",
    parser: quantTradesEnvelopeSchema,
    capabilities: ["trade_history", "fills", "realized_pnl"]
  },
  quantPositionsV1: {
    sourceSystem: "strategy_adapter",
    sourceVariant: "quant-positions-v1",
    contractVersion: "v1",
    transportType: "http_poll",
    parser: quantPositionsEnvelopeSchema,
    capabilities: ["position_history", "position_snapshots"]
  },
  quantOrdersV1: {
    sourceSystem: "strategy_adapter",
    sourceVariant: "quant-orders-v1",
    contractVersion: "v1",
    transportType: "http_poll",
    parser: quantOrdersEnvelopeSchema,
    capabilities: ["order_history", "live_orders"]
  },
  quantPnlV1: {
    sourceSystem: "strategy_adapter",
    sourceVariant: "quant-pnl-v1",
    contractVersion: "v1",
    transportType: "http_poll",
    parser: quantPnlSchema,
    capabilities: ["pnl_snapshot"]
  },
  quantRealizedPnlV1: {
    sourceSystem: "strategy_adapter",
    sourceVariant: "quant-realized-pnl-v1",
    contractVersion: "v1",
    transportType: "http_poll",
    parser: quantRealizedPnlSchema,
    capabilities: ["realized_pnl"]
  },
  quantDashboardLiveV1: {
    sourceSystem: "strategy_adapter",
    sourceVariant: "quant-dashboard-live-v1",
    contractVersion: "v1",
    transportType: "http_poll",
    parser: quantDashboardLiveSchema,
    capabilities: ["execution_sets", "skip_feed"]
  },
  quantNoTradeDiagnosticsV1: {
    sourceSystem: "strategy_adapter",
    sourceVariant: "quant-no-trade-diagnostics-v1",
    contractVersion: "v1",
    transportType: "http_poll",
    parser: noTradeDiagnosticSchema,
    capabilities: ["skip_only", "no_trade_reason_breakdown"]
  },
  rabbitMqManagementV1: {
    sourceSystem: "rabbitmq_management",
    sourceVariant: "rabbitmq-management-v1",
    contractVersion: "v1",
    transportType: "http_poll",
    parser: rabbitMqQueueMetricSampleSchema,
    capabilities: ["queue_depth", "consumer_count", "backlog_age", "dlq_size"]
  }
} as const satisfies Record<string, SourceProfile>;

export type SourceProfileKey = keyof typeof sourceProfiles;
