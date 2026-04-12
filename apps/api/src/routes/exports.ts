import type { FastifyInstance } from "fastify";

import {
  apiErrorSchema,
  csvExportResourceSchema
} from "@kalshi-quant-dashboard/contracts";

import { requireSessionContext } from "../auth/session-context.js";
import { ExportAuthorizationService } from "../services/export-authorization-service.js";
import { ExportService } from "../services/export-service.js";

export async function registerExportRoutes(app: FastifyInstance): Promise<void> {
  const service = new ExportService();
  const authorizationService = new ExportAuthorizationService();

  app.get(
    "/api/exports/:resource.csv",
    {
      preHandler: app.requireCapability({})
    },
    async (request, reply) => {
      const session = requireSessionContext(request).session;
      const rawResource = String((request.params as Record<string, unknown>).resource);
      const parsedResource = csvExportResourceSchema.safeParse(rawResource);
      if (!parsedResource.success) {
        return reply.code(404).send(
          apiErrorSchema.parse({
            error: {
              code: "not_found",
              message: `Export resource '${rawResource}' is not a supported CSV export resource.`
            }
          })
        );
      }
      const resource = parsedResource.data;

      const queryRecord =
        typeof request.query === "object" && request.query !== null
          ? (request.query as Record<string, unknown>)
          : {};
      const requestedStrategies = parseRequestedStrategies(queryRecord);
      const authorization = authorizationService.authorize({
        effectiveCapability: session.effectiveCapability,
        resource,
        ...(requestedStrategies ? { requestedStrategies } : {})
      });
      if (!authorization) {
        await app.denialAuditService.record({
          actorUserId: session.principal.userId,
          action: "GET",
          targetType: "export",
          targetId: resource,
          reason: "Export scope denies this resource."
        });

        return reply.code(403).send(
          apiErrorSchema.parse({
            error: {
              code: "forbidden",
              message: "Export scope denies this resource."
            }
          })
        );
      }

      const body = await service.exportCsv({
        actorUserId: session.principal.userId,
        effectiveCapability: session.effectiveCapability,
        resource,
        query: request.query,
        strategyScopeOverride: authorization.strategyScope
      });

      reply.header("content-disposition", `attachment; filename="${resource}.csv"`);
      reply.type("text/csv; charset=utf-8");
      return body;
    }
  );
}

function parseRequestedStrategies(
  queryRecord: Record<string, unknown>
): string[] | undefined {
  const values = new Set<string>();

  for (const key of ["strategy", "compare"]) {
    const rawValue = queryRecord[key];
    const parts =
      typeof rawValue === "string"
        ? rawValue.split(",")
        : Array.isArray(rawValue)
          ? rawValue.flatMap((entry) => (typeof entry === "string" ? entry.split(",") : []))
          : [];

    for (const part of parts) {
      const normalized = part.trim();
      if (normalized) {
        values.add(normalized);
      }
    }
  }

  return values.size > 0 ? [...values] : undefined;
}
