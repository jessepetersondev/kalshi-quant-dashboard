import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { apiErrorSchema } from "@kalshi-quant-dashboard/contracts";

import { requireSessionContext } from "../../auth/session-context.js";
import { AdminAlertRuleService } from "../../services/admin-alert-rule-service.js";

function isValidationError(error: unknown): error is ZodError {
  return (
    error instanceof ZodError ||
    (typeof error === "object" &&
      error !== null &&
      "issues" in error &&
      Array.isArray((error as { issues?: unknown }).issues))
  );
}

export async function registerAdminAlertRuleRoutes(app: FastifyInstance): Promise<void> {
  const service = new AdminAlertRuleService();

  app.get(
    "/api/admin/alert-rules",
    {
      preHandler: app.requireCapability({ adminSurface: "alert_rules" })
    },
    async () => service.list()
  );

  app.patch(
    "/api/admin/alert-rules/:alertRuleId",
    {
      preHandler: app.requireCapability({ adminSurface: "alert_rules" })
    },
    async (request, reply) => {
      const actorUserId = requireSessionContext(request).session.principal.userId;
      const alertRuleId = String((request.params as Record<string, unknown>).alertRuleId);

      try {
        return await service.update(actorUserId, alertRuleId, request.body);
      } catch (error) {
        if (isValidationError(error)) {
          return reply.code(422).send(
            apiErrorSchema.parse({
              error: {
                code: "validation_failed",
                message: "Alert rule validation failed.",
                details: {
                  issues: error.issues
                }
              }
            })
          );
        }

        if ((error as Error).message === "ALERT_RULE_NOT_FOUND") {
          return reply.code(404).send(
            apiErrorSchema.parse({
              error: {
                code: "not_found",
                message: "Alert rule was not found."
              }
            })
          );
        }

        if ((error as Error).message === "ALERT_RULE_VERSION_CONFLICT") {
          return reply.code(409).send(
            apiErrorSchema.parse({
              error: {
                code: "conflict",
                message: "Alert rule version conflict."
              }
            })
          );
        }

        throw error;
      }
    }
  );
}
