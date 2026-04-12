import { sessionResponseSchema, type SessionResponse } from "@kalshi-quant-dashboard/contracts";

import { CapabilityCache } from "../auth/capability-cache.js";

export class SessionService {
  constructor(private readonly capabilityCache: CapabilityCache) {}

  async getSession(login: string): Promise<SessionResponse | null> {
    const session = await this.capabilityCache.resolve(login);
    if (!session) {
      return null;
    }

    return sessionResponseSchema.parse({
      session: {
        principal: session.principal,
        issuedAt: session.issuedAt,
        authMode: session.authMode
      },
      effectiveCapability: session.effectiveCapability
    });
  }
}
