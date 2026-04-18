import {
  loadSeededStrategyRegistry,
  type StrategyDefinition
} from "@kalshi-quant-dashboard/source-adapters";
import { createRuntimeConfig } from "@kalshi-quant-dashboard/config";

import type { CollectorHandle } from "../collectors/collector-runner.js";
import type { SourceIngestService } from "../services/source-ingest-service.js";
import { buildQuantRuntimeCollectors } from "../adapters/http/quant-runtime-collector.js";
import { buildStrategyHealthCollector } from "../adapters/http/strategy-health-collector.js";
import { buildRabbitMqManagementCollector } from "../adapters/http/rabbitmq-management-collector.js";
import { buildPublisherDiagnosticsCollector } from "../adapters/http/publisher-diagnostics-collector.js";
import { buildExecutorHealthCollector } from "../adapters/http/executor-health-collector.js";
import {
  ConsumerSupervisor,
  type RuntimeConsumer
} from "../consumers/consumer-supervisor.js";

function buildStrategyCollectors(
  strategy: StrategyDefinition,
  sourceIngestService: SourceIngestService
): CollectorHandle[] {
  return [
    buildStrategyHealthCollector(strategy, sourceIngestService),
    ...buildQuantRuntimeCollectors(strategy, sourceIngestService)
  ];
}

export function buildMixedSourceRuntime(sourceIngestService: SourceIngestService): {
  collectors: CollectorHandle[];
  consumers: readonly RuntimeConsumer[];
} {
  const runtimeConfig = createRuntimeConfig();
  const strategyRegistry = loadSeededStrategyRegistry();
  const enabledStrategies = new Set(runtimeConfig.ingestRuntime.enabledStrategies);
  const strategies =
    enabledStrategies.size > 0
      ? strategyRegistry.list().filter((strategy) => enabledStrategies.has(strategy.strategyId))
      : strategyRegistry.list();
  const collectors: CollectorHandle[] = [];

  if (runtimeConfig.ingestRuntime.enableStrategyCollectors) {
    collectors.push(
      ...strategies.flatMap((strategy) => buildStrategyCollectors(strategy, sourceIngestService))
    );
  }

  if (runtimeConfig.ingestRuntime.enableRabbitMqManagementCollector) {
    collectors.push(
      buildRabbitMqManagementCollector({
        baseUrl: runtimeConfig.rabbitMqManagementUrl,
        sourceIngestService
      })
    );
  }

  if (runtimeConfig.ingestRuntime.enablePublisherCollector) {
    collectors.push(
      buildPublisherDiagnosticsCollector({
        baseUrl: runtimeConfig.publisherBaseUrl,
        sourceIngestService
      })
    );
  }

  if (runtimeConfig.ingestRuntime.enableExecutorCollector) {
    collectors.push(
      buildExecutorHealthCollector({
        baseUrl: runtimeConfig.executorBaseUrl,
        sourceIngestService
      })
    );
  }

  const consumers = runtimeConfig.ingestRuntime.enableRabbitMqConsumers
    ? new ConsumerSupervisor(sourceIngestService, runtimeConfig).list()
    : [];

  return { collectors, consumers };
}
