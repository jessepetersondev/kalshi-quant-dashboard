import type { FastifyInstance, FastifyRequest } from "fastify";

import { DEV_SESSION_HEADER } from "@kalshi-quant-dashboard/auth";
import { createRuntimeConfig } from "@kalshi-quant-dashboard/config";

import { CapabilityCache } from "../auth/capability-cache.js";

declare module "fastify" {
  interface FastifyInstance {
    capabilityCache: CapabilityCache;
  }
}

function readLoginIdentifier(request: FastifyRequest): string | null {
  const runtimeConfig = createRuntimeConfig();
  const headerValue = request.headers[DEV_SESSION_HEADER];

  if (typeof headerValue === "string" && headerValue.length > 0) {
    return headerValue;
  }

  const cookieValue = request.cookies?.[runtimeConfig.env.SESSION_COOKIE_NAME];
  return typeof cookieValue === "string" && cookieValue.length > 0 ? cookieValue : null;
}

export async function registerAuthPlugin(app: FastifyInstance): Promise<void> {
  const capabilityCache = new CapabilityCache(createRuntimeConfig());
  app.decorate("capabilityCache", capabilityCache);
  app.decorateRequest("sessionContext", null);

  app.addHook("onRequest", async (request) => {
    const login = readLoginIdentifier(request);

    if (!login) {
      request.sessionContext = null;
      return;
    }

    const session = await capabilityCache.resolve(login);
    request.sessionContext = session ? { session } : null;
  });
}
