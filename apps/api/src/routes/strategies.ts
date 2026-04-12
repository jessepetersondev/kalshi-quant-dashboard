import type { FastifyInstance } from "fastify";

import { apiErrorSchema } from "@kalshi-quant-dashboard/contracts";

import { requireSessionContext } from "../auth/session-context.js";
import { StrategyService } from "../services/strategy-service.js";

export async function registerStrategyRoutes(app: FastifyInstance): Promise<void> {
  const strategyService = new StrategyService();

  app.get(
    "/api/strategies",
    {
      preHandler: app.requireCapability({})
    },
    async (request) => {
      const session = requireSessionContext(request).session;
      return strategyService.listStrategies({
        strategyScope: session.effectiveCapability.strategyScope
      });
    }
  );

  app.get(
    "/api/strategies/:strategyId",
    {
      preHandler: app.requireCapability({})
    },
    async (request, reply) => {
      const session = requireSessionContext(request).session;
      const strategyId = String((request.params as Record<string, unknown>).strategyId);
      const detail = await strategyService.getStrategyDetail({
        strategyId,
        strategyScope: session.effectiveCapability.strategyScope
      });

      if (!detail) {
        return reply.code(404).send(
          apiErrorSchema.parse({
            error: {
              code: "not_found",
              message: `Strategy '${strategyId}' was not found.`
            }
          })
        );
      }

      return detail;
    }
  );
}
