import type { FastifyInstance } from "fastify";

import { apiErrorSchema, sessionResponseSchema } from "@kalshi-quant-dashboard/contracts";

import { createRuntimeConfig } from "@kalshi-quant-dashboard/config";

import { SessionService } from "../services/session-service.js";

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  const sessionService = new SessionService(app.capabilityCache);
  const runtimeConfig = createRuntimeConfig();

  app.get("/api/auth/session", async (request, reply) => {
    const login =
      typeof request.headers["x-dashboard-user"] === "string" &&
      request.headers["x-dashboard-user"].length > 0
        ? request.headers["x-dashboard-user"]
        : request.cookies?.[runtimeConfig.env.SESSION_COOKIE_NAME];

    if (!login) {
      return reply.code(401).send(
        apiErrorSchema.parse({
          error: {
            code: "unauthorized",
            message: "Authentication required."
          }
        })
      );
    }

    const session = await sessionService.getSession(login);
    if (!session) {
      return reply.code(401).send(
        apiErrorSchema.parse({
          error: {
            code: "unauthorized",
            message: "Authentication required."
          }
        })
      );
    }

    return sessionResponseSchema.parse(session);
  });
}
