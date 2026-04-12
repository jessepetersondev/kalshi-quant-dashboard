import { createLogger } from "@kalshi-quant-dashboard/observability";
import { createRuntimeConfig } from "@kalshi-quant-dashboard/config";

import { createIngestService } from "./app.js";
import { createIngestProbeServer } from "./health/probe-server.js";

const logger = createLogger({ name: "ingest-main" });

async function start() {
  const config = createRuntimeConfig();
  const service = createIngestService();
  const probeServer = createIngestProbeServer({
    port: config.ingestPort,
    state: service.healthState
  });
  await probeServer.start();
  await service.start();

  const shutdown = async () => {
    await probeServer.stop();
    await service.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  logger.error({ err: error }, "Failed to start ingest service.");
  process.exit(1);
});
