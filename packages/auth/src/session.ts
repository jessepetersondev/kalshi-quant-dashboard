import type { EffectiveCapability } from "./capabilities.js";

export interface SessionPrincipal {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
}

export interface AuthenticatedSession {
  readonly principal: SessionPrincipal;
  readonly effectiveCapability: EffectiveCapability;
}

export const DEV_SESSION_HEADER = "x-dashboard-user";
