import type { FastifyInstance } from "fastify";

import { requireSessionContext } from "../auth/session-context.js";
import { SystemHealthService } from "../services/system-health-service.js";

export async function registerSystemHealthRoutes(app: FastifyInstance): Promise<void> {
  const service = new SystemHealthService();

  app.get(
    "/api/system-health",
    {
      preHandler: app.requireCapability({})
    },
    async (request) => {
      const session = requireSessionContext(request).session;
      return service.getSnapshot({
        strategyScope: session.effectiveCapability.strategyScope
      });
    }
  );
}
