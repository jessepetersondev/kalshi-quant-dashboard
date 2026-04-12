import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerHookHandler
} from "fastify";

import { scopeAllows } from "@kalshi-quant-dashboard/auth";
import { apiErrorSchema } from "@kalshi-quant-dashboard/contracts";

import { requireSessionContext } from "../auth/session-context.js";

declare module "fastify" {
  interface FastifyInstance {
    requireCapability(
      requirements: CapabilityRequirements
    ): preHandlerHookHandler;
  }
}

export interface CapabilityRequirements {
  readonly detailLevel?: "standard" | "debug";
  readonly adminSurface?:
    | "alert_rules"
    | "feature_flags"
    | "access_policies"
    | "audit_logs";
  readonly exportResource?:
    | "decisions"
    | "trades"
    | "skips"
    | "alerts"
    | "pnl"
    | "operations"
    | "audit_logs";
  readonly requiresRawPayload?: boolean;
  readonly requiresPrivilegedAudit?: boolean;
  readonly strategyIds?: readonly string[];
}

function extractStrategies(request: FastifyRequest): string[] {
  const values = [
    request.params && typeof request.params === "object"
      ? (request.params as Record<string, unknown>).strategyId
      : undefined,
    request.query && typeof request.query === "object"
      ? (request.query as Record<string, unknown>).strategy
      : undefined,
    request.query && typeof request.query === "object"
      ? (request.query as Record<string, unknown>).compare
      : undefined
  ];

  return values.flatMap((value) => {
    if (typeof value === "string") {
      return value.split(",").map((entry) => entry.trim()).filter(Boolean);
    }

    if (Array.isArray(value)) {
      return value
        .flatMap((entry) =>
          typeof entry === "string"
            ? entry.split(",").map((part) => part.trim())
            : []
        )
        .filter(Boolean);
    }

    return [];
  });
}

async function reject(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  code: "unauthorized" | "forbidden",
  message: string
): Promise<void> {
  const statusCode = code === "unauthorized" ? 401 : 403;

  if (request.sessionContext) {
      await app.denialAuditService.record({
        actorUserId: request.sessionContext.session.principal.userId,
        action: request.method,
        targetType: "route",
        targetId: request.routeOptions.url ?? request.url,
        reason: message,
        details: {
          route: request.url,
        statusCode
      }
    });
  }

  reply.code(statusCode).send(
    apiErrorSchema.parse({
      error: {
        code,
        message
      }
    })
  );
}

export async function registerRouteCapabilitiesPlugin(app: FastifyInstance): Promise<void> {
  app.decorate("requireCapability", (requirements: CapabilityRequirements) => {
    const guard: preHandlerHookHandler = async (request, reply) => {
      if (!request.sessionContext) {
        await reject(app, request, reply, "unauthorized", "Authentication required.");
        return;
      }

      const { effectiveCapability } = requireSessionContext(request).session;

      if (
        requirements.detailLevel === "debug" &&
        effectiveCapability.detailLevelMax !== "debug"
      ) {
        await reject(app, request, reply, "forbidden", "Debug detail is not allowed.");
        return;
      }

      if (requirements.requiresRawPayload && !effectiveCapability.canViewRawPayloads) {
        await reject(app, request, reply, "forbidden", "Raw payload access is not allowed.");
        return;
      }

      if (
        requirements.requiresPrivilegedAudit &&
        !effectiveCapability.canViewPrivilegedAuditLogs
      ) {
        await reject(
          app,
          request,
          reply,
          "forbidden",
          "Privileged audit visibility is not allowed."
        );
        return;
      }

      if (requirements.exportResource) {
        const allowed = effectiveCapability.allowedExportResources.some(
          (resource) => resource.resource === requirements.exportResource
        );
        if (!allowed) {
          await reject(app, request, reply, "forbidden", "Export scope denies this resource.");
          return;
        }
      }

      if (requirements.adminSurface) {
        const allowed =
          (requirements.adminSurface === "alert_rules" &&
            effectiveCapability.canManageAlertRules) ||
          (requirements.adminSurface === "feature_flags" &&
            effectiveCapability.canManageFeatureFlags) ||
          (requirements.adminSurface === "access_policies" &&
            effectiveCapability.canManageAccessPolicies) ||
          (requirements.adminSurface === "audit_logs" &&
            effectiveCapability.canViewPrivilegedAuditLogs);

        if (!allowed) {
          await reject(
            app,
            request,
            reply,
            "forbidden",
            `Capability denied for admin surface '${requirements.adminSurface}'.`
          );
          return;
        }
      }

      const requestedStrategies = [
        ...extractStrategies(request),
        ...(requirements.strategyIds ?? [])
      ];

      if (
        requestedStrategies.some(
          (strategyId) => !scopeAllows(effectiveCapability.strategyScope, strategyId)
        )
      ) {
        await reject(
          app,
          request,
          reply,
          "forbidden",
          "Requested strategy scope exceeds session capability."
        );
        return;
      }
    };

    return guard;
  });
}
