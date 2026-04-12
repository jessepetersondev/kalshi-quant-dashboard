import type { FastifyInstance } from "fastify";

import { overviewResponseSchema } from "@kalshi-quant-dashboard/contracts";

import { requireSessionContext } from "../auth/session-context.js";
import { OverviewService } from "../services/overview-service.js";

export async function registerOverviewRoutes(app: FastifyInstance): Promise<void> {
  const overviewService = new OverviewService();

  app.get(
    "/api/overview",
    {
      preHandler: app.requireCapability({})
    },
    async (request) => {
      const session = requireSessionContext(request).session;
      return overviewResponseSchema.parse(
        await overviewService.getOverview({
          strategyScope: session.effectiveCapability.strategyScope
        })
      );
    }
  );
}
