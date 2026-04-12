import type { FastifyInstance } from "fastify";

import { requireSessionContext } from "../auth/session-context.js";
import { SkipService } from "../services/skip-service.js";

export async function registerSkipRoutes(app: FastifyInstance): Promise<void> {
  const service = new SkipService();

  app.get(
    "/api/skips",
    {
      preHandler: app.requireCapability({})
    },
    async (request) => {
      const session = requireSessionContext(request).session;
      const parsedQuery = service.parseListQuery(request.query);

      return service.list({
        strategyScope: session.effectiveCapability.strategyScope,
        query: parsedQuery
      });
    }
  );
}
