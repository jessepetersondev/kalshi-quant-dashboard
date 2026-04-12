import type { FastifyRequest } from "fastify";

import type { ResolvedSession } from "./capability-cache.js";

export interface RequestSessionContext {
  readonly session: ResolvedSession;
}

declare module "fastify" {
  interface FastifyRequest {
    sessionContext: RequestSessionContext | null;
  }
}

export function requireSessionContext(
  request: FastifyRequest
): RequestSessionContext {
  if (!request.sessionContext) {
    throw new Error("Session context is not available.");
  }

  return request.sessionContext;
}
