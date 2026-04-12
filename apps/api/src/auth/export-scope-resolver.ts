import { intersectScopes, normalizeScope, scopeAllows } from "@kalshi-quant-dashboard/auth";
import type { AllowedExportResource, EffectiveCapability } from "@kalshi-quant-dashboard/contracts";

function columnProfileRank(profile: AllowedExportResource["columnProfile"]): number {
  if (profile === "summary") {
    return 1;
  }

  if (profile === "detailed") {
    return 2;
  }

  return 3;
}

export interface ResolvedExportScope {
  readonly resource: AllowedExportResource["resource"];
  readonly columnProfile: AllowedExportResource["columnProfile"];
  readonly strategyScope: readonly string[];
}

export class ExportScopeResolver {
  resolve(args: {
    readonly effectiveCapability: EffectiveCapability;
    readonly resource: AllowedExportResource["resource"];
    readonly requestedColumnProfile: AllowedExportResource["columnProfile"];
    readonly requestedStrategies?: readonly string[];
  }): ResolvedExportScope | null {
    const matching = args.effectiveCapability.allowedExportResources.filter(
      (entry) =>
        entry.resource === args.resource &&
        columnProfileRank(entry.columnProfile) >= columnProfileRank(args.requestedColumnProfile)
    );

    if (matching.length === 0) {
      return null;
    }

    const grantedScope = normalizeScope(matching.flatMap((entry) => entry.strategyScope));
    const requestedStrategies = args.requestedStrategies?.filter(Boolean) ?? [];
    if (
      requestedStrategies.some((strategyId) => !scopeAllows(grantedScope, strategyId))
    ) {
      return null;
    }

    return {
      resource: args.resource,
      columnProfile: args.requestedColumnProfile,
      strategyScope:
        requestedStrategies.length > 0
          ? intersectScopes(grantedScope, requestedStrategies)
          : grantedScope
    };
  }
}
