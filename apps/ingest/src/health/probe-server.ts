import { createServer, type Server } from "node:http";

import type { IngestHealthState } from "./ingest-health-state.js";

export function createIngestProbeServer(args: {
  readonly port: number;
  readonly state: IngestHealthState;
}) {
  let server: Server | undefined;

  return {
    async start() {
      server = createServer((request, response) => {
        const path = request.url ?? "/";
        const probeMode =
          path === "/health/ready" || path === "/api/health/readiness"
            ? "readiness"
            : path === "/health/live" || path === "/api/health/liveness"
              ? "liveness"
              : null;

        if (!probeMode) {
          response.writeHead(404, { "content-type": "application/json" });
          response.end(JSON.stringify({ error: "Not found" }));
          return;
        }

        const probe = args.state.buildProbe(probeMode);
        response.writeHead(probe.statusCode, { "content-type": "application/json" });
        response.end(JSON.stringify(probe.body));
      });

      await new Promise<void>((resolve, reject) => {
        server?.once("error", reject);
        server?.listen(args.port, "0.0.0.0", () => {
          server?.off("error", reject);
          resolve();
        });
      });
    },
    async stop() {
      await new Promise<void>((resolve, reject) => {
        if (!server) {
          resolve();
          return;
        }

        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
      server = undefined;
    }
  };
}
