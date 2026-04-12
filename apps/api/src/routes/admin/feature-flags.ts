import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { apiErrorSchema } from "@kalshi-quant-dashboard/contracts";

import { requireSessionContext } from "../../auth/session-context.js";
import { FeatureFlagService } from "../../services/feature-flag-service.js";

function isValidationError(error: unknown): error is ZodError {
  return (
    error instanceof ZodError ||
    (typeof error === "object" &&
      error !== null &&
      "issues" in error &&
      Array.isArray((error as { issues?: unknown }).issues))
  );
}

export async function registerAdminFeatureFlagRoutes(app: FastifyInstance): Promise<void> {
  const service = new FeatureFlagService();

  app.get(
    "/api/admin/feature-flags",
    {
      preHandler: app.requireCapability({ adminSurface: "feature_flags" })
    },
    async () => service.list()
  );

  app.patch(
    "/api/admin/feature-flags/:featureFlagKey",
    {
      preHandler: app.requireCapability({ adminSurface: "feature_flags" })
    },
    async (request, reply) => {
      const actorUserId = requireSessionContext(request).session.principal.userId;
      const featureFlagKey = String((request.params as Record<string, unknown>).featureFlagKey);

      try {
        return await service.update(actorUserId, featureFlagKey, request.body);
      } catch (error) {
        if (isValidationError(error)) {
          return reply.code(422).send(
            apiErrorSchema.parse({
              error: {
                code: "validation_failed",
                message: "Feature flag validation failed.",
                details: {
                  issues: error.issues
                }
              }
            })
          );
        }

        if ((error as Error).message === "FEATURE_FLAG_NOT_FOUND") {
          return reply.code(404).send(
            apiErrorSchema.parse({
              error: {
                code: "not_found",
                message: "Feature flag was not found."
              }
            })
          );
        }

        if ((error as Error).message === "FEATURE_FLAG_VERSION_CONFLICT") {
          return reply.code(409).send(
            apiErrorSchema.parse({
              error: {
                code: "conflict",
                message: "Feature flag version conflict."
              }
            })
          );
        }

        throw error;
      }
    }
  );
}
