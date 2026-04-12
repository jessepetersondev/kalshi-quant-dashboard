import type { FastifyInstance } from "fastify";

import { requireSessionContext } from "../auth/session-context.js";
import { PnlService } from "../services/pnl-service.js";

export async function registerPnlRoutes(app: FastifyInstance): Promise<void> {
  const service = new PnlService();

  app.get(
    "/api/pnl/summary",
    {
      preHandler: app.requireCapability({})
    },
    async (request) => {
      const session = requireSessionContext(request).session;
      const parsedQuery = service.parseSummaryQuery(request.query);

      return service.getSummary({
        strategyScope: session.effectiveCapability.strategyScope,
        query: parsedQuery
      });
    }
  );

  app.get(
    "/api/pnl/timeseries",
    {
      preHandler: app.requireCapability({})
    },
    async (request) => {
      const session = requireSessionContext(request).session;
      const parsedQuery = service.parseTimeseriesQuery(request.query);

      return service.getTimeseries({
        strategyScope: session.effectiveCapability.strategyScope,
        query: parsedQuery
      });
    }
  );
}
