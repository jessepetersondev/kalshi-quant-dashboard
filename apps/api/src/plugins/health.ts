import type { FastifyInstance } from "fastify";

import { healthProbeSchema, apiErrorSchema } from "@kalshi-quant-dashboard/contracts";
import { query } from "@kalshi-quant-dashboard/db";

declare module "fastify" {
  interface FastifyInstance {
    buildHealthProbe(mode: "liveness" | "readiness"): Promise<{
      statusCode: number;
      body: ReturnType<typeof healthProbeSchema.parse>;
    }>;
  }
}

export async function registerHealthPlugin(app: FastifyInstance): Promise<void> {
  app.decorate("buildHealthProbe", async (mode: "liveness" | "readiness") => {
    const checkedAt = new Date().toISOString();

    if (mode === "liveness") {
      return {
        statusCode: 200,
        body: healthProbeSchema.parse({
          status: "ok",
          service: "api",
          checkedAt,
          details: { mode }
        })
      };
    }

    try {
      await query("select 1 as ok");
      return {
        statusCode: 200,
        body: healthProbeSchema.parse({
          status: "ok",
          service: "api",
          checkedAt,
          details: {
            mode,
            database: "reachable",
            sessionCache: "ready",
            sse: "ready"
          }
        })
      };
    } catch (error) {
      return {
        statusCode: 503,
        body: healthProbeSchema.parse({
          status: "degraded",
          service: "api",
          checkedAt,
          details: apiErrorSchema.parse({
            error: {
              code: "database_unreachable",
              message: error instanceof Error ? error.message : "Unknown database error"
            }
          }).error
        })
      };
    }
  });
}
