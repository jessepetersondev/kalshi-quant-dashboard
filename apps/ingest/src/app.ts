import { createRuntimeConfig } from "@kalshi-quant-dashboard/config";
import { createLogger } from "@kalshi-quant-dashboard/observability";

import { CollectorRunner } from "./collectors/collector-runner.js";
import { IngestHealthState } from "./health/ingest-health-state.js";
import { buildMixedSourceRuntime } from "./runtime/build-mixed-source-runtime.js";
import { SmokeHeartbeatRefresher } from "./runtime/smoke-heartbeat-refresher.js";
import { SourceIngestService } from "./services/source-ingest-service.js";

export interface IngestService {
  readonly sourceIngestService: SourceIngestService;
  readonly healthState: IngestHealthState;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createIngestService(): IngestService {
  const config = createRuntimeConfig();
  const logger = createLogger({ name: "ingest" });
  const sourceIngestService = new SourceIngestService();
  const runtime = buildMixedSourceRuntime(sourceIngestService);
  const runner = new CollectorRunner(runtime.collectors);
  const smokeHeartbeatRefresher = config.ingestRuntime.enableSmokeHeartbeatRefresh
    ? new SmokeHeartbeatRefresher(sourceIngestService)
    : null;
  const healthState = new IngestHealthState({
    collectorsEnabled: runtime.collectors.length > 0 || smokeHeartbeatRefresher !== null,
    consumersEnabled: runtime.consumers.length > 0
  });
  let interval: NodeJS.Timeout | undefined;

  async function runCollectors() {
    try {
      await runner.runAll();
      if (smokeHeartbeatRefresher) {
        await smokeHeartbeatRefresher.refresh();
      }
      healthState.markCollectorSuccess();
    } catch (error) {
      healthState.markCollectorFailure(error);
      throw error;
    }
  }

  return {
    sourceIngestService,
    healthState,
    async start() {
      healthState.markStarted();

      try {
        for (const consumer of runtime.consumers) {
          await consumer.start();
        }
        healthState.markConsumersReady();
      } catch (error) {
        healthState.markConsumerFailure(error);
        throw error;
      }

      await runCollectors().catch((error) => {
        logger.error({ err: error }, "Initial collector run failed.");
      });
      logger.info({ port: config.ingestPort }, "Ingest service started.");
      interval = setInterval(() => {
        void runCollectors().catch((error) => {
          logger.error({ err: error }, "Collector run failed.");
        });
      }, config.ingestPollIntervalMs);
    },
    async stop() {
      if (interval) {
        clearInterval(interval);
        interval = undefined;
      }
      for (const consumer of runtime.consumers) {
        await consumer.stop();
      }
      logger.info("Ingest service stopped.");
    }
  };
}
