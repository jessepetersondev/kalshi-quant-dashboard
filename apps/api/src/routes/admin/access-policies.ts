import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { apiErrorSchema } from "@kalshi-quant-dashboard/contracts";

import { requireSessionContext } from "../../auth/session-context.js";
import { AccessPolicyService } from "../../services/access-policy-service.js";

function isValidationError(error: unknown): error is ZodError {
  return (
    error instanceof ZodError ||
    (typeof error === "object" &&
      error !== null &&
      "issues" in error &&
      Array.isArray((error as { issues?: unknown }).issues))
  );
}

export async function registerAdminAccessPolicyRoutes(app: FastifyInstance): Promise<void> {
  const service = new AccessPolicyService(undefined, undefined, app.capabilityCache);

  app.get(
    "/api/admin/access-policies",
    {
      preHandler: app.requireCapability({ adminSurface: "access_policies" })
    },
    async (request) => service.list(request.query)
  );

  app.get(
    "/api/admin/access-policies/:accessPolicyId",
    {
      preHandler: app.requireCapability({ adminSurface: "access_policies" })
    },
    async (request, reply) => {
      const detail = await service.get(
        String((request.params as Record<string, unknown>).accessPolicyId)
      );

      if (!detail) {
        return reply.code(404).send(
          apiErrorSchema.parse({
            error: {
              code: "not_found",
              message: "Access policy was not found."
            }
          })
        );
      }

      return detail;
    }
  );

  app.post(
    "/api/admin/access-policies",
    {
      preHandler: app.requireCapability({ adminSurface: "access_policies" })
    },
    async (request, reply) => {
      const actorUserId = requireSessionContext(request).session.principal.userId;

      try {
        const response = await service.create(actorUserId, request.body);
        return reply.code(201).send(response);
      } catch (error) {
        if (isValidationError(error)) {
          return reply.code(422).send(
            apiErrorSchema.parse({
              error: {
                code: "validation_failed",
                message: "Access policy validation failed.",
                details: {
                  issues: error.issues
                }
              }
            })
          );
        }

        if ((error as Error).message === "ACCESS_POLICY_VERSION_CONFLICT") {
          return reply.code(409).send(
            apiErrorSchema.parse({
              error: {
                code: "conflict",
                message: "Access policy version conflict."
              }
            })
          );
        }

        throw error;
      }
    }
  );

  app.patch(
    "/api/admin/access-policies/:accessPolicyId",
    {
      preHandler: app.requireCapability({ adminSurface: "access_policies" })
    },
    async (request, reply) => {
      const actorUserId = requireSessionContext(request).session.principal.userId;
      const accessPolicyId = String((request.params as Record<string, unknown>).accessPolicyId);

      try {
        return await service.update(actorUserId, accessPolicyId, request.body);
      } catch (error) {
        if (isValidationError(error)) {
          return reply.code(422).send(
            apiErrorSchema.parse({
              error: {
                code: "validation_failed",
                message: "Access policy validation failed.",
                details: {
                  issues: error.issues
                }
              }
            })
          );
        }

        if ((error as Error).message === "ACCESS_POLICY_NOT_FOUND") {
          return reply.code(404).send(
            apiErrorSchema.parse({
              error: {
                code: "not_found",
                message: "Access policy was not found."
              }
            })
          );
        }

        if ((error as Error).message === "ACCESS_POLICY_VERSION_CONFLICT") {
          return reply.code(409).send(
            apiErrorSchema.parse({
              error: {
                code: "conflict",
                message: "Access policy version conflict."
              }
            })
          );
        }

        throw error;
      }
    }
  );
}
