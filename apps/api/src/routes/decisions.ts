import type { FastifyInstance } from "fastify";

import { apiErrorSchema } from "@kalshi-quant-dashboard/contracts";

import { requireSessionContext } from "../auth/session-context.js";
import { DecisionService } from "../services/decision-service.js";

export async function registerDecisionRoutes(app: FastifyInstance): Promise<void> {
  const service = new DecisionService();

  app.get(
    "/api/decisions",
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

  app.get(
    "/api/decisions/:correlationId",
    {
      preHandler: app.requireCapability({})
    },
    async (request, reply) => {
      const session = requireSessionContext(request).session;
      const correlationId = String((request.params as Record<string, unknown>).correlationId);
      const detailLevel =
        (request.query as Record<string, unknown> | undefined)?.detailLevel === "debug"
          ? "debug"
          : "standard";

      if (
        detailLevel === "debug" &&
        session.effectiveCapability.detailLevelMax !== "debug"
      ) {
        await app.denialAuditService.record({
          actorUserId: session.principal.userId,
          action: "GET",
          targetType: "route",
          targetId: "/api/decisions/:correlationId",
          reason: "Debug detail is not allowed."
        });

        return reply.code(403).send(
          apiErrorSchema.parse({
            error: {
              code: "forbidden",
              message: "Debug detail is not allowed."
            }
          })
        );
      }

      const detail = await service.getDetail({
        correlationId,
        effectiveCapability: session.effectiveCapability,
        detailLevel
      });

      if (!detail) {
        return reply.code(404).send(
          apiErrorSchema.parse({
            error: {
              code: "not_found",
              message: `Decision '${correlationId}' was not found.`
            }
          })
        );
      }

      return detail;
    }
  );
}
