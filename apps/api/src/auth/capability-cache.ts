import { createRuntimeConfig, type RuntimeConfig } from "@kalshi-quant-dashboard/config";
import type { EffectiveCapability } from "@kalshi-quant-dashboard/contracts";

import { EffectiveCapabilityResolver } from "./effective-capability-resolver.js";

interface SessionCacheEntry {
  readonly session: ResolvedSession;
  readonly expiresAt: number;
}

export interface ResolvedSession {
  readonly principal: {
    readonly userId: string;
    readonly email: string;
    readonly displayName: string;
  };
  readonly effectiveCapability: EffectiveCapability;
  readonly authMode: RuntimeConfig["authMode"];
  readonly issuedAt: string;
}

export class CapabilityCache {
  private readonly entries = new Map<string, SessionCacheEntry>();
  private readonly resolver = new EffectiveCapabilityResolver();

  constructor(
    private readonly runtimeConfig: RuntimeConfig = createRuntimeConfig(),
    private readonly ttlMs = 15_000
  ) {}

  invalidate(userId?: string): void {
    if (userId) {
      this.entries.delete(userId);
      for (const [key, value] of this.entries.entries()) {
        if (value.session.principal.userId === userId) {
          this.entries.delete(key);
        }
      }
      return;
    }

    this.entries.clear();
  }

  async resolve(login: string): Promise<ResolvedSession | null> {
    const cached = this.entries.get(login);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.session;
    }

    const resolved = await this.resolver.resolveByLogin(login);
    if (!resolved) {
      return null;
    }

    const session: ResolvedSession = {
      principal: resolved.principal,
      effectiveCapability: resolved.effectiveCapability,
      authMode: this.runtimeConfig.authMode,
      issuedAt: resolved.issuedAt
    };

    const expiresAt = Date.now() + this.ttlMs;
    this.entries.set(login, { session, expiresAt });
    this.entries.set(session.principal.userId, { session, expiresAt });
    return session;
  }
}
