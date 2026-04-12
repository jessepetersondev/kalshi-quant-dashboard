import type { FastifyInstance } from "fastify";

import { requireSessionContext } from "../auth/session-context.js";
import { OperationsService } from "../services/operations-service.js";

export async function registerOperationsRoutes(app: FastifyInstance): Promise<void> {
  const service = new OperationsService();

  app.get(
    "/api/operations/queues",
    {
      preHandler: app.requireCapability({})
    },
    async (request) => {
      const session = requireSessionContext(request).session;
      service.parseQuery(request.query);

      return service.getSnapshot({
        strategyScope: session.effectiveCapability.strategyScope
      });
    }
  );
}
